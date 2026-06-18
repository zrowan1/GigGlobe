// Create (or update) the login account. Run it like:
//
//   npm run seed -- jij@voorbeeld.nl jouw-wachtwoord
//
// It hashes the password with bcrypt and stores one row in the `users` table.
// Re-running with the same email just resets that user's password.

import { readFileSync } from "node:fs";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

// Load .env.local into process.env BEFORE importing the db client (the db
// client reads DATABASE_URL at construction time). A tiny parser keeps this
// dependency-free.
function loadEnv(file: string) {
  try {
    const content = readFileSync(file, "utf8");
    for (const line of content.split("\n")) {
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
    // No .env.local — rely on the ambient environment (e.g. inside Docker).
  }
}

async function main() {
  // .env.local takes precedence over .env (Next.js convention; first-set wins).
  loadEnv(".env.local");
  loadEnv(".env");

  const email = (process.argv[2] ?? process.env.SEED_EMAIL ?? "")
    .trim()
    .toLowerCase();
  const password = process.argv[3] ?? process.env.SEED_PASSWORD ?? "";

  if (!email || !password) {
    console.error("Usage: npm run seed -- <email> <password>");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set (check .env.local).");
    process.exit(1);
  }

  // Import after env is loaded so the pool gets the right connection string.
  const { db } = await import("@/lib/db");
  const { users } = await import("@/lib/db/schema");

  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length) {
    await db.update(users).set({ passwordHash }).where(eq(users.email, email));
    console.log(`Updated password for ${email}.`);
  } else {
    await db.insert(users).values({ email, passwordHash });
    console.log(`Created user ${email}.`);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
