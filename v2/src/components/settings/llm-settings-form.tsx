"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, CheckCircle2, AlertCircle, FlaskConical } from "lucide-react";
import type { Database } from "@/types/database";

type OrgSettings = Database["public"]["Tables"]["organisation_settings"]["Row"];

const LLM_PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google" },
];

const CHAT_MODELS: Record<string, { value: string; label: string }[]> = {
  openai: [
    { value: "gpt-5.4", label: "GPT-5.4" },
    { value: "gpt-5.4-pro", label: "GPT-5.4 Pro" },
    { value: "gpt-5.4-mini", label: "GPT-5.4 Mini" },
    { value: "gpt-5.4-nano", label: "GPT-5.4 Nano" },
    { value: "gpt-5", label: "GPT-5" },
    { value: "gpt-5-mini", label: "GPT-5 Mini" },
    { value: "gpt-5-nano", label: "GPT-5 Nano" },
    { value: "gpt-4.1", label: "GPT-4.1" },
  ],
  anthropic: [
    { value: "claude-opus-4-6", label: "Claude Opus 4.6" },
    { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
    { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
    { value: "claude-opus-4-5-20251101", label: "Claude Opus 4.5" },
    { value: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
    { value: "claude-opus-4-20250514", label: "Claude Opus 4" },
    { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  ],
  google: [
    { value: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (Preview)" },
    { value: "gemini-3-flash-preview", label: "Gemini 3 Flash (Preview)" },
    { value: "gemini-3.1-flash-lite-preview", label: "Gemini 3.1 Flash Lite (Preview)" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
  ],
};

const EMBEDDING_MODELS: Record<string, { value: string; label: string }[]> = {
  openai: [
    { value: "text-embedding-3-small", label: "text-embedding-3-small (1536d)" },
    { value: "text-embedding-3-large", label: "text-embedding-3-large (3072d)" },
    { value: "text-embedding-ada-002", label: "text-embedding-ada-002 (1536d, legacy)" },
  ],
};

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
};

function KeyInput({
  label,
  provider,
  description,
  isSet,
  maskedKey,
  onSave,
  onClear,
}: {
  label: string;
  provider: string;
  description: string;
  isSet: boolean;
  maskedKey: string | null;
  onSave: (value: string) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  async function handleSave() {
    if (!value.trim()) return;
    setSaving(true);
    await onSave(value.trim());
    setValue("");
    setSaving(false);
  }

  async function handleTest() {
    setTesting(true);
    try {
      const res = await fetch("/api/settings/test-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, key: value.trim() || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`${label} is working correctly.`);
      } else {
        toast.error(`Test failed: ${data.error}`);
      }
    } catch {
      toast.error("Test failed — check your network connection.");
    }
    setTesting(false);
  }

  const canTest = isSet || !!value.trim();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {isSet ? (
          <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200 bg-emerald-50">
            <CheckCircle2 className="h-3 w-3 mr-1" />Configured
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            <AlertCircle className="h-3 w-3 mr-1" />Not configured
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={show ? "text" : "password"}
            placeholder={isSet ? (maskedKey ?? "Enter new key to replace…") : "Paste your API key…"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="pr-10 font-mono text-sm"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!value.trim() || saving}
          onClick={handleSave}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canTest || testing}
          onClick={handleTest}
          title={isSet ? "Test saved key" : "Test key before saving"}
        >
          <FlaskConical className="h-3.5 w-3.5 mr-1" />
          {testing ? "Testing…" : "Test"}
        </Button>
        {isSet && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={onClear}
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}

interface LlmSettingsFormProps {
  settings: OrgSettings | null;
  orgName: string;
  maskedKeys: { openai: string | null; anthropic: string | null; google: string | null };
}

export function LlmSettingsForm({ settings, orgName, maskedKeys }: LlmSettingsFormProps) {
  const [chatProvider, setChatProvider] = useState(settings?.llm_chat_provider ?? "openai");
  const [chatModel, setChatModel] = useState(settings?.llm_chat_model ?? "gpt-4o");
  const [embeddingsProvider, setEmbeddingsProvider] = useState(settings?.llm_embeddings_provider ?? "openai");
  const [embeddingsModel, setEmbeddingsModel] = useState(settings?.llm_embeddings_model ?? "text-embedding-3-small");
  const [savingModels, setSavingModels] = useState(false);

  const [hasOpenAiKey, setHasOpenAiKey] = useState(!!settings?.llm_openai_api_key_path);
  const [hasAnthropicKey, setHasAnthropicKey] = useState(!!settings?.llm_anthropic_api_key_path);
  const [hasGoogleKey, setHasGoogleKey] = useState(!!settings?.llm_google_api_key_path);

  const keyByProvider: Record<string, boolean> = {
    openai: hasOpenAiKey,
    anthropic: hasAnthropicKey,
    google: hasGoogleKey,
  };

  const chatModels = CHAT_MODELS[chatProvider] ?? [];
  const embeddingModels = EMBEDDING_MODELS[embeddingsProvider] ?? [];
  const aiConfigured = hasOpenAiKey || hasAnthropicKey || hasGoogleKey;
  const chatProviderHasKey = keyByProvider[chatProvider] ?? false;

  async function patchSettings(updates: Record<string, string | null>) {
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Failed to save");
    }
  }

  async function handleSaveModels() {
    setSavingModels(true);
    try {
      await patchSettings({
        llm_chat_provider: chatProvider,
        llm_chat_model: chatModel,
        llm_embeddings_provider: embeddingsProvider,
        llm_embeddings_model: embeddingsModel,
      });
      toast.success("Model settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    }
    setSavingModels(false);
  }

  async function handleSaveApiKey(field: string, value: string, onSuccess: () => void) {
    try {
      await patchSettings({ [field]: value });
      toast.success("API key saved");
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    }
  }

  async function handleClearApiKey(field: string, onSuccess: () => void) {
    try {
      await patchSettings({ [field]: null });
      toast.success("API key cleared");
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to clear");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Organisation</p>
          <p className="font-semibold text-lg">{orgName}</p>
        </div>
        {!aiConfigured && (
          <Badge variant="destructive" className="text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            No API key configured — AI features will not work
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Add your provider API keys. Keys are stored securely and only used for your organisation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <KeyInput
            label="OpenAI API Key"
            provider="openai"
            description="Required for GPT models and all text embeddings."
            isSet={hasOpenAiKey}
            maskedKey={maskedKeys.openai}
            onSave={(v) => handleSaveApiKey("llm_openai_api_key_path", v, () => setHasOpenAiKey(true))}
            onClear={() => handleClearApiKey("llm_openai_api_key_path", () => setHasOpenAiKey(false))}
          />
          <KeyInput
            label="Anthropic API Key"
            provider="anthropic"
            description="Required for Claude models."
            isSet={hasAnthropicKey}
            maskedKey={maskedKeys.anthropic}
            onSave={(v) => handleSaveApiKey("llm_anthropic_api_key_path", v, () => setHasAnthropicKey(true))}
            onClear={() => handleClearApiKey("llm_anthropic_api_key_path", () => setHasAnthropicKey(false))}
          />
          <KeyInput
            label="Google API Key"
            provider="google"
            description="Required for Gemini models. Obtain from Google AI Studio."
            isSet={hasGoogleKey}
            maskedKey={maskedKeys.google}
            onSave={(v) => handleSaveApiKey("llm_google_api_key_path", v, () => setHasGoogleKey(true))}
            onClear={() => handleClearApiKey("llm_google_api_key_path", () => setHasGoogleKey(false))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Model Configuration</CardTitle>
          <CardDescription>
            Choose which models to use for Slack responses and knowledge search.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Agent responses</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select
                  value={chatProvider}
                  onValueChange={(v) => {
                    setChatProvider(v);
                    setChatModel(CHAT_MODELS[v]?.[0]?.value ?? "");
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LLM_PROVIDERS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Select value={chatModel} onValueChange={setChatModel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {chatModels.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {!chatProviderHasKey && (
              <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                No API key configured for {PROVIDER_LABELS[chatProvider]}. Add one above before saving.
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium">Knowledge search</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select
                  value={embeddingsProvider}
                  onValueChange={(v) => {
                    setEmbeddingsProvider(v);
                    setEmbeddingsModel(EMBEDDING_MODELS[v]?.[0]?.value ?? "");
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LLM_PROVIDERS.filter((p) => EMBEDDING_MODELS[p.value]).map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Select value={embeddingsModel} onValueChange={setEmbeddingsModel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {embeddingModels.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Button onClick={handleSaveModels} disabled={savingModels}>
            {savingModels ? "Saving…" : "Save model settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
