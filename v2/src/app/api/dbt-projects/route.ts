import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

async function getOrgId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from("organisation_members")
    .select("organisation_id")
    .eq("user_id", userId)
    .limit(1)
    .single();
  return data?.organisation_id ?? null;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(supabase, user.id);
  if (!orgId) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const { data, error } = await supabase
    .from("dbt_projects")
    .select("*")
    .eq("organisation_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(supabase, user.id);
  if (!orgId) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const body = await request.json();
  const { name, connection_type, dbt_cloud_url, dbt_cloud_account_id, dbt_cloud_api_key, github_repository_url, github_branch, github_project_folder } = body;

  if (!name || !connection_type) {
    return NextResponse.json({ error: "name and connection_type are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("dbt_projects")
    .insert({
      organisation_id: orgId,
      name,
      connection_type,
      dbt_cloud_url: dbt_cloud_url ?? null,
      dbt_cloud_account_id: dbt_cloud_account_id ?? null,
      dbt_cloud_api_key: dbt_cloud_api_key ?? null,
      github_repository_url: github_repository_url ?? null,
      github_branch: github_branch ?? "main",
      github_project_folder: github_project_folder ?? null,
      status: "pending",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
