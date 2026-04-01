import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseManifest } from "@/lib/dbt/parse-manifest";
import { fetchAndParseGithubProject } from "@/lib/dbt/parse-github";
import type { ParsedModel } from "@/lib/dbt/parse-manifest";
import type { Json } from "@/types/database";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

async function fetchDbtCloudManifest(
  cloudUrl: string,
  accountId: number,
  apiKey: string
): Promise<Record<string, unknown>> {
  const baseUrl = `${cloudUrl.replace(/\/$/, "")}/api/v2/accounts/${accountId}`;
  const headers = {
    Authorization: `Token ${apiKey}`,
    "Content-Type": "application/json",
  };

  // Find the latest successful run that has a manifest artifact
  const runsRes = await fetch(
    `${baseUrl}/runs/?order_by=-finished_at&status=10&limit=10`,
    { headers }
  );
  if (!runsRes.ok) throw new Error(`dbt Cloud API error ${runsRes.status}: failed to fetch runs`);

  const runsData = (await runsRes.json()) as { data?: Array<{ id: number }> };
  const runs = runsData.data ?? [];
  if (!runs.length) throw new Error("No recent successful dbt Cloud runs found");

  for (const run of runs) {
    const artifactUrl = `${baseUrl}/runs/${run.id}/artifacts/manifest.json`;
    const res = await fetch(artifactUrl, { headers });
    if (res.ok) return res.json() as Promise<Record<string, unknown>>;
  }

  throw new Error("Could not find manifest.json in the latest 10 successful runs");
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: membership } = await supabase
    .from("organisation_members")
    .select("organisation_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();
  if (!membership) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const orgId = membership.organisation_id;
  const { project_id } = (await request.json()) as { project_id: string };
  if (!project_id) return NextResponse.json({ error: "project_id is required" }, { status: 400 });

  // Fetch the project
  const { data: project, error: projectError } = await supabase
    .from("dbt_projects")
    .select("*")
    .eq("id", project_id)
    .eq("organisation_id", orgId)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Mark as syncing
  await supabase
    .from("dbt_projects")
    .update({ status: "syncing" })
    .eq("id", project_id);

  let models: ParsedModel[];

  try {
    if (project.connection_type === "dbt_cloud") {
      if (!project.dbt_cloud_url || !project.dbt_cloud_account_id || !project.dbt_cloud_api_key) {
        return NextResponse.json(
          { error: "dbt Cloud project is missing URL, account ID, or API key" },
          { status: 400 }
        );
      }
      const manifest = await fetchDbtCloudManifest(
        project.dbt_cloud_url,
        project.dbt_cloud_account_id,
        project.dbt_cloud_api_key
      );
      models = parseManifest(manifest as Parameters<typeof parseManifest>[0]);
    } else {
      // GitHub
      if (!project.github_repository_url) {
        return NextResponse.json({ error: "GitHub project is missing repository URL" }, { status: 400 });
      }

      // Get GitHub access token from org settings
      const { data: settings } = await supabase
        .from("organisation_settings")
        .select("github_access_token")
        .eq("organisation_id", orgId)
        .single();

      if (!settings?.github_access_token) {
        return NextResponse.json(
          { error: "GitHub is not connected. Please connect GitHub in Settings first." },
          { status: 400 }
        );
      }

      models = await fetchAndParseGithubProject(
        project.github_repository_url,
        project.github_branch ?? "main",
        project.github_project_folder,
        settings.github_access_token
      );
    }
  } catch (err) {
    await supabase
      .from("dbt_projects")
      .update({ status: "error" })
      .eq("id", project_id);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }

  if (!models.length) {
    await supabase
      .from("dbt_projects")
      .update({ status: "error" })
      .eq("id", project_id);
    return NextResponse.json({ error: "No models found in project" }, { status: 400 });
  }

  // Upsert models into dbt_models
  const adminSupabase = createAdminClient();
  const rows = models.map((m) => ({
    organisation_id: orgId,
    dbt_project_id: project_id,
    name: m.name,
    unique_id: m.unique_id || null,
    path: m.path,
    schema_name: m.schema_name,
    database_name: m.database_name,
    materialization: m.materialization,
    raw_sql: m.raw_sql,
    compiled_sql: m.compiled_sql,
    yml_description: m.yml_description,
    yml_columns: m.yml_columns as Json | null,
    tags: m.tags,
    depends_on: m.depends_on,
    all_upstream_models: m.all_upstream_models,
    meta: m.meta as Json | null,
  }));

  const { error: upsertError } = await adminSupabase
    .from("dbt_models")
    .upsert(rows, { onConflict: "organisation_id,dbt_project_id,name" });

  if (upsertError) {
    await supabase
      .from("dbt_projects")
      .update({ status: "error" })
      .eq("id", project_id);
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  // Mark synced
  await supabase
    .from("dbt_projects")
    .update({ status: "synced", last_synced_at: new Date().toISOString() })
    .eq("id", project_id);

  return NextResponse.json({ synced: models.length });
}
