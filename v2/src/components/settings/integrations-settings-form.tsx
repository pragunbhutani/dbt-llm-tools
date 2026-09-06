"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, CheckCircle2 } from "lucide-react";

// ssr: false prevents this Dialog from contributing to Radix's server-side ID
// counter, which would cause hydration mismatches with other Radix components.
const SlackConnectDialog = dynamic(
  () => import("./slack-connect-dialog").then((m) => ({ default: m.SlackConnectDialog })),
  { ssr: false }
);

interface IntegrationsSettingsFormProps {
  slackConnected: boolean;
  githubConnected: boolean;
  slackEventsUrl: string;
  slackOnly?: boolean;
  hideSlack?: boolean;
}

export function IntegrationsSettingsForm({
  slackConnected,
  githubConnected,
  slackEventsUrl,
  slackOnly = false,
  hideSlack = false,
}: IntegrationsSettingsFormProps) {
  const router = useRouter();
  const [isSlackConnected, setIsSlackConnected] = useState(slackConnected);

  const refresh = () => router.refresh();

  return (
    <div className="space-y-6">
      {!hideSlack && <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Slack</CardTitle>
              <CardDescription>
                Let your team ask data questions by mentioning the bot in any Slack channel.
              </CardDescription>
            </div>
            {isSlackConnected ? (
              <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200 bg-emerald-50 shrink-0">
                <CheckCircle2 className="h-3 w-3 mr-1" />Credentials saved
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">Not connected</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <SlackConnectDialog
            slackEventsUrl={slackEventsUrl}
            connected={isSlackConnected}
            onConnected={() => { setIsSlackConnected(true); refresh(); }}
            onDisconnected={() => { setIsSlackConnected(false); refresh(); }}
          />
          {isSlackConnected && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Events webhook URL</p>
              <div className="flex gap-2 items-center">
                <code className="text-xs bg-muted px-2 py-1.5 rounded font-mono flex-1 truncate">
                  {slackEventsUrl}
                </code>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(slackEventsUrl);
                    toast.success("Copied!");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Set this as the Request URL in your Slack app&apos;s Event Subscriptions.
              </p>
            </div>
          )}
        </CardContent>
      </Card>}

      {!slackOnly && <Card>
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
      </Card>}
    </div>
  );
}
