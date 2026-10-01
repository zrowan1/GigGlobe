// POST /api/mobile/login — log in from the iPhone app.
//
// Body: { "email": "...", "password": "..." }
// Answer: { "token": "...", "expiresAt": "<ISO date>", "user": { id, email } }
//
// The app stores the token in the iOS Keychain and sends it as
// `Authorization: Bearer <token>` on every API call (see src/lib/api/auth.ts).

import { createMobileToken, MOBILE_TOKEN_MAX_AGE } from "@/lib/api/auth";
import { apiError, json, readJsonObject } from "@/lib/api/http";
import { verifyCredentials } from "@/lib/credentials";

export const runtime = "nodejs";

// Simple brute-force brake: after too many wrong passwords for one email
// address, refuse further attempts for a while. Kept in memory, which is fine
// for a single self-hosted container (a restart simply resets it).
const MAX_FAILURES = 10;
const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; since: number }>();

function isLocked(key: string): boolean {
  const entry = failures.get(key);
  if (!entry) return false;
  if (Date.now() - entry.since > WINDOW_MS) {
    failures.delete(key);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

function recordFailure(key: string): void {
  const entry = failures.get(key);
  if (!entry || Date.now() - entry.since > WINDOW_MS) {
    failures.set(key, { count: 1, since: Date.now() });
  } else {
    entry.count += 1;
  }
}

export async function POST(request: Request): Promise<Response> {
  const body = await readJsonObject(request);
  if (!body) return apiError("Ongeldig verzoek.", 400);

  const key = String(body.email ?? "").trim().toLowerCase();
  if (isLocked(key)) {
    return apiError("Te veel mislukte pogingen. Probeer het over 15 minuten opnieuw.", 429);
  }

  const user = await verifyCredentials(body.email, body.password);
  if (!user) {
    recordFailure(key);
    return apiError("Onjuist e-mailadres of wachtwoord.", 401);
  }
  failures.delete(key);

  const token = await createMobileToken(user);
  const expiresAt = new Date(Date.now() + MOBILE_TOKEN_MAX_AGE * 1000);

  return json({ token, expiresAt: expiresAt.toISOString(), user });
}
