import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { embedModelsWorkflow } from "@/workflows/embed";
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

// POST body: { model_ids: string[], action: "embed" | "enable" | "disable" }
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(supabase, user.id);
  if (!orgId) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const { model_ids, action } = (await request.json()) as {
    model_ids: string[];
    action: "embed" | "enable" | "disable";
  };

  if (!model_ids?.length) return NextResponse.json({ error: "No model IDs" }, { status: 400 });

  // enable/disable are fast synchronous DB updates — no workflow needed
  if (action === "enable" || action === "disable") {
    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from("model_embeddings")
      .update({ can_be_used_for_answers: action === "enable" })
      .in("model_id", model_ids)
      .eq("organisation_id", orgId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ updated: model_ids.length });
  }

  // action === "embed": start background workflow
  await start(embedModelsWorkflow, [orgId, { modelIds: model_ids }]);

  return NextResponse.json({ started: true }, { status: 202 });
}
