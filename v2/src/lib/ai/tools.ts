import { tool } from "ai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { embedText } from "./embeddings";
import { executeWarehouseQuery } from "@/lib/warehouse/client";
import type { WarehouseType } from "@/lib/warehouse/client";

export function makeSearchModelsTool(orgId: string, openaiApiKey?: string | null) {
  return tool({
    description:
      "Search for dbt models relevant to the user's question using semantic similarity. Use this to find models that may contain the data needed to answer the question. Can be called multiple times with different queries.",
    inputSchema: z.object({
      query: z.string().describe("A natural language description of the data you are looking for"),
      limit: z.number().min(1).max(20).default(5).describe("Number of models to return"),
    }),
    execute: async ({ query, limit }) => {
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
    },
  });
}

export function makeFetchModelDetailsTool(orgId: string) {
  return tool({
    description:
      "Fetch complete details for one or more dbt models by name, including SQL, columns, and full description. Use this after searchModels to get the full schema needed to write accurate SQL.",
    inputSchema: z.object({
      model_names: z
        .array(z.string())
        .min(1)
        .max(10)
        .describe("List of model names to fetch details for"),
    }),
    execute: async ({ model_names }) => {
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
    },
  });
}

export function makeExecuteQueryTool(
  warehouseId: string,
  warehouseType: WarehouseType,
  credentials: Record<string, unknown>
) {
  return tool({
    description:
      "Execute a SQL query against the connected data warehouse and return results. Use this after writing a SQL query to verify it works and show the user actual data. Results are limited to 200 rows.",
    inputSchema: z.object({
      sql: z.string().describe("The SQL query to execute"),
    }),
    execute: async ({ sql }) => {
      void warehouseId;
      try {
        const result = await executeWarehouseQuery(warehouseType, credentials, sql);
        return {
          columns: result.columns,
          rows: result.rows,
          rowCount: result.rowCount,
          truncated: result.truncated,
          message: result.truncated
            ? `Showing first ${result.rows.length} of ${result.rowCount} rows`
            : `${result.rowCount} row${result.rowCount === 1 ? "" : "s"} returned`,
        };
      } catch (err) {
        throw new Error(`Query execution failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  });
}
