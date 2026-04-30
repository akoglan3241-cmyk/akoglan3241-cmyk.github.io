import { Pool, type PoolClient, type PoolConfig, type QueryResult } from "pg";

const DEFAULT_POOL_CONFIG: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PG_POOL_MAX ?? 10),
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS ?? 30000),
  ssl: process.env.PG_SSL === "true" ? { rejectUnauthorized: false } : undefined,
};

let pool: Pool | null = null;

export function isDatabaseConfigured(): boolean {
  return Boolean(DEFAULT_POOL_CONFIG.connectionString);
}

export function getDbPool(): Pool {
  if (!pool) {
    if (!isDatabaseConfigured()) {
      throw new Error("DATABASE_URL is required for PostgreSQL persistence.");
    }

    pool = new Pool(DEFAULT_POOL_CONFIG);
  }

  return pool;
}

export async function queryDb<T = unknown>(text: string, params: unknown[] = []): Promise<QueryResult<T>> {
  return getDbPool().query<T>(text, params);
}

export async function withDbTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getDbPool().connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function closeDbPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
