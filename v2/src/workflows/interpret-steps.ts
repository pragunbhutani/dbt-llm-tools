import { createAdminClient } from "@/lib/supabase/admin";
import { getLLMModel } from "@/lib/ai/providers";
import { generateObject } from "ai";
import { z } from "zod";

const InterpretationSchema = z.object({
  description: z.string().describe("1-2 sentence description of the model's business purpose"),
  columns: z.array(
    z.object({
      name: z.string(),
      description: z.string().describe("Concise description of the column's business meaning"),
    })
  ).describe("All columns output by the model's final SELECT statement"),
});

export type OrgSettings = {
  llm_chat_provider: string | null;
  llm_chat_model: string | null;
  llm_openai_api_key_path: string | null;
  llm_anthropic_api_key_path: string | null;
  llm_google_api_key_path: string | null;
};

export type ModelRow = {
  id: string;
  name: string;
  path: string | null;
  schema_name: string | null;
  database_name: string | null;
  materialization: string | null;
  raw_sql: string | null;
  compiled_sql: string | null;
  depends_on: string[] | null;
};

export type UpstreamModel = {
  name: string;
  path: string | null;
  raw_sql: string | null;
  yml_description: string | null;
  interpreted_description: string | null;
};

export async function fetchOrgSettings(orgId: string): Promise<OrgSettings> {
  "use step";
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("organisation_settings")
    .select("llm_chat_provider, llm_chat_model, llm_openai_api_key_path, llm_anthropic_api_key_path, llm_google_api_key_path")
    .eq("organisation_id", orgId)
    .single();
  return {
    llm_chat_provider: data?.llm_chat_provider ?? null,
    llm_chat_model: data?.llm_chat_model ?? null,
    llm_openai_api_key_path: data?.llm_openai_api_key_path ?? null,
    llm_anthropic_api_key_path: data?.llm_anthropic_api_key_path ?? null,
    llm_google_api_key_path: data?.llm_google_api_key_path ?? null,
  };
}

export async function fetchModel(modelId: string, orgId: string): Promise<ModelRow | null> {
  "use step";
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("dbt_models")
    .select("id, name, path, schema_name, database_name, materialization, raw_sql, compiled_sql, depends_on")
    .eq("id", modelId)
    .eq("organisation_id", orgId)
    .single();
  return data ?? null;
}

export async function fetchModelsByIds(modelIds: string[], orgId: string): Promise<ModelRow[]> {
  "use step";
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("dbt_models")
    .select("id, name, path, schema_name, database_name, materialization, raw_sql, compiled_sql, depends_on")
    .in("id", modelIds)
    .eq("organisation_id", orgId);
  return data ?? [];
}

export async function fetchModelsByProject(projectId: string, orgId: string): Promise<ModelRow[]> {
  "use step";
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("dbt_models")
    .select("id, name, path, schema_name, database_name, materialization, raw_sql, compiled_sql, depends_on")
    .eq("dbt_project_id", projectId)
    .eq("organisation_id", orgId);
  return data ?? [];
}

export async function fetchUpstreamModels(upstreamNames: string[], orgId: string): Promise<UpstreamModel[]> {
  "use step";
  if (!upstreamNames.length) return [];
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("dbt_models")
    .select("name, path, raw_sql, yml_description, interpreted_description")
    .in("name", upstreamNames)
    .eq("organisation_id", orgId);
  return data ?? [];
}

export async function interpretModelWithLLM(
  model: ModelRow,
  upstreamModels: UpstreamModel[],
  settings: OrgSettings
): Promise<{ description: string; columns: Record<string, string> }> {
  "use step";

  const llmModel = getLLMModel(
    settings.llm_chat_provider,
    settings.llm_chat_model,
    {
      openai: settings.llm_openai_api_key_path,
      anthropic: settings.llm_anthropic_api_key_path,
      google: settings.llm_google_api_key_path,
    }
  );

  const sql = model.compiled_sql ?? model.raw_sql;
  if (!sql) throw new Error(`Model ${model.name} has no SQL`);

  let upstreamSection = "";
  if (upstreamModels.length > 0) {
    upstreamSection = "\n\n**Upstream Models (Dependencies):**\n";
    upstreamModels.forEach((u, i) => {
      upstreamSection += `\n${i + 1}. **${u.name}** (Path: ${u.path ?? "N/A"})\n`;
      const desc = u.interpreted_description ?? u.yml_description;
      if (desc) upstreamSection += `   Description: ${desc}\n`;
      if (u.raw_sql) upstreamSection += `   SQL:\n   \`\`\`sql\n${u.raw_sql}\n   \`\`\`\n`;
    });
  }

  const prompt = `You are an expert dbt model interpreter. Analyze the provided dbt model and generate CONCISE documentation suitable for dbt YAML files.

**Target Model: ${model.name}**
Path: ${model.path ?? "N/A"}
Schema: ${model.schema_name ?? "N/A"}
Database: ${model.database_name ?? "N/A"}
Materialization: ${model.materialization ?? "N/A"}

**Target Model SQL:**
\`\`\`sql
${sql}
\`\`\`
${upstreamSection}

**Requirements:**
- Generate concise descriptions suitable for dbt documentation
- Focus on the business purpose and meaning of each column
- Consider the upstream model context to understand data lineage
- Only document columns that are actually output by the final SELECT statement
- Use clear, professional language appropriate for technical documentation`;

  const { object } = await generateObject({ model: llmModel, schema: InterpretationSchema, prompt });

  return {
    description: object.description,
    columns: Object.fromEntries(object.columns.map((c) => [c.name, c.description])),
  };
}

export async function saveInterpretation(
  modelId: string,
  orgId: string,
  description: string,
  columns: Record<string, string>
): Promise<void> {
  "use step";
  const supabase = createAdminClient();
  await supabase
    .from("dbt_models")
    .update({ interpreted_description: description, interpreted_columns: columns })
    .eq("id", modelId)
    .eq("organisation_id", orgId);
}
