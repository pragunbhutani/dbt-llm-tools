import { createClient } from "@/lib/supabase/server";
import { getLLMModel } from "@/lib/ai/providers";
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import { makeSearchModelsTool, makeFetchModelDetailsTool, makeExecuteQueryTool } from "@/lib/ai/tools";
import type { WarehouseType } from "@/lib/warehouse/client";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { NextRequest } from "next/server";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: membership } = await supabase
    .from("organisation_members")
    .select("organisation_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!membership) return new Response("No organisation", { status: 403 });
  const orgId = membership.organisation_id;

  const [settingsResult, warehouseResult] = await Promise.all([
    supabase
      .from("organisation_settings")
      .select("llm_chat_provider, llm_chat_model, llm_openai_api_key_path, llm_anthropic_api_key_path, llm_google_api_key_path")
      .eq("organisation_id", orgId)
      .single(),
    supabase
      .from("warehouse_connections")
      .select("id, type, credentials")
      .eq("organisation_id", orgId)
      .eq("status", "connected")
      .limit(1)
      .maybeSingle(),
  ]);

  const settings = settingsResult.data;
  const warehouse = warehouseResult.data;

  const body = await request.json();
  const { messages, id: conversationId } = body as {
    messages: UIMessage[];
    id?: string;
  };

  if (!messages?.length) return new Response("messages required", { status: 400 });

  const isFirstMessage = messages.filter((m) => m.role === "user").length === 1;
  // conversationId is a client-generated string (not necessarily a UUID), stored as external_id
  let dbConvId: string | null = null;

  if (isFirstMessage && conversationId) {
    const firstUser = messages.find((m) => m.role === "user");
    const initialQuestion = (firstUser?.parts ?? [])
      .filter((p) => p.type === "text")
      .map((p) => (p as { type: "text"; text: string }).text)
      .join(" ");

    const { data: conv, error: convError } = await supabase
      .from("conversations")
      .insert({
        external_id: conversationId,
        organisation_id: orgId,
        user_id: user.id,
        channel: "web",
        trigger: "web_interface",
        initial_question: initialQuestion.slice(0, 500),
        status: "active",
        enabled_integrations: [],
        conversation_context: {},
      })
      .select("id")
      .single();

    if (convError) {
      console.error("[chat] Failed to create conversation:", convError.message, convError.details);
    } else {
      dbConvId = conv?.id ?? null;
    }
  } else if (conversationId) {
    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("organisation_id", orgId)
      .eq("external_id", conversationId)
      .maybeSingle();
    dbConvId = conv?.id ?? null;
  }

  const model = getLLMModel(
    settings?.llm_chat_provider ?? null,
    settings?.llm_chat_model ?? null,
    {
      openai: settings?.llm_openai_api_key_path,
      anthropic: settings?.llm_anthropic_api_key_path,
      google: settings?.llm_google_api_key_path,
    }
  );

  const modelMessages = await convertToModelMessages(messages);

  const tools = {
    searchModels: makeSearchModelsTool(orgId, settings?.llm_openai_api_key_path),
    fetchModelDetails: makeFetchModelDetailsTool(orgId),
    ...(warehouse
      ? {
          executeQuery: makeExecuteQueryTool(
            warehouse.id,
            warehouse.type as WarehouseType,
            warehouse.credentials as Record<string, unknown>
          ),
        }
      : {}),
  };

  const result = streamText({
    model,
    system: buildSystemPrompt({ hasWarehouse: !!warehouse }),
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(10),
    onFinish: async ({ text, usage }) => {
      if (!dbConvId) return;
      const { error: partError } = await supabase.from("conversation_parts").insert({
        conversation_id: dbConvId,
        sequence_number: messages.length,
        actor: "agent",
        message_type: "message",
        content: text,
        tokens_used: usage?.totalTokens ?? 0,
        cost: 0,
        duration_ms: 0,
        metadata: {},
      });
      if (partError) {
        console.error("[chat] Failed to save conversation part:", partError.message);
      }
      const { error: updateError } = await supabase
        .from("conversations")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          total_tokens_used: usage?.totalTokens ?? 0,
        })
        .eq("id", dbConvId);
      if (updateError) {
        console.error("[chat] Failed to update conversation:", updateError.message);
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
