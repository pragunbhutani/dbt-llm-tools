import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateText } from "ai";
import { getLLMModel } from "@/lib/ai/providers";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { provider, key } = await request.json() as { provider: string; key?: string };

  if (!provider) return NextResponse.json({ error: "provider required" }, { status: 400 });

  // If no key was passed, load the saved one
  let resolvedKey = key?.trim() || null;
  if (!resolvedKey) {
    const { data: membership } = await supabase
      .from("organisation_members")
      .select("organisation_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (membership) {
      const { data: settings } = await supabase
        .from("organisation_settings")
        .select("llm_openai_api_key_path, llm_anthropic_api_key_path, llm_google_api_key_path")
        .eq("organisation_id", membership.organisation_id)
        .single();

      if (provider === "openai") resolvedKey = settings?.llm_openai_api_key_path ?? null;
      else if (provider === "anthropic") resolvedKey = settings?.llm_anthropic_api_key_path ?? null;
      else if (provider === "google") resolvedKey = settings?.llm_google_api_key_path ?? null;
    }
  }

  if (!resolvedKey) {
    return NextResponse.json({ error: "No API key available to test" }, { status: 400 });
  }

  const defaultModels: Record<string, string> = {
    openai: "gpt-5.4-nano",
    anthropic: "claude-haiku-4-5-20251001",
    google: "gemini-2.5-flash-lite",
  };

  try {
    const model = getLLMModel(provider, defaultModels[provider] ?? null, {
      openai: provider === "openai" ? resolvedKey : null,
      anthropic: provider === "anthropic" ? resolvedKey : null,
      google: provider === "google" ? resolvedKey : null,
    });

    await generateText({
      model,
      prompt: "Reply with just the word 'ok'.",
      maxOutputTokens: 16,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
