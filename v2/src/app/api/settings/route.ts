import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

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
    .from("organisation_settings")
    .select("*")
    .eq("organisation_id", orgId)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? null);
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(supabase, user.id);
  if (!orgId) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const body = await request.json();
  const allowed = [
    "llm_chat_provider",
    "llm_chat_model",
    "llm_embeddings_provider",
    "llm_embeddings_model",
    "llm_openai_api_key_path",
    "llm_anthropic_api_key_path",
    "llm_google_api_key_path",
  ];
  const updates = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k))
  );

  // Upsert settings
  const { data, error } = await supabase
    .from("organisation_settings")
    .upsert(
      { organisation_id: orgId, ...updates, updated_at: new Date().toISOString() },
      { onConflict: "organisation_id" }
    )
    .select()
    .single();

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

  if (body.action === "rotate_mcp_key") {
    const newKey = `rgs_${crypto.randomBytes(32).toString("hex")}`;
    const { data, error } = await supabase
      .from("organisation_settings")
      .upsert(
        { organisation_id: orgId, mcp_api_key: newKey, updated_at: new Date().toISOString() },
        { onConflict: "organisation_id" }
      )
      .select("mcp_api_key")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ mcp_api_key: data.mcp_api_key });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
