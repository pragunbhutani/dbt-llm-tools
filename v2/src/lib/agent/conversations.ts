import { createHash } from "node:crypto";
import { createAdminClient } from "../supabase/admin";

function stableId(value: string) {
  const hex = createHash("sha256").update(value).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export async function recordSlackQuestion(input: {
  orgId: string; teamId: string; channelId: string; threadTs: string;
  messageId: string; text: string; userId: string;
}) {
  const db = createAdminClient();
  const id = stableId(`${input.orgId}:${input.teamId}:${input.channelId}:${input.messageId}`);
  const { error } = await db.from("conversations").upsert({
    id, organisation_id: input.orgId, channel: "slack", trigger: "slack_mention",
    user_external_id: input.userId, initial_question: input.text.slice(0, 500), status: "active", channel_id: input.channelId,
    conversation_context: { thread_ts: input.threadTs, runtime: "eve" },
  }, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw new Error("Could not record the Slack conversation.");
  const { error: partError } = await db.from("conversation_parts").upsert({
    id: stableId(`${id}:user`), conversation_id: id, sequence_number: 0,
    actor: "user", message_type: "message", content: input.text,
  }, { onConflict: "id", ignoreDuplicates: true });
  if (partError) throw new Error("Could not record the Slack question.");
  return id;
}

export async function recordSlackAnswer(id: string, orgId: string, text: string, sessionId: string) {
  const db = createAdminClient();
  const { data, error } = await db.from("conversations").select("id")
    .eq("id", id).eq("organisation_id", orgId).single();
  if (error || !data) throw new Error("Conversation is not accessible.");
  const { error: partError } = await db.from("conversation_parts").upsert({
    id: stableId(`${id}:agent`), conversation_id: id, sequence_number: 1,
    actor: "agent", message_type: "message", content: text,
    metadata: { eve_session_id: sessionId },
  }, { onConflict: "id" });
  if (partError) throw new Error("Could not record the Slack answer.");
  const { error: updateError } = await db.from("conversations").update({
    status: "completed", completed_at: new Date().toISOString(),
  }).eq("id", id).eq("organisation_id", orgId);
  if (updateError) throw new Error("Could not update the Slack conversation.");
}
