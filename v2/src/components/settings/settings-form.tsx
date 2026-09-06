"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Copy, RotateCcw, CheckCircle2, AlertCircle } from "lucide-react";
import type { Database } from "@/types/database";

type OrgSettings = Database["public"]["Tables"]["organisation_settings"]["Row"];

const LLM_PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google" },
];

const CHAT_MODELS: Record<string, { value: string; label: string }[]> = {
  openai: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  ],
  anthropic: [
    { value: "claude-opus-4-6", label: "Claude Opus 4.6" },
    { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
    { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  ],
  google: [
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  ],
};

const EMBEDDING_MODELS: Record<string, { value: string; label: string }[]> = {
  openai: [
    { value: "text-embedding-3-small", label: "text-embedding-3-small (1536d)" },
    { value: "text-embedding-3-large", label: "text-embedding-3-large (3072d)" },
  ],
};

interface SettingsFormProps {
  settings: OrgSettings | null;
  orgName: string;
  mcpEndpoint: string;
  slackConnected: boolean;
  githubConnected: boolean;
}

function KeyInput({
  label,
  description,
  isSet,
  onSave,
  onClear,
}: {
  label: string;
  description: string;
  isSet: boolean;
  onSave: (value: string) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!value.trim()) return;
    setSaving(true);
    await onSave(value.trim());
    setValue("");
    setSaving(false);
  }

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
            <AlertCircle className="h-3 w-3 mr-1" />Not set — uses server env var
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={show ? "text" : "password"}
            placeholder={isSet ? "Enter new key to replace…" : "sk-…"}
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

export function SettingsForm({
  settings,
  orgName,
  mcpEndpoint,
  slackConnected,
  githubConnected,
}: SettingsFormProps) {
  const [chatProvider, setChatProvider] = useState(settings?.llm_chat_provider ?? "openai");
  const [chatModel, setChatModel] = useState(settings?.llm_chat_model ?? "gpt-4o");
  const [embeddingsProvider, setEmbeddingsProvider] = useState(settings?.llm_embeddings_provider ?? "openai");
  const [embeddingsModel, setEmbeddingsModel] = useState(settings?.llm_embeddings_model ?? "text-embedding-3-small");
  const [savingModels, setSavingModels] = useState(false);

  const [hasOpenAiKey, setHasOpenAiKey] = useState(!!settings?.llm_openai_api_key_path);
  const [hasAnthropicKey, setHasAnthropicKey] = useState(!!settings?.llm_anthropic_api_key_path);

  const [mcpKey, setMcpKey] = useState(settings?.mcp_api_key ?? null);
  const [rotatingKey, setRotatingKey] = useState(false);
  const [showMcpKey, setShowMcpKey] = useState(false);

  const chatModels = CHAT_MODELS[chatProvider] ?? [];
  const embeddingModels = EMBEDDING_MODELS[embeddingsProvider] ?? [];

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

  async function handleRotateMcpKey() {
    setRotatingKey(true);
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rotate_mcp_key" }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Failed to generate key");
    } else {
      setMcpKey(data.mcp_api_key);
      setShowMcpKey(true);
      toast.success("API key generated");
    }
    setRotatingKey(false);
  }

  const aiConfigured = hasOpenAiKey || hasAnthropicKey;

  return (
    <div className="max-w-2xl">
      {/* Org name */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Organisation</p>
          <p className="font-semibold text-lg">{orgName}</p>
        </div>
        {!aiConfigured && (
          <Badge variant="destructive" className="text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            AI not configured
          </Badge>
        )}
      </div>

      <Tabs defaultValue="ai">
        <TabsList className="mb-6 w-full">
          <TabsTrigger value="ai" className="flex-1">
            AI Configuration
            {!aiConfigured && <span className="ml-2 h-2 w-2 rounded-full bg-destructive inline-block" />}
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex-1">Integrations</TabsTrigger>
          <TabsTrigger value="developer" className="flex-1">Developer</TabsTrigger>
        </TabsList>

        {/* ─── AI Configuration ─── */}
        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Per-organisation API keys override the server-level environment variables. Leave blank to use the server defaults.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <KeyInput
                label="OpenAI API Key"
                description="Required for GPT models and all text embeddings."
                isSet={hasOpenAiKey}
                onSave={(v) =>
                  handleSaveApiKey("llm_openai_api_key_path", v, () => setHasOpenAiKey(true))
                }
                onClear={() =>
                  handleClearApiKey("llm_openai_api_key_path", () => setHasOpenAiKey(false))
                }
              />
              <KeyInput
                label="Anthropic API Key"
                description="Required for Claude models."
                isSet={hasAnthropicKey}
                onSave={(v) =>
                  handleSaveApiKey("llm_anthropic_api_key_path", v, () => setHasAnthropicKey(true))
                }
                onClear={() =>
                  handleClearApiKey("llm_anthropic_api_key_path", () => setHasAnthropicKey(false))
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Model Configuration</CardTitle>
              <CardDescription>
                Choose which models to use for chat responses and generating embeddings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Chat</h4>
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
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Embeddings</h4>
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
        </TabsContent>

        {/* ─── Integrations ─── */}
        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Slack</CardTitle>
                  <CardDescription>
                    Let your team ask data questions by mentioning the bot in any Slack channel.
                  </CardDescription>
                </div>
                {slackConnected ? (
                  <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200 bg-emerald-50 shrink-0">
                    <CheckCircle2 className="h-3 w-3 mr-1" />Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">Not connected</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <a href="/dashboard/settings/integrations">
                <Button type="button" variant={slackConnected ? "outline" : "default"}>
                  {slackConnected ? "Reconnect Slack" : "Connect Slack"}
                </Button>
              </a>
              {slackConnected && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Events webhook URL</p>
                  <div className="flex gap-2 items-center">
                    <code className="text-xs bg-muted px-2 py-1.5 rounded font-mono flex-1 truncate">
                      {mcpEndpoint.replace("/api/mcp", `/eve/v1/slack?organisation_id=${encodeURIComponent(settings?.organisation_id ?? "")}`)}
                    </code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(mcpEndpoint.replace("/api/mcp", `/eve/v1/slack?organisation_id=${encodeURIComponent(settings?.organisation_id ?? "")}`));
                        toast.success("Copied!");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Set this as the Request URL in your Slack app's Event Subscriptions.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>GitHub</CardTitle>
                  <CardDescription>
                    Authorise Ragstar to read private repositories when connecting dbt projects via GitHub.
                  </CardDescription>
                </div>
                {githubConnected ? (
                  <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200 bg-emerald-50 shrink-0">
                    <CheckCircle2 className="h-3 w-3 mr-1" />Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">Not connected</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <a href="/api/integrations/github/install">
                <Button type="button" variant={githubConnected ? "outline" : "default"}>
                  {githubConnected ? "Reconnect GitHub" : "Connect GitHub"}
                </Button>
              </a>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Developer ─── */}
        <TabsContent value="developer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>MCP Server</CardTitle>
              <CardDescription>
                Connect Claude Desktop, Cursor, or any MCP-compatible client directly to your Ragstar knowledge base.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Endpoint</Label>
                <div className="flex gap-2">
                  <Input value={mcpEndpoint} readOnly className="font-mono text-xs" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => { navigator.clipboard.writeText(mcpEndpoint); toast.success("Copied!"); }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">API Key</Label>
                {mcpKey ? (
                  <div className="flex gap-2">
                    <Input
                      value={showMcpKey ? mcpKey : "•".repeat(40)}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={() => setShowMcpKey((v) => !v)}>
                      {showMcpKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => { navigator.clipboard.writeText(mcpKey); toast.success("Copied!"); }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No API key generated yet.</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRotateMcpKey}
                  disabled={rotatingKey}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {rotatingKey ? "Generating…" : mcpKey ? "Rotate key" : "Generate key"}
                </Button>
                {mcpKey && (
                  <p className="text-xs text-muted-foreground">Rotating invalidates the current key immediately.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
