import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    // Exclusively use Supabase PostgreSQL Database
    const connectionString = 
      process.env.DATABASE_URL || 
      process.env.SUPABASE_DB_URL || 
      process.env.POSTGRES_URL ||
      'postgresql://postgres:ckrIiQDXxSBmPWfI@db.nhvmbzhpcaaqfjgnkdrd.supabase.co:5432/postgres';

    console.log('[Database] Using Supabase PostgreSQL Database (Cloud SQL disabled / stopped)');
    global._postgresPool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      },
      max: 10,
      connectionTimeoutMillis: 15000,
    });

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on Supabase pool client:', err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();
export const db = drizzle(pool, { schema });
