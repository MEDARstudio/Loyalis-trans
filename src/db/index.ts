import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | null | undefined;
}

const DEFAULT_SUPABASE_POSTGRES_URL = 'postgresql://postgres:6I5LP3DOxc0zHgBT@db.olahhcegkeqromqdfwnj.supabase.co:5432/postgres';

export const getConnectionString = (): string | null => {
  const conn = 
    process.env.DATABASE_URL || 
    process.env.SUPABASE_DB_URL || 
    process.env.POSTGRES_URL ||
    DEFAULT_SUPABASE_POSTGRES_URL;

  if (conn && conn.trim() !== '') {
    return conn.trim();
  }
  return null;
};

export const createPool = (): Pool | null => {
  const connectionString = getConnectionString();

  if (!connectionString) {
    return null;
  }

  if (!global._postgresPool) {
    try {
      global._postgresPool = new Pool({
        connectionString,
        ssl: {
          rejectUnauthorized: false
        },
        max: 10,
        connectionTimeoutMillis: 10000,
      });

      global._postgresPool.on('error', (err) => {
        console.warn('[Database Pool Warning]:', err.message);
      });
    } catch (err: any) {
      console.warn('[Database Pool Init Error]:', err?.message);
      return null;
    }
  }
  return global._postgresPool;
};

// Resilient Drizzle instance or proxy
const activePool = createPool();
export const db = activePool ? drizzle(activePool, { schema }) : (null as any);
export const isDatabaseConfigured = (): boolean => Boolean(getConnectionString());
