import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

// Check an email + password: look up the user by email and compare the
// password against the stored bcrypt hash. Returns the user on success, or
// null. Shared by the website login (Auth.js) and the app login API.
export async function verifyCredentials(
  rawEmail: unknown,
  rawPassword: unknown
): Promise<{ id: string; email: string } | null> {
  const email = String(rawEmail ?? "")
    .trim()
    .toLowerCase();
  const password = String(rawPassword ?? "");
  if (!email || !password) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return { id: user.id, email: user.email };
}
