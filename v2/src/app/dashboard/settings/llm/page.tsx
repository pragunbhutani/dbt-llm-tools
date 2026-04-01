import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LlmSettingsForm } from "@/components/settings/llm-settings-form";
import { PageLayout } from "@/components/layout/page-layout";

function maskKey(key: string | null | undefined): string | null {
  if (!key || key.length < 8) return null;
  const prefix = key.slice(0, key.indexOf("-", 3) + 1 || 3);
  const suffix = key.slice(-4);
  return `${prefix}...${suffix}`;
}

export default async function LlmSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: membership } = await supabase
    .from("organisation_members")
    .select("organisation_id, organisations(name)")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!membership) redirect("/dashboard/onboarding");

  const orgId = membership.organisation_id;
  const orgName = (membership.organisations as { name: string } | null)?.name ?? "My Organisation";

  const { data: settings } = await supabase
    .from("organisation_settings")
    .select("*")
    .eq("organisation_id", orgId)
    .single();

  const maskedKeys = {
    openai: maskKey(settings?.llm_openai_api_key_path),
    anthropic: maskKey(settings?.llm_anthropic_api_key_path),
    google: maskKey(settings?.llm_google_api_key_path),
  };

  return (
    <PageLayout title="LLM Providers" subtitle="Configure API keys and model preferences for your organisation.">
      <LlmSettingsForm settings={settings ?? null} orgName={orgName} maskedKeys={maskedKeys} />
    </PageLayout>
  );
}
