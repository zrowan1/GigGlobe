// Drizzle database client. Import `db` anywhere you need the database.
//
// A single connection pool (`pg.Pool`) is shared across the app. We keep it on
// `globalThis` in development so Next.js hot-reloads don't open a new pool on
// every change.

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
};

const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

export const db = drizzle(pool, { schema });
