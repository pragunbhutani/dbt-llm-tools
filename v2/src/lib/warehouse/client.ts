export type WarehouseType = "snowflake" | "postgres" | "redshift";

export interface SnowflakeCredentials {
  account: string;
  user: string;
  password: string;
  warehouse: string;
  database: string;
  schema: string;
  role?: string;
}

export interface PostgresCredentials {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

export type WarehouseCredentials = SnowflakeCredentials | PostgresCredentials;

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  truncated: boolean;
}

const MAX_ROWS = 200;

export async function executeWarehouseQuery(
  type: WarehouseType,
  credentials: Record<string, unknown>,
  sql: string
): Promise<QueryResult> {
  switch (type) {
    case "postgres":
    case "redshift":
      return executePostgresQuery(credentials as unknown as PostgresCredentials, sql);
    case "snowflake":
      return executeSnowflakeQuery(credentials as unknown as SnowflakeCredentials, sql);
    default:
      throw new Error(`Unsupported warehouse type: ${type}`);
  }
}

async function executePostgresQuery(
  creds: PostgresCredentials,
  sql: string
): Promise<QueryResult> {
  const { Client } = await import("pg");
  const client = new Client({
    host: creds.host,
    port: creds.port ?? 5432,
    database: creds.database,
    user: creds.user,
    password: creds.password,
    ssl: creds.ssl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
    statement_timeout: 30000,
  });

  await client.connect();
  try {
    const result = await client.query(sql);
    const columns = (result.fields ?? []).map((f) => f.name);
    const allRows = (result.rows ?? []).map((row) => columns.map((col) => row[col]));
    const truncated = allRows.length > MAX_ROWS;

    return {
      columns,
      rows: allRows.slice(0, MAX_ROWS),
      rowCount: allRows.length,
      truncated,
    };
  } finally {
    await client.end();
  }
}

async function executeSnowflakeQuery(
  creds: SnowflakeCredentials,
  sql: string
): Promise<QueryResult> {
  const snowflake = await import("snowflake-sdk");

  const connection = snowflake.default.createConnection({
    account: creds.account,
    username: creds.user,
    password: creds.password,
    warehouse: creds.warehouse,
    database: creds.database,
    schema: creds.schema,
    role: creds.role,
  });

  await new Promise<void>((resolve, reject) => {
    connection.connect((err) => {
      if (err) reject(new Error(`Snowflake connection failed: ${err.message}`));
      else resolve();
    });
  });

  try {
    const rows = await new Promise<Record<string, unknown>[]>((resolve, reject) => {
      connection.execute({
        sqlText: sql,
        complete: (err, _stmt, data) => {
          if (err) reject(new Error(`Query failed: ${err.message}`));
          else resolve((data as Record<string, unknown>[]) ?? []);
        },
      });
    });

    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    const allRows = rows.map((row) => columns.map((col) => row[col]));
    const truncated = allRows.length > MAX_ROWS;

    return {
      columns,
      rows: allRows.slice(0, MAX_ROWS),
      rowCount: allRows.length,
      truncated,
    };
  } finally {
    await new Promise<void>((resolve) => {
      connection.destroy((err) => {
        if (err) console.error("Snowflake disconnect error:", err);
        resolve();
      });
    });
  }
}

export async function testWarehouseConnection(
  type: WarehouseType,
  credentials: Record<string, unknown>
): Promise<{ ok: true }> {
  const testSql =
    type === "snowflake" ? "SELECT CURRENT_TIMESTAMP()" : "SELECT NOW()";
  await executeWarehouseQuery(type, credentials, testSql);
  return { ok: true };
}
