import yaml from "js-yaml";
import type { ParsedModel } from "./parse-manifest";

const RE_REF = /\{\{[\s]*ref[\s]*\([\s]*['"]([^'"]+)['"][\s]*\)[\s]*\}\}/gi;
const RE_CONFIG_MATERIALIZED = /\{\{[\s]*config[\s]*\([\s]*materialized[\s]*=[\s]*['"](\w+)['"]/i;
const RE_COMMENT_DESC = /--[\s]*description:[\s]*(.*?)(?:\n|$)/;
const RE_COMMENT_COL = /--[\s]*column:[\s]*(\w+)[\s]+description:[\s]*(.*?)(?:\n|$)/g;

interface GithubTreeItem {
  path: string;
  type: string;
  sha: string;
}

interface YamlModelDef {
  name?: string;
  description?: string;
  columns?: Array<{ name?: string; description?: string; data_type?: string; meta?: unknown; tests?: unknown }>;
  tags?: string[];
  meta?: Record<string, unknown>;
  tests?: unknown[];
}

interface YamlFile {
  models?: YamlModelDef[];
}

async function githubFetch(url: string, token: string) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) throw new Error(`GitHub API error ${res.status}: ${url}`);
  return res.json();
}

function parseRepoUrl(url: string): { owner: string; repo: string } {
  const match = url.replace(/\.git$/, "").match(/github\.com[:/]([^/]+)\/([^/]+)$/);
  if (!match) throw new Error(`Cannot parse GitHub URL: ${url}`);
  return { owner: match[1], repo: match[2] };
}

function decodeBase64(content: string): string {
  return Buffer.from(content.replace(/\s/g, ""), "base64").toString("utf-8");
}

function extractRefs(sql: string): string[] {
  const refs = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(RE_REF.source, "gi");
  while ((m = re.exec(sql)) !== null) refs.add(m[1]);
  return [...refs];
}

function extractMaterialization(sql: string): string | null {
  const m = RE_CONFIG_MATERIALIZED.exec(sql);
  return m ? m[1] : null;
}

function extractDescriptionFromSql(sql: string): string {
  const m = RE_COMMENT_DESC.exec(sql);
  return m ? m[1].trim() : "";
}

function extractColumnsFromSql(sql: string): Record<string, unknown> {
  const cols: Record<string, unknown> = {};
  let m: RegExpExecArray | null;
  const re = new RegExp(RE_COMMENT_COL.source, "g");
  while ((m = re.exec(sql)) !== null) {
    cols[m[1]] = { name: m[1], description: m[2].trim() };
  }
  return cols;
}

function calculateAllUpstream(models: Record<string, ParsedModel>): void {
  const memo: Record<string, string[]> = {};

  function upstream(name: string, visited = new Set<string>()): string[] {
    if (memo[name]) return memo[name];
    if (visited.has(name) || !models[name]) return [];
    visited.add(name);
    const result = new Set<string>();
    for (const dep of models[name].depends_on) {
      result.add(dep);
      for (const u of upstream(dep, visited)) result.add(u);
    }
    memo[name] = [...result];
    return memo[name];
  }

  for (const name of Object.keys(models)) {
    models[name].all_upstream_models = upstream(name);
  }
}

export async function fetchAndParseGithubProject(
  repoUrl: string,
  branch: string,
  projectFolder: string | null,
  accessToken: string
): Promise<ParsedModel[]> {
  const { owner, repo } = parseRepoUrl(repoUrl);
  const baseApi = `https://api.github.com/repos/${owner}/${repo}`;

  // Get the full recursive tree for the branch
  const treeData = await githubFetch(`${baseApi}/git/trees/${branch}?recursive=1`, accessToken) as {
    tree: GithubTreeItem[];
    truncated: boolean;
  };

  const prefix = projectFolder ? projectFolder.replace(/\/$/, "") + "/" : "";
  const modelsPrefix = `${prefix}models/`;

  // Filter to only files inside the models directory
  const modelFiles = treeData.tree.filter(
    (item) => item.type === "blob" && item.path.startsWith(modelsPrefix)
  );

  const ymlFiles = modelFiles.filter((f) => f.path.endsWith(".yml") || f.path.endsWith(".yaml"));
  const sqlFiles = modelFiles.filter((f) => f.path.endsWith(".sql"));

  const parsedModels: Record<string, ParsedModel> = {};

  // Fetch and parse YAML files (model descriptions + columns)
  await Promise.all(
    ymlFiles.map(async (file) => {
      const data = await githubFetch(`${baseApi}/contents/${file.path}?ref=${branch}`, accessToken) as {
        content: string;
      };
      const text = decodeBase64(data.content);
      let doc: YamlFile;
      try {
        doc = yaml.load(text) as YamlFile;
      } catch {
        return;
      }
      if (!doc?.models) return;

      for (const modelDef of doc.models) {
        if (!modelDef?.name) continue;
        const columns: Record<string, unknown> = {};
        if (Array.isArray(modelDef.columns)) {
          for (const col of modelDef.columns) {
            if (col?.name) {
              columns[col.name] = {
                name: col.name,
                description: col.description ?? "",
                data_type: col.data_type ?? null,
                meta: col.meta ?? null,
              };
            }
          }
        }
        parsedModels[modelDef.name] = {
          name: modelDef.name,
          unique_id: null as unknown as string,
          path: null,
          schema_name: null,
          database_name: null,
          materialization: null,
          raw_sql: null,
          compiled_sql: null,
          yml_description: modelDef.description ?? null,
          yml_columns: Object.keys(columns).length > 0 ? columns : null,
          tags: modelDef.tags ?? null,
          depends_on: [],
          all_upstream_models: [],
          meta: modelDef.meta ?? null,
        };
      }
    })
  );

  // Fetch and parse SQL files (raw SQL, refs, materialization)
  await Promise.all(
    sqlFiles.map(async (file) => {
      const modelName = file.path.split("/").pop()!.replace(/\.sql$/, "");
      const data = await githubFetch(`${baseApi}/contents/${file.path}?ref=${branch}`, accessToken) as {
        content: string;
      };
      const sql = decodeBase64(data.content);

      const existing = parsedModels[modelName] ?? {
        name: modelName,
        unique_id: null as unknown as string,
        path: null,
        schema_name: null,
        database_name: null,
        materialization: null,
        raw_sql: null,
        compiled_sql: null,
        yml_description: null,
        yml_columns: null,
        tags: null,
        depends_on: [],
        all_upstream_models: [],
        meta: null,
      };

      existing.path = file.path.replace(prefix, "") || null;
      existing.raw_sql = sql;
      if (!existing.materialization) existing.materialization = extractMaterialization(sql);
      if (!existing.yml_description) existing.yml_description = extractDescriptionFromSql(sql) || null;
      if (!existing.yml_columns) {
        const cols = extractColumnsFromSql(sql);
        existing.yml_columns = Object.keys(cols).length > 0 ? cols : null;
      }

      const sqlDeps = extractRefs(sql);
      existing.depends_on = [...new Set([...existing.depends_on, ...sqlDeps])];
      parsedModels[modelName] = existing;
    })
  );

  calculateAllUpstream(parsedModels);
  return Object.values(parsedModels);
}
