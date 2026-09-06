import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ModelsTable } from "@/components/knowledge-base/models-table";
import { PageLayout } from "@/components/layout/page-layout";

export default async function KnowledgeBasePage() {
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

  const [{ data: models, count }, { data: projects }, { data: embeddings }] = await Promise.all([
    supabase
      .from("dbt_models")
      .select(
        "id, name, path, schema_name, database_name, materialization, tags, dbt_project_id, yml_description, yml_columns, interpreted_description, interpreted_columns, updated_at",
        { count: "exact" }
      )
      .eq("organisation_id", orgId)
      .order("name", { ascending: true }),
    supabase
      .from("dbt_projects")
      .select("id, name")
      .eq("organisation_id", orgId)
      .order("name"),
    supabase
      .from("model_embeddings")
      .select("model_id, can_be_used_for_answers, updated_at")
      .eq("organisation_id", orgId),
  ]);

  // Build lookup: model_id → { enabled, embeddedAt }
  const embeddingStatus: Record<string, { enabled: boolean; embeddedAt: string }> = {};
  for (const e of embeddings ?? []) {
    if (e.model_id) {
      embeddingStatus[e.model_id] = {
        enabled: e.can_be_used_for_answers,
        embeddedAt: e.updated_at,
      };
    }
  }

  return (
    <PageLayout
      title="Models"
      subtitle={count != null ? `${count} models` : undefined}
    >
      <ModelsTable
        models={models ?? []}
        projects={projects ?? []}
        embeddingStatus={embeddingStatus}
      />
    </PageLayout>
  );
}
