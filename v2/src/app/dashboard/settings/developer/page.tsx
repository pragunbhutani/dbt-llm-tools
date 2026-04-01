import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { DeveloperSettingsForm } from "@/components/settings/developer-settings-form";
import { PageLayout } from "@/components/layout/page-layout";

export default async function DeveloperSettingsPage() {
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

  const { data: settings } = await supabase
    .from("organisation_settings")
    .select("mcp_api_key")
    .eq("organisation_id", membership.organisation_id)
    .single();

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const mcpEndpoint = `${protocol}://${host}/api/mcp`;

  return (
    <PageLayout title="Developer" subtitle="MCP server endpoint and API key for programmatic access.">
      <DeveloperSettingsForm
        mcpEndpoint={mcpEndpoint}
        initialMcpKey={settings?.mcp_api_key ?? null}
      />
    </PageLayout>
  );
}
