import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MetabaseClient } from "@/lib/metabase/client";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: conn, error: fetchError } = await supabase
    .from("metabase_connections")
    .select("url, api_key")
    .eq("id", id)
    .single();

  if (fetchError || !conn) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  try {
    const client = new MetabaseClient(conn.url, conn.api_key);
    const result = await client.testConnection();

    await supabase
      .from("metabase_connections")
      .update({ status: "connected", last_tested_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json({ ok: true, databases: result.databases });
  } catch (err) {
    await supabase
      .from("metabase_connections")
      .update({ status: "error", last_tested_at: new Date().toISOString() })
      .eq("id", id);

    const message = err instanceof Error ? err.message : "Connection failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
