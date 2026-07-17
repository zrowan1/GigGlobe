// Drizzle database client. Import `db` anywhere you need the database.
//
// A single connection pool (`pg.Pool`) is shared across the app. We keep it on
// `globalThis` in development so Next.js hot-reloads don't open a new pool on
// every change.

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

// Where to connect. Prefer a full DATABASE_URL when it's set (local dev, the
// build-from-source compose). Otherwise assemble the connection string from the
// discrete POSTGRES_* variables — this lets the pre-built-image compose (ZimaOS)
// set the password in a single place instead of also hand-building a URL.
export function resolveConnectionString(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const host = process.env.POSTGRES_HOST ?? "localhost";
  const port = process.env.POSTGRES_PORT ?? "5432";
  const user = process.env.POSTGRES_USER ?? "gigglobe";
  const password = process.env.POSTGRES_PASSWORD ?? "";
  const database = process.env.POSTGRES_DB ?? "gigglobe";
  // Percent-encode the password so special characters (e.g. from `openssl rand`)
  // can't break the URL.
  return `postgres://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
};

const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: resolveConnectionString(),
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

export const db = drizzle(pool, { schema });
