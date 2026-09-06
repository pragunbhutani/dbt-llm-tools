import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getBaseUrl } from "@/lib/base-url";
import { IntegrationsSettingsForm } from "@/components/settings/integrations-settings-form";
import { WarehouseSettingsSection } from "@/components/settings/warehouse-settings-section";
import { MetabaseSettingsSection } from "@/components/settings/metabase-settings-section";
import { PageLayout } from "@/components/layout/page-layout";

export default async function IntegrationsSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: membership } = await supabase
    .from("organisation_members")
    .select("organisation_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!membership) redirect("/dashboard/onboarding");

  const orgId = membership.organisation_id;

  const [settingsResult, warehouseResult, metabaseResult] = await Promise.all([
    supabase
      .from("organisation_settings")
      .select("slack_bot_token, github_access_token")
      .eq("organisation_id", orgId)
      .single(),
    supabase
      .from("warehouse_connections")
      .select("id, name, type, status, last_tested_at")
      .eq("organisation_id", orgId)
      .order("created_at"),
    supabase
      .from("metabase_connections")
      .select("id, name, url, database_id, collection_path, status, last_tested_at")
      .eq("organisation_id", orgId)
      .order("created_at"),
  ]);

  const headersList = await headers();
  const host = headersList.get("host") ?? undefined;
  const slackEventsUrl = `${getBaseUrl(host)}/eve/v1/slack?organisation_id=${encodeURIComponent(orgId)}`;

  return (
    <PageLayout title="Data connections" subtitle="Manage sources and services connected to your workspace. Slack has its own setup page.">
      <div className="space-y-6">
        <IntegrationsSettingsForm
          hideSlack
          slackConnected={!!settingsResult.data?.slack_bot_token}
          githubConnected={!!settingsResult.data?.github_access_token}
          slackEventsUrl={slackEventsUrl}
        />
        <WarehouseSettingsSection
          initialConnections={(warehouseResult.data ?? []) as Parameters<typeof WarehouseSettingsSection>[0]["initialConnections"]}
        />
        <MetabaseSettingsSection
          initialConnections={(metabaseResult.data ?? []) as Parameters<typeof MetabaseSettingsSection>[0]["initialConnections"]}
        />
      </div>
    </PageLayout>
  );
}
