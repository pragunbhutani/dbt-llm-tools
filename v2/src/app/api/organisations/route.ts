import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, slug } = await request.json() as { name: string; slug: string };
  if (!name || !slug) {
    return NextResponse.json({ error: "name and slug are required" }, { status: 400 });
  }

  // Use admin client to bypass RLS for the initial org + membership creation
  const admin = createAdminClient();

  const { data: org, error: orgError } = await admin
    .from("organisations")
    .insert({ name, slug, owner_id: user.id })
    .select()
    .single();

  if (orgError) {
    const message = orgError.code === "23505"
      ? "An organisation with this slug already exists."
      : orgError.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { error: memberError } = await admin
    .from("organisation_members")
    .insert({ organisation_id: org.id, user_id: user.id, role: "owner" });

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  return NextResponse.json(org, { status: 201 });
}
