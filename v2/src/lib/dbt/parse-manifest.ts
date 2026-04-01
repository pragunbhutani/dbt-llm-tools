export interface ParsedModel {
  name: string;
  unique_id: string;
  path: string | null;
  schema_name: string | null;
  database_name: string | null;
  materialization: string | null;
  raw_sql: string | null;
  compiled_sql: string | null;
  yml_description: string | null;
  yml_columns: Record<string, unknown> | null;
  tags: string[] | null;
  depends_on: string[];
  all_upstream_models: string[];
  meta: Record<string, unknown> | null;
}

interface ManifestNode {
  resource_type: string;
  name: string;
  path?: string;
  schema?: string;
  database?: string;
  config?: { materialized?: string };
  tags?: string[];
  depends_on?: { nodes?: string[] };
  meta?: Record<string, unknown>;
  raw_code?: string;
  raw_sql?: string;
  compiled_code?: string;
  compiled_sql?: string;
  description?: string;
  columns?: Record<string, { name: string; description?: string; data_type?: string; meta?: unknown }>;
  tests?: unknown;
}

export function parseManifest(manifest: { nodes?: Record<string, ManifestNode> }): ParsedModel[] {
  const nodes = manifest.nodes ?? {};

  // First pass: collect all models and build unique_id → name map
  const uniqueIdToName: Record<string, string> = {};
  const rawModels: Record<string, { node: ManifestNode; parsed: ParsedModel }> = {};

  for (const [uniqueId, node] of Object.entries(nodes)) {
    if (node.resource_type !== "model" || !node.name) continue;
    uniqueIdToName[uniqueId] = node.name;
    rawModels[uniqueId] = {
      node,
      parsed: {
        name: node.name,
        unique_id: uniqueId,
        path: node.path ?? null,
        schema_name: node.schema ?? null,
        database_name: node.database ?? null,
        materialization: node.config?.materialized ?? null,
        raw_sql: node.raw_code ?? node.raw_sql ?? null,
        compiled_sql: node.compiled_code ?? node.compiled_sql ?? null,
        yml_description: node.description ?? null,
        yml_columns: node.columns ? normaliseColumns(node.columns) : null,
        tags: node.tags ?? null,
        depends_on: [],
        all_upstream_models: [],
        meta: node.meta ?? null,
      },
    };
  }

  // Second pass: resolve direct depends_on to model names
  for (const [uniqueId, { node, parsed }] of Object.entries(rawModels)) {
    const rawDeps = node.depends_on?.nodes ?? [];
    const deps: string[] = [];
    for (const depId of rawDeps) {
      if (depId.startsWith("model.")) {
        const depName = uniqueIdToName[depId];
        if (depName) deps.push(depName);
      }
    }
    parsed.depends_on = [...new Set(deps)];
    void uniqueId;
  }

  // Third pass: compute all_upstream_models recursively
  const memo: Record<string, string[]> = {};
  const nameToUniqueId: Record<string, string> = {};
  for (const [uid, name] of Object.entries(uniqueIdToName)) {
    nameToUniqueId[name] = uid;
  }

  function allUpstream(uniqueId: string, visited = new Set<string>()): string[] {
    if (memo[uniqueId]) return memo[uniqueId];
    if (visited.has(uniqueId)) return [];
    visited.add(uniqueId);

    const model = rawModels[uniqueId];
    if (!model) return [];

    const result = new Set<string>();
    for (const depName of model.parsed.depends_on) {
      result.add(depName);
      const depId = nameToUniqueId[depName];
      if (depId) {
        for (const u of allUpstream(depId, visited)) result.add(u);
      }
    }
    memo[uniqueId] = [...result];
    return memo[uniqueId];
  }

  for (const uniqueId of Object.keys(rawModels)) {
    rawModels[uniqueId].parsed.all_upstream_models = allUpstream(uniqueId);
  }

  return Object.values(rawModels).map((m) => m.parsed);
}

function normaliseColumns(
  columns: Record<string, { name: string; description?: string; data_type?: string; meta?: unknown }>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(columns)) {
    out[k] = { name: v.name, description: v.description ?? "", data_type: v.data_type ?? null, meta: v.meta ?? null };
  }
  return out;
}
