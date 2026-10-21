import 'dotenv/config';
import mysql, { type Pool } from 'mysql2/promise';
import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../db/schema';

let pool: Pool | undefined;
let database: MySql2Database<typeof schema> | undefined;

/** Lazily creates the database pool; import alone has no network side effects. */
export function getDb(): MySql2Database<typeof schema> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required for MySQL-backed operations.');
  if (!pool) pool = mysql.createPool(url);
  if (!database) database = drizzle(pool, { schema, mode: 'default' });
  return database;
}

export async function closeDb(): Promise<void> {
  if (pool) {
    const activePool = pool;
    pool = undefined;
    database = undefined;
    await activePool.end();
  }
}
