import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { canUseDevAuth } from "@/lib/auth/dev-policy";
import { NextResponse } from "next/server";

export const maxDuration = 15;
const DEV_EMAIL = "ragstar-admin@localhost.dev";
const DEV_ORG_ID = "00000000-0000-4000-8000-000000000001";

export async function GET(request: Request) {
  return NextResponse.json({ enabled: canUseDevAuth(process.env, request) }, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  if (!canUseDevAuth(process.env, request)) {
    return NextResponse.json({ error: "Local sign-in requires DEV_AUTH_BYPASS=true, next dev, and a loopback Supabase URL." }, { status: 403 });
  }

  try {
    // Bound the backend probe; a stopped local stack should fail promptly.
    const health = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
      signal: AbortSignal.timeout(3000), cache: "no-store",
    });
    if (!health.ok) throw new Error("Local Supabase is unavailable.");

    const admin = createAdminClient();
    // Generates a local session without sending email or exposing credentials.
    const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: DEV_EMAIL });
    if (error || !data.user || !data.properties?.hashed_token) throw new Error("Could not prepare local sign-in.");

    const { error: orgError } = await admin.from("organisations").upsert({
      id: DEV_ORG_ID, name: "Local workspace", slug: "ragstar-local", owner_id: data.user.id,
    }, { onConflict: "id", ignoreDuplicates: true });
    if (orgError) throw new Error("Apply the local database migrations before signing in.");
    const { data: org } = await admin.from("organisations").select("owner_id").eq("id", DEV_ORG_ID).single();
    if (org?.owner_id !== data.user.id) throw new Error("The local workspace belongs to another user.");
    const { error: memberError } = await admin.from("organisation_members").upsert({
      organisation_id: DEV_ORG_ID, user_id: data.user.id, role: "owner",
    }, { onConflict: "organisation_id,user_id" });
    if (memberError) throw new Error("Could not prepare the local workspace.");

    const supabase = await createClient();
    const { error: sessionError } = await supabase.auth.verifyOtp({
      token_hash: data.properties.hashed_token, type: "email",
    });
    if (sessionError) throw new Error("Could not create the local session.");
    return NextResponse.json({ ok: true, redirectTo: "/dashboard" }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error && !["TypeError", "TimeoutError"].includes(error.name)
      ? error.message : "Start local Supabase with `supabase start`, then try again.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
