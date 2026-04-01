import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, BookOpen, MessageSquare } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { GettingStarted } from "@/components/dashboard/getting-started";


export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { data: membership } = await supabase
    .from("organisation_members")
    .select("organisation_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!membership) redirect("/dashboard/onboarding");

  const orgId = membership.organisation_id;

  const [
    { count: projectCount },
    { count: modelCount },
    { count: conversationCount },
    { count: embeddingCount },
    { data: settings },
    { count: warehouseCount },
    { count: metabaseCount },
  ] = await Promise.all([
    supabase
      .from("dbt_projects")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", orgId),
    supabase
      .from("dbt_models")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", orgId),
    supabase
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", orgId),
    supabase
      .from("model_embeddings")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", orgId)
      .eq("can_be_used_for_answers", true),
    supabase
      .from("organisation_settings")
      .select("slack_bot_token, llm_openai_api_key_path, llm_anthropic_api_key_path, llm_google_api_key_path")
      .eq("organisation_id", orgId)
      .single(),
    supabase
      .from("warehouse_connections")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", orgId),
    supabase
      .from("metabase_connections")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", orgId),
  ]);

  const stats = [
    {
      label: "dbt Projects",
      value: projectCount ?? 0,
      icon: Database,
      href: "/dashboard/projects",
    },
    {
      label: "Models",
      value: modelCount ?? 0,
      icon: BookOpen,
      href: "/dashboard/knowledge-base",
    },
    {
      label: "Conversations",
      value: conversationCount ?? 0,
      icon: MessageSquare,
      href: "/dashboard/conversations",
    },
  ];

  return (
    <PageLayout title="Dashboard">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <GettingStarted
          hasApiKeys={!!(settings?.llm_openai_api_key_path || settings?.llm_anthropic_api_key_path || settings?.llm_google_api_key_path)}
          hasOpenAiKey={!!settings?.llm_openai_api_key_path}
          hasProject={(projectCount ?? 0) > 0}
          hasEmbeddings={(embeddingCount ?? 0) > 0}
          hasConversation={(conversationCount ?? 0) > 0}
          slackConnected={!!settings?.slack_bot_token}
          warehouseConnected={(warehouseCount ?? 0) > 0}
          metabaseConnected={(metabaseCount ?? 0) > 0}
        />
      </div>
    </PageLayout>
  );
}
