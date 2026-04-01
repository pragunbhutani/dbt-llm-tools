import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

type OrgApiKeys = {
  openai?: string | null;
  anthropic?: string | null;
  google?: string | null;
};

/** Returns a language model using the org's API key from settings. Throws if no key is configured. */
export function getLLMModel(
  provider: string | null,
  model: string | null,
  keys: OrgApiKeys = {}
): LanguageModel {
  const p = provider ?? "openai";
  const m = model ?? "gpt-4o";

  if (p === "anthropic") {
    if (!keys.anthropic) throw new Error("Anthropic API key not configured. Please add it in Settings → LLM Providers.");
    return createAnthropic({ apiKey: keys.anthropic })(m);
  }

  if (p === "google") {
    if (!keys.google) throw new Error("Google API key not configured. Please add it in Settings → LLM Providers.");
    return createGoogleGenerativeAI({ apiKey: keys.google })(m);
  }

  if (!keys.openai) throw new Error("OpenAI API key not configured. Please add it in Settings → LLM Providers.");
  return createOpenAI({ apiKey: keys.openai })(m);
}

/** Returns an embedding model using the org's OpenAI key from settings. Throws if no key is configured. */
export function getEmbeddingModel(apiKey?: string | null, model?: string | null) {
  if (!apiKey) throw new Error("OpenAI API key not configured. Please add it in Settings → LLM Providers.");
  return createOpenAI({ apiKey }).embedding(model ?? "text-embedding-3-small");
}
