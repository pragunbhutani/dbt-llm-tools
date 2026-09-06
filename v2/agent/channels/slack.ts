import { defaultSlackAuth, slackChannel, type SlackChannelConfig } from "eve/channels/slack";
import { createAdminClient } from "../../src/lib/supabase/admin";
import { verifySlackSignature } from "../../src/lib/slack/verify";
import { parseSlackEnvelope } from "../../src/lib/agent/identity";
import { loadSlackWorkspace } from "../../src/lib/agent/workspace";
import { recordSlackQuestion, recordSlackAnswer } from "../../src/lib/agent/conversations";

const authorize: NonNullable<SlackChannelConfig["onAppMention"]> = async (ctx, message) => {
  if (!message.author || message.author.isBot) return null;
  const workspace = await loadSlackWorkspace(ctx.slack.teamId ?? undefined);
  const auth = defaultSlackAuth(message, ctx);
  if (!auth) return null;
  const conversationId = await recordSlackQuestion({
    orgId: workspace.organisation_id, teamId: ctx.slack.teamId!,
    channelId: ctx.slack.channelId, threadTs: ctx.slack.threadTs,
    messageId: message.ts, text: message.text, userId: message.author.userId,
  });
  return { auth: { ...auth, attributes: { ...auth.attributes, ragstar_conversation_id: conversationId } } };
};

export default slackChannel({
  botName: "Ragstar",
  turnPolicy: "queue",
  uploadPolicy: "disabled",
  credentials: {
    botToken: async ({ teamId }) => (await loadSlackWorkspace(teamId)).slack_bot_token!,
    async webhookVerifier(request, body) {
      const envelope = parseSlackEnvelope(body, request.headers.get("content-type") ?? "");
      let secret: string;
      if (envelope.type === "url_verification" && !envelope.teamId) {
        const orgId = new URL(request.url).searchParams.get("organisation_id");
        if (!orgId) throw new Error("Organisation is required for Slack setup.");
        const { data, error } = await createAdminClient().from("organisation_settings")
          .select("slack_signing_secret").eq("organisation_id", orgId).single();
        if (error || !data?.slack_signing_secret) throw new Error("Save Slack credentials before verifying the URL.");
        secret = data.slack_signing_secret;
      } else {
        secret = (await loadSlackWorkspace(envelope.teamId)).slack_signing_secret!;
      }
      if (!await verifySlackSignature(request, body, secret)) throw new Error("Invalid Slack signature.");
    },
  },
  onAppMention: authorize,
  onDirectMessage: authorize,
  async onMessage(ctx, message) {
    // Explicit mentions are delivered through onAppMention. Slack can emit
    // both app_mention and message.channels for the same message.
    if (ctx.isBotMentioned() || !await ctx.isSubscribed()) return null;
    return authorize(ctx, message);
  },
  onInputResponse: () => null,
  events: {
    "reasoning.appended": async () => {},
    async "message.completed"(event, channel, ctx) {
      if (event.finishReason === "tool-calls" || !event.message) return;
      const workspace = await loadSlackWorkspace(channel.slack.teamId ?? undefined);
      const id = ctx.session.auth.current?.attributes.ragstar_conversation_id;
      if (typeof id !== "string") throw new Error("Conversation context is missing.");
      await recordSlackAnswer(id, workspace.organisation_id, event.message, ctx.session.id);
      await channel.thread.post(event.message);
    },
    async "turn.failed"(_event, channel, ctx) {
      const workspace = await loadSlackWorkspace(channel.slack.teamId ?? undefined);
      const id = ctx.session.auth.current?.attributes.ragstar_conversation_id;
      if (typeof id === "string") {
        await createAdminClient().from("conversations").update({ status: "error" })
          .eq("id", id).eq("organisation_id", workspace.organisation_id);
      }
      await channel.thread.post("I couldn’t complete that request. Please try again or check the connection and model settings in Ragstar.");
    },
  },
});
