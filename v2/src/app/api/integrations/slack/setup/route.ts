import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bot_token, signing_secret } = await request.json();

  if (!bot_token || !signing_secret) {
    return NextResponse.json(
      { error: "bot_token and signing_secret are required" },
      { status: 400 }
    );
  }

  // Validate the bot token by calling Slack auth.test
  const authTest = await fetch("https://slack.com/api/auth.test", {
    headers: { Authorization: `Bearer ${bot_token}` },
  });
  const authData = await authTest.json() as {
    ok: boolean;
    team_id?: string;
    bot_id?: string;
    user_id?: string;
    error?: string;
  };

  if (!authData.ok || !authData.team_id) {
    return NextResponse.json(
      { error: "Invalid bot token: " + (authData.error ?? "unknown error") },
      { status: 400 }
    );
  }

  const { data: membership } = await supabase
    .from("organisation_members")
    .select("organisation_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Organisation not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("organisation_settings")
    .upsert(
      {
        organisation_id: membership.organisation_id,
        slack_team_id: authData.team_id,
        slack_bot_token: bot_token,
        slack_bot_user_id: authData.user_id ?? null,
        slack_signing_secret: signing_secret,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organisation_id" }
    );

  if (error) {
    return NextResponse.json({ error: "Failed to save credentials" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, team_id: authData.team_id });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: membership } = await supabase
    .from("organisation_members")
    .select("organisation_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Organisation not found" }, { status: 404 });
  }

  await supabase
    .from("organisation_settings")
    .update({
      slack_team_id: null,
      slack_bot_token: null,
      slack_bot_user_id: null,
      slack_signing_secret: null,
      updated_at: new Date().toISOString(),
    })
    .eq("organisation_id", membership.organisation_id);

  return NextResponse.json({ ok: true });
}
