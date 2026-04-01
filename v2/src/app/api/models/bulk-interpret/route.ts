import { createClient } from "@/lib/supabase/server";
import { bulkInterpretWorkflow } from "@/workflows/interpret";
import { start } from "workflow/api";
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

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(supabase, user.id);
  if (!orgId) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const body = await request.json() as { model_ids?: string[]; project_id?: string };

  let target: { modelIds: string[] } | { projectId: string };

  if (body.model_ids?.length) {
    target = { modelIds: body.model_ids };
  } else if (body.project_id) {
    target = { projectId: body.project_id };
  } else {
    return NextResponse.json({ error: "Provide model_ids or project_id" }, { status: 400 });
  }

  await start(bulkInterpretWorkflow, [orgId, target]);

  return NextResponse.json({ started: true }, { status: 202 });
}
