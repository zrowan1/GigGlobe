import { readFileSync } from "node:fs";

import { defineConfig } from "drizzle-kit";

// Load .env.local into process.env. Next.js does this automatically for the
// app, but drizzle-kit (run from the CLI) does not — so we read it here to get
// DATABASE_URL. Dependency-free mini-parser; ambient env vars win.
function loadEnv(file: string) {
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const key = match[1];
      let value = match[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // No .env.local — rely on the ambient environment.
  }
}

// .env.local takes precedence over .env (Next.js convention; first-set wins).
loadEnv(".env.local");
loadEnv(".env");

// Config for drizzle-kit (the migration tool). It reads the schema and writes
// SQL migration files to ./drizzle. Run `npm run db:generate` after changing
// the schema, then `npm run db:migrate` to apply them to the database.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
