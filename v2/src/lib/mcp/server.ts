import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { embedText } from "@/lib/ai/embeddings";

export function createMcpServer(orgId: string): McpServer {
  const server = new McpServer({
    name: "ragstar",
    version: "2.0.0",
  });

  // ── list_dbt_models ──────────────────────────────────────────────────────────
  server.registerTool(
    "list_dbt_models",
    {
      description:
        "List dbt models in the organisation's knowledge base. Supports optional filters.",
      inputSchema: {
        project_name: z
          .string()
          .optional()
          .describe("Filter by dbt project name"),
        schema_name: z
          .string()
          .optional()
          .describe("Filter by schema name"),
        materialization: z
          .enum(["table", "view", "incremental", "ephemeral", "snapshot"])
          .optional()
          .describe("Filter by materialization type"),
        limit: z
          .number()
          .min(1)
          .max(200)
          .default(50)
          .describe("Maximum number of models to return"),
      },
    },
    async ({ project_name, schema_name, materialization, limit }) => {
      const supabase = createAdminClient();

      let query = supabase
        .from("dbt_models")
        .select(
          "name, path, schema_name, database_name, materialization, tags, yml_description, interpreted_description, dbt_projects(name)"
        )
        .eq("organisation_id", orgId)
        .limit(limit ?? 50)
        .order("name");

      if (schema_name) query = query.eq("schema_name", schema_name);
      if (materialization) query = query.eq("materialization", materialization);

      const { data, error } = await query;
      if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };

      let models = data ?? [];

      if (project_name) {
        models = models.filter(
          (m) =>
            (m.dbt_projects as { name: string } | null)?.name === project_name
        );
      }

      const rows = models.map((m) => ({
        name: m.name,
        project: (m.dbt_projects as { name: string } | null)?.name,
        schema: m.schema_name,
        database: m.database_name,
        materialization: m.materialization,
        tags: m.tags,
        description: m.interpreted_description ?? m.yml_description,
      }));

      return {
        content: [
          {
            type: "text",
            text: `Found ${rows.length} models.\n\n${JSON.stringify(rows, null, 2)}`,
          },
        ],
      };
    }
  );

  // ── search_dbt_models ────────────────────────────────────────────────────────
  server.registerTool(
    "search_dbt_models",
    {
      description:
        "Semantically search for dbt models by natural language query. Returns the most relevant models.",
      inputSchema: {
        query: z.string().describe("Natural language description of the data you are looking for"),
        limit: z
          .number()
          .min(1)
          .max(20)
          .default(5)
          .describe("Number of results to return"),
        similarity_threshold: z
          .number()
          .min(0)
          .max(1)
          .default(0.3)
          .describe("Minimum similarity score (0-1)"),
      },
    },
    async ({ query, limit, similarity_threshold }) => {
      const supabase = createAdminClient();

      const queryEmbedding = await embedText(query);

      const { data, error } = await supabase.rpc("search_models", {
        query_embedding: JSON.stringify(queryEmbedding),
        org_id: orgId,
        match_count: limit ?? 5,
        similarity_threshold: similarity_threshold ?? 0.3,
      });

      if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };

      const results = (data ?? []).map((row: {
        model_id: string;
        model_name: string;
        document_text: string;
        similarity: number;
      }) => ({
        name: row.model_name,
        similarity: Math.round(row.similarity * 100) / 100,
        summary: row.document_text,
      }));

      return {
        content: [
          {
            type: "text",
            text: `Found ${results.length} relevant models.\n\n${JSON.stringify(results, null, 2)}`,
          },
        ],
      };
    }
  );

  // ── get_model_details ────────────────────────────────────────────────────────
  server.registerTool(
    "get_model_details",
    {
      description:
        "Get full details for one or more dbt models by name, including SQL, columns, and lineage.",
      inputSchema: {
        model_names: z
          .array(z.string())
          .min(1)
          .max(10)
          .describe("List of model names to retrieve"),
        include_sql: z
          .boolean()
          .default(true)
          .describe("Whether to include the model SQL"),
        include_lineage: z
          .boolean()
          .default(false)
          .describe("Whether to include upstream dependencies"),
      },
    },
    async ({ model_names, include_sql, include_lineage }) => {
      const supabase = createAdminClient();

      const { data, error } = await supabase
        .from("dbt_models")
        .select(
          "name, unique_id, path, schema_name, database_name, materialization, yml_description, interpreted_description, yml_columns, interpreted_columns, tags, meta, raw_sql, compiled_sql, depends_on, all_upstream_models, created_at, updated_at, dbt_projects(name)"
        )
        .eq("organisation_id", orgId)
        .in("name", model_names);

      if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };

      const models = (data ?? []).map((m) => ({
        name: m.name,
        unique_id: m.unique_id,
        project: (m.dbt_projects as { name: string } | null)?.name,
        path: m.path,
        schema: m.schema_name,
        database: m.database_name,
        materialization: m.materialization,
        description: m.interpreted_description ?? m.yml_description,
        columns: m.interpreted_columns ?? m.yml_columns,
        tags: m.tags,
        meta: m.meta,
        ...(include_sql && { sql: m.compiled_sql ?? m.raw_sql }),
        ...(include_lineage && {
          depends_on: m.depends_on,
          all_upstream_models: m.all_upstream_models,
        }),
        created_at: m.created_at,
        updated_at: m.updated_at,
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(models, null, 2),
          },
        ],
      };
    }
  );

  // ── get_project_summary ──────────────────────────────────────────────────────
  server.registerTool(
    "get_project_summary",
    {
      description:
        "Get a summary of all dbt projects connected to this organisation, including model counts and schemas.",
      inputSchema: {},
    },
    async () => {
      const supabase = createAdminClient();

      const { data: projects, error } = await supabase
        .from("dbt_projects")
        .select("id, name, connection_type, status, last_synced_at, created_at")
        .eq("organisation_id", orgId)
        .order("name");

      if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };

      const summaries = await Promise.all(
        (projects ?? []).map(async (project) => {
          const { count } = await supabase
            .from("dbt_models")
            .select("*", { count: "exact", head: true })
            .eq("dbt_project_id", project.id);

          const { data: schemas } = await supabase
            .from("dbt_models")
            .select("schema_name")
            .eq("dbt_project_id", project.id)
            .not("schema_name", "is", null);

          const uniqueSchemas = [
            ...new Set((schemas ?? []).map((s) => s.schema_name).filter(Boolean)),
          ];

          return {
            name: project.name,
            connection_type: project.connection_type,
            status: project.status,
            model_count: count ?? 0,
            schemas: uniqueSchemas,
            last_synced_at: project.last_synced_at,
          };
        })
      );

      return {
        content: [
          {
            type: "text",
            text: `${summaries.length} project(s) connected.\n\n${JSON.stringify(summaries, null, 2)}`,
          },
        ],
      };
    }
  );

  return server;
}
