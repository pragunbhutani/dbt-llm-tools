import { createAdminClient } from "../supabase/admin";
import { embedText } from "../ai/embeddings";

export async function searchModels(orgId: string, query: string, limit: number, openaiApiKey?: string | null) {
  const supabase = createAdminClient();
  const queryEmbedding = await embedText(query, openaiApiKey);

  const { data, error } = await supabase.rpc("search_models", {
    query_embedding: JSON.stringify(queryEmbedding),
    org_id: orgId,
    match_count: limit,
    similarity_threshold: 0.3,
  });

  if (error) throw new Error(`Model search failed: ${error.message}`);

  return (data ?? []).map((row: {
    model_id: string;
    model_name: string;
    document_text: string;
    similarity: number;
  }) => ({
    id: row.model_id,
    name: row.model_name,
    similarity: Math.round(row.similarity * 100) / 100,
    summary: row.document_text,
  }));
}

export async function fetchModelDetails(orgId: string, model_names: string[]) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("dbt_models")
    .select(
      "id, name, schema_name, database_name, materialization, raw_sql, compiled_sql, yml_description, interpreted_description, yml_columns, interpreted_columns, tags, depends_on"
    )
    .eq("organisation_id", orgId)
    .in("name", model_names);

  if (error) throw new Error(`Failed to fetch model details: ${error.message}`);

  return (data ?? []).map((m) => ({
    name: m.name,
    full_table_name: [m.database_name, m.schema_name, m.name].filter(Boolean).join("."),
    materialization: m.materialization,
    description: m.interpreted_description ?? m.yml_description,
    columns: m.interpreted_columns ?? m.yml_columns,
    sql: m.compiled_sql ?? m.raw_sql,
    tags: m.tags,
    depends_on: m.depends_on,
  }));
}
