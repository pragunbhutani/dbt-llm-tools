import { embed, embedMany } from "ai";
import { getEmbeddingModel } from "./providers";

export async function embedText(text: string, apiKey?: string | null): Promise<number[]> {
  const { embedding } = await embed({
    model: getEmbeddingModel(apiKey),
    value: text,
  });
  return embedding;
}

export async function embedTexts(texts: string[], apiKey?: string | null): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: getEmbeddingModel(apiKey),
    values: texts,
  });
  return embeddings;
}

export function buildModelDocument(model: {
  name: string;
  path?: string | null;
  schema_name?: string | null;
  database_name?: string | null;
  yml_description?: string | null;
  interpreted_description?: string | null;
  yml_columns?: unknown;
  interpreted_columns?: unknown;
  depends_on?: string[] | null;
  tags?: string[] | null;
  raw_sql?: string | null;
  compiled_sql?: string | null;
}): string {
  const lines: string[] = [];

  lines.push(`Model: ${model.name}`);

  if (model.path) lines.push(`Path: ${model.path}`);

  if (model.schema_name) {
    const fullName = [model.database_name, model.schema_name, model.name]
      .filter(Boolean)
      .join(".");
    lines.push(`Table: ${fullName}`);
  }

  if (model.depends_on?.length) {
    lines.push(`Depends on: ${model.depends_on.join(", ")}`);
  }

  if (model.tags?.length) lines.push(`Tags: ${model.tags.join(", ")}`);

  const description = model.interpreted_description ?? model.yml_description;
  if (description) lines.push(`\nDescription: ${description}`);

  // YML columns
  if (model.yml_columns && typeof model.yml_columns === "object") {
    const cols = model.yml_columns as Record<string, unknown> | unknown[];
    const colLines: string[] = [];
    if (Array.isArray(cols)) {
      for (const col of cols) {
        if (col && typeof col === "object") {
          const c = col as Record<string, unknown>;
          if (c.name) colLines.push(`  - ${c.name}: ${c.description ?? "N/A"}`);
        }
      }
    } else {
      for (const [name, data] of Object.entries(cols)) {
        const desc = data && typeof data === "object"
          ? ((data as Record<string, unknown>).description ?? "N/A")
          : "N/A";
        colLines.push(`  - ${name}: ${desc}`);
      }
    }
    if (colLines.length) lines.push(`\nYML Columns:\n${colLines.join("\n")}`);
  }

  // Interpreted columns (AI-generated, highest signal)
  if (model.interpreted_columns && typeof model.interpreted_columns === "object" && !Array.isArray(model.interpreted_columns)) {
    const colLines = Object.entries(model.interpreted_columns as Record<string, unknown>).map(
      ([name, desc]) => `  - ${name}: ${desc ?? "N/A"}`
    );
    if (colLines.length) lines.push(`\nInterpreted Columns:\n${colLines.join("\n")}`);
  }

  // SQL (compiled preferred over raw)
  const sql = model.compiled_sql ?? model.raw_sql;
  if (sql) lines.push(`\nSQL:\n\`\`\`sql\n${sql}\n\`\`\``);

  return lines.join("\n");
}
