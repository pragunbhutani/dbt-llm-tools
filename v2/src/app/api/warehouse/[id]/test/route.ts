import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { testWarehouseConnection } from "@/lib/warehouse/client";
import type { WarehouseType } from "@/lib/warehouse/client";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: conn, error: fetchError } = await supabase
    .from("warehouse_connections")
    .select("type, credentials")
    .eq("id", id)
    .single();

  if (fetchError || !conn) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  try {
    await testWarehouseConnection(
      conn.type as WarehouseType,
      conn.credentials as Record<string, unknown>
    );

    await supabase
      .from("warehouse_connections")
      .update({ status: "connected", last_tested_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    await supabase
      .from("warehouse_connections")
      .update({ status: "error", last_tested_at: new Date().toISOString() })
      .eq("id", id);

    const message = err instanceof Error ? err.message : "Connection failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
