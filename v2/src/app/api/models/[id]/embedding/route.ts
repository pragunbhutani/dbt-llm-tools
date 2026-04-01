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

// POST: embed model and add to knowledge base
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(supabase, user.id);
  if (!orgId) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const { id } = await params;

  await start(embedModelsWorkflow, [orgId, { modelIds: [id] }]);

  return NextResponse.json({ started: true }, { status: 202 });
}

// DELETE: disable model from knowledge base (synchronous, just a flag)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(supabase, user.id);
  if (!orgId) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const { id } = await params;

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase
    .from("model_embeddings")
    .update({ can_be_used_for_answers: false })
    .eq("model_id", id)
    .eq("organisation_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
