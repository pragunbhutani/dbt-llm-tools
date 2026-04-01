export interface MetabaseCollection {
  id: number | "root";
  name: string;
  location: string | null;
  slug: string;
}

export interface MetabaseDatabase {
  id: number;
  name: string;
  engine: string;
}

export interface MetabaseQuestion {
  id: number;
  name: string;
  description: string | null;
  collection_id: number | null;
  dataset_query: {
    type: string;
    native?: { query: string };
    database: number;
  };
}

export class MetabaseClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(url: string, apiKey: string) {
    this.baseUrl = url.replace(/\/$/, "");
    this.apiKey = apiKey;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        ...options.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Metabase API ${res.status}: ${body}`);
    }

    return res.json() as Promise<T>;
  }

  async testConnection(): Promise<{ ok: true; databases: number }> {
    const data = await this.request<{ data: MetabaseDatabase[] }>("/api/database");
    return { ok: true, databases: data.data.length };
  }

  async listCollections(): Promise<MetabaseCollection[]> {
    return this.request<MetabaseCollection[]>("/api/collection");
  }

  async createCollection(name: string, parentId?: number | "root"): Promise<MetabaseCollection> {
    return this.request<MetabaseCollection>("/api/collection", {
      method: "POST",
      body: JSON.stringify({
        name,
        parent_id: parentId ?? "root",
        color: "#509EE3",
      }),
    });
  }

  async getOrCreateCollectionByPath(pathParts: string[]): Promise<number | "root"> {
    if (pathParts.length === 0) return "root";

    const existing = await this.listCollections();
    const byName = new Map(existing.map((c) => [c.name.toLowerCase(), c]));

    let parentId: number | "root" = "root";

    for (const part of pathParts) {
      const found = byName.get(part.toLowerCase());
      if (found && typeof found.id === "number") {
        parentId = found.id;
      } else {
        const created = await this.createCollection(part, parentId);
        parentId = created.id as number;
        byName.set(part.toLowerCase(), created);
      }
    }

    return parentId;
  }

  async createNativeQuestion(
    name: string,
    sql: string,
    databaseId: number,
    collectionId?: number | "root",
    description?: string
  ): Promise<MetabaseQuestion> {
    return this.request<MetabaseQuestion>("/api/card", {
      method: "POST",
      body: JSON.stringify({
        name,
        description: description ?? null,
        collection_id: collectionId === "root" || collectionId === undefined ? null : collectionId,
        display: "table",
        visualization_settings: {},
        dataset_query: {
          type: "native",
          native: {
            query: sql,
            "template-tags": {},
          },
          database: databaseId,
        },
      }),
    });
  }
}
