import { NextRequest, NextResponse, after } from "next/server";
import { verifySlackSignature } from "@/lib/slack/verify";
import { runSlackWorkflow } from "@/lib/slack/workflow";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 10;

type SlackEvent =
  | { type: "url_verification"; challenge: string }
  | {
      type: "event_callback";
      team_id: string;
      event: {
        type: "app_mention" | "message";
        user: string;
        text: string;
        channel: string;
        ts: string;
        thread_ts?: string;
        bot_id?: string;
        channel_type?: string;
      };
    };

export async function POST(request: NextRequest) {
  const body = await request.text();
  const payload = JSON.parse(body) as SlackEvent;

  // Slack URL verification handshake — no auth needed, no sensitive data
  if (payload.type === "url_verification") {
    return NextResponse.json({ challenge: payload.challenge });
  }

  if (payload.type !== "event_callback") {
    return NextResponse.json({ ok: true });
  }

  const { event, team_id } = payload;

  // Look up org by Slack team ID (also fetches signing secret for verification)
  const supabase = createAdminClient();
  const { data: settings } = await supabase
    .from("organisation_settings")
    .select("organisation_id, slack_bot_token, slack_bot_user_id, slack_signing_secret, llm_chat_provider, llm_chat_model, llm_openai_api_key_path, llm_anthropic_api_key_path, llm_google_api_key_path")
    .eq("slack_team_id", team_id)
    .single();

  if (!settings?.slack_bot_token || !settings?.slack_signing_secret) {
    return NextResponse.json({ ok: true });
  }

  // Verify signature using the org's signing secret
  const isValid = await verifySlackSignature(request, body, settings.slack_signing_secret);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Ignore bot messages
  if (event.bot_id) return NextResponse.json({ ok: true });

  // Only handle app_mention and direct messages
  const isDirectMessage = event.type === "message" && event.channel_type === "im";
  const isMention = event.type === "app_mention";
  if (!isDirectMessage && !isMention) return NextResponse.json({ ok: true });

  // Strip bot mention from question
  const botUserId = settings.slack_bot_user_id ?? "";
  const question = event.text
    .replace(new RegExp(`<@${botUserId}>`, "g"), "")
    .trim();

  if (!question) return NextResponse.json({ ok: true });

  const threadTs = event.thread_ts ?? event.ts;

  // Respond to Slack immediately (< 3s), run workflow in background
  after(
    runSlackWorkflow({
      orgId: settings.organisation_id,
      question,
      channelId: event.channel,
      threadTs,
      botToken: settings.slack_bot_token,
      llmProvider: settings.llm_chat_provider ?? null,
      llmModel: settings.llm_chat_model ?? null,
      openaiApiKey: settings.llm_openai_api_key_path,
      anthropicApiKey: settings.llm_anthropic_api_key_path,
      googleApiKey: settings.llm_google_api_key_path,
    })
  );

  return NextResponse.json({ ok: true });
}
