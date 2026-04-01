import { createAdminClient } from "@/lib/supabase/admin";
import { embedTexts, buildModelDocument } from "@/lib/ai/embeddings";

export type EmbedModelRow = {
  id: string;
  name: string;
  path: string | null;
  schema_name: string | null;
  database_name: string | null;
  yml_description: string | null;
  interpreted_description: string | null;
  yml_columns: unknown;
  interpreted_columns: unknown;
  depends_on: string[] | null;
  tags: string[] | null;
  raw_sql: string | null;
  compiled_sql: string | null;
  dbt_project_id: string | null;
};

const MODEL_FIELDS = "id, name, path, schema_name, database_name, yml_description, interpreted_description, yml_columns, interpreted_columns, depends_on, tags, raw_sql, compiled_sql, dbt_project_id";

export async function fetchOpenAiKey(orgId: string): Promise<string | null> {
  "use step";
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("organisation_settings")
    .select("llm_openai_api_key_path")
    .eq("organisation_id", orgId)
    .single();
  return data?.llm_openai_api_key_path ?? null;
}

export async function fetchModelsForEmbed(modelIds: string[], orgId: string): Promise<EmbedModelRow[]> {
  "use step";
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("dbt_models")
    .select(MODEL_FIELDS)
    .in("id", modelIds)
    .eq("organisation_id", orgId);
  return (data ?? []) as EmbedModelRow[];
}

export async function fetchProjectModelsForEmbed(projectId: string, orgId: string): Promise<EmbedModelRow[]> {
  "use step";
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("dbt_models")
    .select(MODEL_FIELDS)
    .eq("dbt_project_id", projectId)
    .eq("organisation_id", orgId);
  return (data ?? []) as EmbedModelRow[];
}

export async function embedAndUpsertBatch(
  models: EmbedModelRow[],
  orgId: string,
  openaiApiKey: string
): Promise<number> {
  "use step";
  if (!models.length) return 0;

  const docs = models.map(buildModelDocument);
  const embeddings = await embedTexts(docs, openaiApiKey);

  const rows = models.map((model, j) => ({
    organisation_id: orgId,
    dbt_project_id: model.dbt_project_id,
    model_id: model.id,
    document_text: docs[j],
    embedding: JSON.stringify(embeddings[j]),
    can_be_used_for_answers: true,
    is_processing: false,
  }));

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("model_embeddings")
    .upsert(rows, { onConflict: "model_id" });

  if (error) throw new Error(error.message);
  return models.length;
}

export async function markProjectSynced(projectId: string, orgId: string): Promise<void> {
  "use step";
  const supabase = createAdminClient();
  await supabase
    .from("dbt_projects")
    .update({ status: "synced", last_synced_at: new Date().toISOString() })
    .eq("id", projectId)
    .eq("organisation_id", orgId);
}
