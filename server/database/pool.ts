import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
import { getServerEnv } from '../config/env.ts';

export class DatabaseUnavailableError extends Error {
  readonly code = 'DATABASE_UNAVAILABLE';
  readonly statusCode = 503;

  constructor(message: string) {
    super(message);
    this.name = 'DatabaseUnavailableError';
  }
}

let singletonPool: Pool | null = null;

function shouldUseSsl(connectionString: string, isProduction: boolean): boolean | { rejectUnauthorized: boolean } {
  const lower = connectionString.toLowerCase();
  if (lower.includes('sslmode=disable') || lower.includes('localhost') || lower.includes('127.0.0.1')) {
    return false;
  }
  if (
    lower.includes('supabase.co') ||
    lower.includes('supabase.com') ||
    lower.includes('neon.tech') ||
    lower.includes('sslmode=require') ||
    isProduction
  ) {
    return { rejectUnauthorized: false };
  }
  return false;
}

export function getPool(): Pool {
  const env = getServerEnv();
  if (!env.databaseUrl) {
    throw new DatabaseUnavailableError(
      'DATABASE_URL n’est pas configuré. Configurez votre base Supabase PostgreSQL dans les variables d’environnement.'
    );
  }

  if (!singletonPool) {
    singletonPool = new Pool({
      connectionString: env.databaseUrl,
      max: env.isVercel ? 5 : 10,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 8_000,
      ssl: shouldUseSsl(env.databaseUrl, env.isProduction),
    });

    singletonPool.on('error', (err) => {
      console.error('[PostgreSQL Pool Error]', err.message);
    });
  }

  return singletonPool;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(getServerEnv().databaseUrl);
}

export async function closePool(): Promise<void> {
  if (singletonPool) {
    await singletonPool.end();
    singletonPool = null;
  }
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
  clinicId?: string
): Promise<QueryResult<T>> {
  const pool = getPool();
  if (!clinicId) {
    return pool.query<T>(text, params);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.clinic_id', $1, true)", [clinicId]);
    const res = await client.query<T>(text, params);
    await client.query('COMMIT');
    return res;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
  clinicId?: string
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (clinicId) {
      await client.query("SELECT set_config('app.clinic_id', $1, true)", [clinicId]);
    }
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function checkPostgresHealth(): Promise<{
  connected: boolean;
  configured: boolean;
  latencyMs?: number;
  error?: string;
}> {
  const env = getServerEnv();
  if (!env.databaseUrl) {
    return {
      connected: false,
      configured: false,
      error: 'DATABASE_URL not configured',
    };
  }

  const start = Date.now();
  try {
    const pool = getPool();
    await pool.query('SELECT 1');
    return {
      connected: true,
      configured: true,
      latencyMs: Date.now() - start,
    };
  } catch (err: any) {
    return {
      connected: false,
      configured: true,
      latencyMs: Date.now() - start,
      error: err?.message || 'Unknown PostgreSQL error',
    };
  }
}
