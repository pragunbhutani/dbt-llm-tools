import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    .from("metabase_connections")
    .select("id, name, url, database_id, collection_path, status, last_tested_at, created_at, updated_at")
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
    url: string;
    api_key: string;
    database_id?: number;
    collection_path?: string;
  };

  if (!body.name || !body.url || !body.api_key) {
    return NextResponse.json({ error: "name, url, and api_key required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("metabase_connections")
    .insert({
      organisation_id: membership.organisation_id,
      name: body.name,
      url: body.url,
      api_key: body.api_key,
      database_id: body.database_id ?? null,
      collection_path: body.collection_path ?? null,
      status: "untested",
    })
    .select("id, name, url, database_id, collection_path, status, last_tested_at, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
