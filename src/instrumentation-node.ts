// Node.js-only startup work, imported from instrumentation.ts under the
// NEXT_RUNTIME === "nodejs" guard so `pg` never reaches the Edge bundle.
//
//   1. apply any pending database migrations, and
//   2. on a brand-new (empty) database, create the first login account from
//      ADMIN_EMAIL / ADMIN_PASSWORD.
// This removes the manual `db:migrate` + `seed` steps for the image-based
// (ZimaOS) deploy — you just start the container.

import bcrypt from "bcryptjs";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function setup() {
  try {
    await runMigrations();
    await bootstrapFirstUser();
  } catch (err) {
    // Fail fast: with `restart: unless-stopped` the container retries, which is
    // the right behaviour if the database wasn't ready yet.
    console.error("[startup] database setup failed:", err);
    throw err;
  }
}

// Apply pending Drizzle migrations from the ./drizzle folder (copied into the
// image). Retries a few times so a database that is still starting up doesn't
// crash the first boot (compose's `depends_on: healthy` covers most of this).
async function runMigrations() {
  const attempts = 10;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await migrate(db, { migrationsFolder: "drizzle" });
      console.log("[startup] database migrations up to date");
      return;
    } catch (err) {
      if (attempt === attempts) throw err;
      console.warn(
        `[startup] migration attempt ${attempt}/${attempts} failed, retrying in 2s...`
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

// Create the first account from ADMIN_EMAIL/ADMIN_PASSWORD, but only when there
// are no users yet — this never touches an existing account, so leaving the env
// vars set across restarts is harmless (drop ADMIN_PASSWORD after first boot).
// Mirrors the hashing in scripts/seed-user.ts.
async function bootstrapFirstUser() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  const existing = await db.select({ id: users.id }).from(users).limit(1);
  if (existing.length) return; // already set up

  const passwordHash = await bcrypt.hash(password, 10);
  await db.insert(users).values({ email, passwordHash });
  console.log(`[startup] created first account for ${email}`);
}
