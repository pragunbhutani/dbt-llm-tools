"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function generateManifest() {
  return {
    display_information: {
      name: "Ragstar",
      description: "AI data assistant — ask questions about your data in Slack.",
      background_color: "#2F6EAF",
    },
    features: {
      bot_user: {
        display_name: "ragstar",
        always_online: true,
      },
    },
    oauth_config: {
      scopes: {
        bot: [
          "app_mentions:read",
          "channels:history",
          "channels:read",
          "chat:write",
          "im:history",
          "im:read",
          "im:write",
        ],
      },
    },
    settings: {
      event_subscriptions: {
        bot_events: ["app_mention", "message.im", "message.channels"],
      },
      org_deploy_enabled: false,
      socket_mode_enabled: false,
      token_rotation_enabled: false,
    },
  };
}

interface SlackConnectDialogProps {
  slackEventsUrl: string;
  connected: boolean;
  onConnected: () => void;
  onDisconnected: () => void;
}

export function SlackConnectDialog({
  slackEventsUrl,
  connected,
  onConnected,
  onDisconnected,
}: SlackConnectDialogProps) {
  const [open, setOpen] = useState(false);
  const [botToken, setBotToken] = useState("");
  const [signingSecret, setSigningSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const manifest = generateManifest();
  const manifestJson = JSON.stringify(manifest, null, 2);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/integrations/slack/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_token: botToken, signing_secret: signingSecret }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to connect Slack");
        return;
      }
      toast.success("Credentials saved. Now set the Events endpoint in Slack.");
      setBotToken("");
      setSigningSecret("");
      onConnected();
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await fetch("/api/integrations/slack/setup", { method: "DELETE" });
      toast.success("Slack disconnected");
      onDisconnected();
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant={connected ? "outline" : "default"}>
            {connected ? "Reconfigure Slack" : "Connect Slack"}
          </Button>
        </DialogTrigger>

        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-4xl max-h-[90svh] overflow-y-auto p-0 gap-0">
          <div className="grid grid-cols-1 md:grid-cols-2">

            {/* ── Left: setup guide ── */}
            <div className="flex flex-col p-5 sm:p-8 md:border-r">
              <DialogHeader className="mb-6 shrink-0">
                <DialogTitle className="text-xl">Connect Ragstar to Slack</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Create a Slack app using the manifest below, then paste your credentials on the right.
                </p>
              </DialogHeader>

              {/* Manifest */}
              <div className="space-y-3 mb-6 shrink-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">App Manifest</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1.5"
                    onClick={() => copy(manifestJson, "Manifest")}
                  >
                    <Copy className="h-3 w-3" />
                    Copy manifest
                  </Button>
                </div>
                <pre className="text-[11px] font-mono bg-muted rounded-md p-3 overflow-auto max-h-52 leading-relaxed text-muted-foreground">
                  {manifestJson}
                </pre>
              </div>

              {/* CTA */}
              <a
                href="https://api.slack.com/apps?new_app=1"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0"
              >
                <Button type="button" variant="outline" className="w-full gap-2">
                  Create app on Slack
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </a>

              {/* Steps */}
              <div className="mt-6 pt-6 border-t shrink-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                  Step-by-step
                </p>
                <ol className="space-y-4 text-sm">
                  {[
                    <>Copy the manifest above, then click <strong>Create app on Slack</strong>. Choose <strong>From an app manifest</strong>, select your workspace and paste it in.</>,
                    <>Click <strong>Install to Workspace</strong> and authorize the app.</>,
                    <>Under <strong>OAuth &amp; Permissions</strong>, copy the <strong>Bot User OAuth Token</strong> (starts with <code className="bg-muted px-1 rounded text-[11px]">xoxb-</code>).</>,
                    <>Under <strong>Basic Information → App Credentials</strong>, copy the <strong>Signing Secret</strong>.</>,
                    <>Paste both on the right and click <strong>Save &amp; Connect</strong>.</>,
                    <>After saving, open <strong>Event Subscriptions</strong> in Slack, enable events, and paste the <strong>Events endpoint</strong> shown here as the Request URL. Wait for verification and save.</>,
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="shrink-0 text-xs font-semibold text-muted-foreground w-4 pt-0.5">{i + 1}.</span>
                      <p className="text-muted-foreground leading-relaxed">{step}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* ── Right: credentials form ── */}
            <div className="flex flex-col p-5 sm:p-8 bg-muted/30">
              <div className="mb-8">
                <h3 className="font-semibold">Your credentials</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Found in your Slack app&apos;s dashboard after installation.
                </p>
              </div>

              <form onSubmit={handleConnect} className="flex flex-col gap-6 flex-1">
                <div className="space-y-2">
                  <Label htmlFor="bot-token">Bot User OAuth Token</Label>
                  <Input
                    id="bot-token"
                    type="password"
                    placeholder="xoxb-…"
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    OAuth &amp; Permissions → Bot User OAuth Token
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signing-secret">Signing Secret</Label>
                  <Input
                    id="signing-secret"
                    type="password"
                    placeholder="Your app's signing secret"
                    value={signingSecret}
                    onChange={(e) => setSigningSecret(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Basic Information → App Credentials → Signing Secret
                  </p>
                </div>

                <div className="space-y-3 p-4 rounded-lg border bg-background">
                  <p className="text-xs font-medium">Events endpoint</p>
                  <div className="flex items-center gap-2">
                    <code className="text-[11px] font-mono text-muted-foreground flex-1 truncate">
                      {slackEventsUrl}
                    </code>
                    <button
                      type="button"
                      onClick={() => copy(slackEventsUrl, "URL")}
                      className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Copy events URL"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Save credentials first, then paste this URL into Slack&apos;s Event Subscriptions. Existing apps must update their Request URL too. For local development, expose this server through an HTTPS tunnel and replace the localhost origin with your tunnel URL, keeping the full path and query string.
                  </p>
                </div>

                <div className="mt-auto pt-4">
                  <Button type="submit" disabled={saving} className="w-full">
                    {saving ? "Connecting…" : "Save & Connect"}
                  </Button>
                </div>
              </form>
            </div>

          </div>
        </DialogContent>
      </Dialog>

      {connected && (
        <Button
          type="button"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          disabled={disconnecting}
          onClick={handleDisconnect}
        >
          {disconnecting ? "Disconnecting…" : "Disconnect"}
        </Button>
      )}
    </div>
  );
}
