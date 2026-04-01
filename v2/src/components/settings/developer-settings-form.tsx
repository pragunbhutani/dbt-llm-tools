"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Copy, RotateCcw } from "lucide-react";

interface DeveloperSettingsFormProps {
  mcpEndpoint: string;
  initialMcpKey: string | null;
}

export function DeveloperSettingsForm({ mcpEndpoint, initialMcpKey }: DeveloperSettingsFormProps) {
  const [mcpKey, setMcpKey] = useState(initialMcpKey);
  const [rotatingKey, setRotatingKey] = useState(false);
  const [showMcpKey, setShowMcpKey] = useState(false);

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

  return (
    <div className="space-y-6">
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
    </div>
  );
}
