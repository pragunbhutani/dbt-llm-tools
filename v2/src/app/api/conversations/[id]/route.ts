import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;

  const { data: conversation, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .eq("organisation_id", membership.organisation_id)
    .single();

  if (error || !conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const { data: parts } = await supabase
    .from("conversation_parts")
    .select("id, sequence_number, actor, message_type, content, tool_name, created_at")
    .eq("conversation_id", id)
    .in("message_type", ["message"])
    .order("sequence_number", { ascending: true });

  return NextResponse.json({ conversation, parts: parts ?? [] });
}
