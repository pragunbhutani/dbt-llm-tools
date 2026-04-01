import { WebClient } from "@slack/web-api";
import { getLLMModel } from "@/lib/ai/providers";
import {
  generateText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import { makeSearchModelsTool, makeFetchModelDetailsTool } from "@/lib/ai/tools";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { createAdminClient } from "@/lib/supabase/admin";

export async function runSlackWorkflow({
  orgId,
  question,
  channelId,
  threadTs,
  botToken,
  llmProvider,
  llmModel,
  openaiApiKey,
  anthropicApiKey,
  googleApiKey,
}: {
  orgId: string;
  question: string;
  channelId: string;
  threadTs: string;
  botToken: string;
  llmProvider: string | null;
  llmModel: string | null;
  openaiApiKey?: string | null;
  anthropicApiKey?: string | null;
  googleApiKey?: string | null;
}) {
  const slack = new WebClient(botToken);
  const supabase = createAdminClient();

  // Post a thinking indicator and capture its ts so we can update it later
  const thinkingMsg = await slack.chat.postMessage({
    channel: channelId,
    thread_ts: threadTs,
    text: "Let me look into that for you... :thinking_face:",
  });

  const thinkingTs = thinkingMsg.ts;

  try {
    const messages: UIMessage[] = [
      {
        id: "user-1",
        role: "user",
        parts: [{ type: "text", text: question }],
        metadata: undefined,
      },
    ];

    const model = getLLMModel(llmProvider, llmModel, {
      openai: openaiApiKey,
      anthropic: anthropicApiKey,
      google: googleApiKey,
    });

    const { text, usage } = await generateText({
      model,
      system: buildSystemPrompt({ sqlDialect: "Standard SQL" }),
      messages: await convertToModelMessages(messages),
      tools: {
        searchModels: makeSearchModelsTool(orgId, openaiApiKey),
        fetchModelDetails: makeFetchModelDetailsTool(orgId),
      },
      stopWhen: stepCountIs(10),
    });

    // Update the thinking message with the actual answer
    if (thinkingTs) {
      await slack.chat.update({
        channel: channelId,
        ts: thinkingTs,
        text,
      });
    } else {
      await slack.chat.postMessage({
        channel: channelId,
        thread_ts: threadTs,
        text,
      });
    }

    // Save conversation to DB
    const { data: conv } = await supabase
      .from("conversations")
      .insert({
        organisation_id: orgId,
        channel: "slack",
        trigger: "slack_mention",
        initial_question: question.slice(0, 500),
        status: "completed",
        channel_id: channelId,
        total_tokens_used: usage?.totalTokens ?? 0,
        completed_at: new Date().toISOString(),
        enabled_integrations: {},
        conversation_context: { thread_ts: threadTs },
      })
      .select("id")
      .single();

    if (conv?.id) {
      await supabase.from("conversation_parts").insert([
        {
          conversation_id: conv.id,
          sequence_number: 0,
          actor: "user",
          message_type: "message",
          content: question,
          tokens_used: 0,
          cost: 0,
          duration_ms: 0,
          metadata: {},
        },
        {
          conversation_id: conv.id,
          sequence_number: 1,
          actor: "agent",
          message_type: "message",
          content: text,
          tokens_used: usage?.totalTokens ?? 0,
          cost: 0,
          duration_ms: 0,
          metadata: {},
        },
      ]);
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    if (thinkingTs) {
      await slack.chat.update({
        channel: channelId,
        ts: thinkingTs,
        text: `Sorry, I encountered an error: ${errMsg}`,
      });
    } else {
      await slack.chat.postMessage({
        channel: channelId,
        thread_ts: threadTs,
        text: `Sorry, I encountered an error: ${errMsg}`,
      });
    }
  }
}
