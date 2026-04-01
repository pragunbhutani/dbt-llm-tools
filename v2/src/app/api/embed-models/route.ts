import { createClient } from "@/lib/supabase/server";
import { embedModelsWorkflow } from "@/workflows/embed";
import { start } from "workflow/api";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

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
  const body = await request.json();
  const { project_id } = body as { project_id?: string };

  let target: { projectId: string } | { modelIds: string[] };

  if (project_id) {
    target = { projectId: project_id };
  } else {
    // Embed all models for the org
    const { data: models } = await supabase
      .from("dbt_models")
      .select("id")
      .eq("organisation_id", orgId);
    target = { modelIds: (models ?? []).map((m) => m.id) };
  }

  await start(embedModelsWorkflow, [orgId, target]);

  return NextResponse.json({ started: true }, { status: 202 });
}
