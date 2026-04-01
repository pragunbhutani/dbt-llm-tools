import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export async function GET() {
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

  const { data, error } = await supabase
    .from("warehouse_connections")
    .select("id, name, type, status, last_tested_at, created_at, updated_at")
    .eq("organisation_id", membership.organisation_id)
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
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

  const body = await request.json() as {
    name: string;
    type: "snowflake" | "postgres" | "redshift";
    credentials: Record<string, unknown>;
  };

  if (!body.name || !body.type || !body.credentials) {
    return NextResponse.json({ error: "name, type, and credentials required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("warehouse_connections")
    .insert({
      organisation_id: membership.organisation_id,
      name: body.name,
      type: body.type,
      credentials: body.credentials as Json,
      status: "untested",
    })
    .select("id, name, type, status, last_tested_at, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
