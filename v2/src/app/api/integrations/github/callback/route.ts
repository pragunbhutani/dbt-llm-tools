import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/sign-in", request.url));

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?github=error", request.url)
    );
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?github=error", request.url)
    );
  }

  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/integrations/github/callback`;

  // Exchange code for access token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  const tokenData = await tokenRes.json() as {
    access_token?: string;
    token_type?: string;
    scope?: string;
    error?: string;
  };

  if (!tokenData.access_token) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?github=error", request.url)
    );
  }

  // Find the user's org
  const { data: membership } = await supabase
    .from("organisation_members")
    .select("organisation_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!membership) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?github=error", request.url)
    );
  }

  // Store the GitHub access token
  await supabase
    .from("organisation_settings")
    .upsert(
      {
        organisation_id: membership.organisation_id,
        github_access_token: tokenData.access_token,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organisation_id" }
    );

  return NextResponse.redirect(
    new URL("/dashboard/settings?github=connected", request.url)
  );
}
