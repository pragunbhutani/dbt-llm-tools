import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle, Hash, AlertCircle } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAdminWorkspace } from "@/lib/admin/workspace";
import { getSlackSetupState, slackSetupLabels } from "@/lib/admin/readiness";

export default async function DashboardPage() {
  const { db, orgId, sevenDaysAgo } = await getAdminWorkspace();
  const [settingsResult, projectsResult, modelsResult, embeddingsResult, conversationsResult, errorsResult] = await Promise.all([
    db.from("organisation_settings").select("slack_bot_token, slack_signing_secret, slack_team_id, updated_at, llm_chat_provider, llm_openai_api_key_path, llm_anthropic_api_key_path, llm_google_api_key_path").eq("organisation_id", orgId).single(),
    db.from("dbt_projects").select("id, name, status, last_synced_at").eq("organisation_id", orgId),
    db.from("dbt_models").select("id", { count: "exact", head: true }).eq("organisation_id", orgId),
    db.from("model_embeddings").select("model_id", { count: "exact", head: true }).eq("organisation_id", orgId).eq("can_be_used_for_answers", true),
    db.from("conversations").select("id, initial_question, status, started_at").eq("organisation_id", orgId).eq("channel", "slack").order("started_at", { ascending: false }).limit(5),
    db.from("conversations").select("id", { count: "exact", head: true }).eq("organisation_id", orgId).eq("channel", "slack").in("status", ["error", "timeout"]).gte("started_at", sevenDaysAgo),
  ]);
  if ([settingsResult, projectsResult, modelsResult, embeddingsResult, conversationsResult, errorsResult].some(r => r.error)) {
    throw new Error("Could not load workspace readiness.");
  }
  const settings = settingsResult.data;
  const projects = projectsResult.data ?? [];
  const conversations = conversationsResult.data ?? [];
  const configured = !!(settings?.slack_bot_token && settings.slack_signing_secret && settings.slack_team_id);
  const slackState = getSlackSetupState(configured, conversations[0]?.started_at ?? null, settings?.updated_at ?? null);
  const provider = settings?.llm_chat_provider ?? "openai";
  const hasModelKey = !!(provider === "anthropic" ? settings?.llm_anthropic_api_key_path : provider === "google" ? settings?.llm_google_api_key_path : settings?.llm_openai_api_key_path);
  const knowledgeCount = embeddingsResult.count ?? 0;
  const steps = [
    { title: "Connect Slack", detail: "Save the app credentials and configure event delivery.", done: configured, href: "/dashboard/slack" },
    { title: "Configure the agent", detail: "Choose a response model and add an OpenAI key for knowledge search.", done: hasModelKey && !!settings?.llm_openai_api_key_path, href: "/dashboard/settings/llm" },
    { title: "Connect your dbt project", detail: "Import the models and documentation your team uses.", done: projects.some(p => p.status === "synced"), href: "/dashboard/projects" },
    { title: "Prepare the knowledge", detail: "Make the relevant models available to the agent.", done: knowledgeCount > 0, href: "/dashboard/knowledge-base" },
    { title: "Ask a question in Slack", detail: "Mention Ragstar, then inspect the answer here.", done: slackState === "activity_observed", href: "/dashboard/slack" },
  ];
  const nextStep = steps.find(s => !s.done);
  const failedProjects = projects.filter(p => p.status === "error");
  return (
    <PageLayout title="Overview" subtitle="Keep your Slack agent connected, informed, and ready for your team." actions={<Button asChild><Link href="/dashboard/slack"><Hash className="h-4 w-4" />Manage Slack</Link></Button>}>
      <section className="mb-8 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/50">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-800"><Hash className="h-4 w-4" />Your team talks in Slack</div>
            <h2 className="text-xl font-semibold tracking-tight">{configured ? "Keep the conversation flowing." : "Bring Ragstar into your workspace."}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{configured ? "Review delivery setup, inspect recent questions, and keep the agent’s knowledge current." : "Connect your Slack app so your team can ask questions about dbt models and get grounded SQL suggestions."}</p>
          </div>
          <div className="rounded-xl border bg-background p-4 lg:min-w-64">
            <p className="text-xs text-muted-foreground">Slack setup</p>
            <p className="mt-1 text-sm font-medium">{slackSetupLabels[slackState]}</p>
            <Link href="/dashboard/slack" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-800">{configured ? "Review setup" : "Connect Slack"}<ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
        </div>
      </section>
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Knowledge available", value: `${knowledgeCount} / ${modelsResult.count ?? 0}`, detail: "Imported models enabled for answers", href: "/dashboard/knowledge-base" },
          { label: "dbt projects", value: String(projects.length), detail: `${projects.filter(p => p.status === "synced").length} synced · ${failedProjects.length} need attention`, href: "/dashboard/projects" },
          { label: "Failed conversations", value: String(errorsResult.count ?? 0), detail: "Errors and timeouts in the last 7 days", href: "/dashboard/conversations?status=error", },
        ].map(stat => <Link key={stat.label} href={stat.href} className="rounded-xl border p-5 transition-colors hover:bg-muted/40"><p className="text-sm text-muted-foreground">{stat.label}</p><p className="mt-2 text-3xl font-semibold tracking-tight">{stat.value}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{stat.detail}</p></Link>)}
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[1fr_1.15fr]">
        <section className="rounded-xl border">
          <div className="border-b p-5"><h2 className="font-semibold">{nextStep ? "Finish setting up" : "Workspace setup"}</h2><p className="mt-1 text-sm text-muted-foreground">{steps.filter(s => s.done).length} of {steps.length} steps complete</p></div>
          <div className="divide-y">{steps.map(step => <Link key={step.title} href={step.href} className="flex gap-3 p-5 hover:bg-muted/30">{step.done ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}<div><p className="text-sm font-medium">{step.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{step.detail}</p></div>{nextStep === step && <ArrowRight className="ml-auto mt-0.5 h-4 w-4 shrink-0" />}</Link>)}</div>
        </section>
        <section>
          <div className="mb-4 flex items-center justify-between gap-4"><h2 className="font-semibold">Recent Slack conversations</h2><Link href="/dashboard/conversations" className="text-sm text-muted-foreground hover:text-foreground">View all →</Link></div>
          {conversations.length ? <div className="divide-y rounded-xl border">{conversations.map(c => <Link key={c.id} href={`/dashboard/conversations/${c.id}`} className="flex items-start justify-between gap-3 p-4 hover:bg-muted/30"><div className="min-w-0"><p className="truncate text-sm font-medium">{c.initial_question}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(c.started_at).toLocaleString()}</p></div><Badge variant={c.status === "error" || c.status === "timeout" ? "destructive" : "secondary"}>{c.status}</Badge></Link>)}</div> : <div className="rounded-xl border border-dashed p-8"><Hash className="mb-3 h-6 w-6 text-muted-foreground" /><p className="text-sm font-medium">Your first Slack question will appear here.</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Once setup is complete, mention Ragstar in Slack. This is where admins inspect the resulting conversations.</p></div>}
          {!!failedProjects.length && <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="font-medium">A project needs attention</p><Link href="/dashboard/projects" className="mt-1 block underline">Review sync status for {failedProjects.map(p => p.name).join(", ")}</Link></div></div>}
        </section>
      </div>
    </PageLayout>
  );
}
