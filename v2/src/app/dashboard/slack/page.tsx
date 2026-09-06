import Link from "next/link";
import { headers } from "next/headers";
import { Hash, ArrowUpRight, CheckCircle2, Circle } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { IntegrationsSettingsForm } from "@/components/settings/integrations-settings-form";
import { Button } from "@/components/ui/button";
import { getAdminWorkspace } from "@/lib/admin/workspace";
import { getBaseUrl } from "@/lib/base-url";
import { getSlackSetupState, slackSetupLabels } from "@/lib/admin/readiness";

export default async function SlackPage() {
  const { db, orgId } = await getAdminWorkspace();
  const [settingsResult, activityResult] = await Promise.all([
    db.from("organisation_settings").select("slack_team_id, slack_bot_token, slack_signing_secret, updated_at").eq("organisation_id", orgId).single(),
    db.from("conversations").select("id, started_at, status").eq("organisation_id", orgId).eq("channel", "slack").order("started_at", { ascending: false }).limit(1),
  ]);
  if (settingsResult.error || activityResult.error) throw new Error("Could not load Slack setup.");
  const settings = settingsResult.data;
  const activity = activityResult.data?.[0];
  const configured = !!(settings?.slack_bot_token && settings.slack_signing_secret && settings.slack_team_id);
  const state = getSlackSetupState(configured, activity?.started_at ?? null, settings?.updated_at ?? null);
  const requestHeaders = await headers();
  const eventsUrl = `${getBaseUrl(requestHeaders.get("host") ?? undefined)}/eve/v1/slack?organisation_id=${encodeURIComponent(orgId)}`;
  const slackUrl = settings?.slack_team_id && /^T[A-Z0-9]+$/.test(settings.slack_team_id) ? `https://app.slack.com/client/${settings.slack_team_id}` : null;
  return (
    <PageLayout title="Slack" subtitle="The home of your agent’s conversations. Connect your workspace and confirm messages are reaching Ragstar." actions={slackUrl && <Button asChild variant="outline"><a href={slackUrl} target="_blank" rel="noreferrer">Open Slack<ArrowUpRight className="h-4 w-4" /></a></Button>}>
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border p-5"><p className="text-xs text-muted-foreground">Connection</p><p className="mt-2 text-sm font-semibold">{slackSetupLabels[state]}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Saved credentials do not confirm webhook delivery.</p></div>
        <div className="rounded-xl border p-5"><p className="text-xs text-muted-foreground">Workspace</p><p className="mt-2 font-mono text-sm">{settings?.slack_team_id ?? "Not connected"}</p></div>
        <div className="rounded-xl border p-5"><p className="text-xs text-muted-foreground">Last recorded question</p><p className="mt-2 text-sm font-semibold">{activity ? new Date(activity.started_at).toLocaleString() : "No questions received"}</p>{activity && <Link href={`/dashboard/conversations/${activity.id}`} className="mt-2 block text-xs underline">Inspect conversation · {activity.status}</Link>}</div>
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[1.4fr_1fr]">
        <IntegrationsSettingsForm slackConnected={configured} githubConnected={false} slackEventsUrl={eventsUrl} slackOnly />
        <div className="space-y-6">
          <section className="rounded-xl border p-6"><h2 className="font-semibold">Confirm your setup</h2><ol className="mt-5 space-y-5">{[
            { title: "Save the app credentials", text: "Use the guided setup to create and install a Slack app.", done: configured },
            { title: "Enable event delivery", text: "Paste the displayed endpoint into Slack’s Event Subscriptions, verify it, and save.", done: state === "activity_observed" },
            { title: "Ask in Slack", text: "Invite Ragstar to a channel and mention it with a dbt question, or send it a direct message.", done: state === "activity_observed" },
          ].map(s => <li key={s.title} className="flex gap-3">{s.done ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}<div><p className="text-sm font-medium">{s.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{s.text}</p></div></li>)}</ol></section>
          <section className="rounded-xl bg-muted/40 p-6"><Hash className="mb-3 h-5 w-5 text-muted-foreground" /><h2 className="text-sm font-semibold">What your team can ask</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Explain a dbt model, find the right columns, trace dependencies, or draft SQL. Conversations stay in Slack; admins review them here.</p><div className="mt-4 flex flex-wrap gap-4 text-sm"><Link href="/dashboard/settings/llm" className="underline">Agent settings</Link><Link href="/dashboard/conversations" className="underline">Review conversations</Link></div></section>
        </div>
      </div>
    </PageLayout>
  );
}
