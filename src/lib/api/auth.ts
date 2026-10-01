// Authentication for API requests.
//
// The website logs in with a session cookie (Auth.js). The iPhone app can't
// rely on that cookie: it talks to the same server through two different
// addresses (internal IP at home, external domain outside), and a cookie only
// belongs to one address. So the app logs in once via /api/mobile/login and
// gets a token, which it sends as `Authorization: Bearer <token>` to whichever
// address it is using. The token works on both because it is the same server
// with the same AUTH_SECRET.
//
// The token is an Auth.js-style encrypted JWT, but with its own salt. That
// keeps the two kinds strictly apart: a website cookie can't be used as a
// bearer token, and an app token can't be used as a website cookie.

import { decode, encode } from "next-auth/jwt";

import { auth } from "@/lib/auth";

const MOBILE_TOKEN_SALT = "gigglobe-mobile-token";

// How long an app login stays valid before the user has to log in again.
export const MOBILE_TOKEN_MAX_AGE = 90 * 24 * 60 * 60; // 90 days, in seconds

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set");
  return value;
}

export async function createMobileToken(user: {
  id: string;
  email: string;
}): Promise<string> {
  return encode({
    token: { sub: user.id, email: user.email },
    secret: secret(),
    salt: MOBILE_TOKEN_SALT,
    maxAge: MOBILE_TOKEN_MAX_AGE,
  });
}

// Returns the user id from a valid, unexpired app token, else null.
async function userIdFromBearer(token: string): Promise<string | null> {
  try {
    const payload = await decode({
      token,
      secret: secret(),
      salt: MOBILE_TOKEN_SALT,
    });
    // decode() already rejects bad signatures; double-check the expiry.
    if (!payload?.sub) return null;
    if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) {
      return null;
    }
    return payload.sub;
  } catch {
    return null;
  }
}

// Who is making this request? Accepts the app's bearer token or, failing
// that, the website's session cookie. Returns null when neither is valid.
// Every API route calls this and then scopes all queries on the result.
export async function getRequestUserId(request: Request): Promise<string | null> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (match) return userIdFromBearer(match[1].trim());

  const session = await auth();
  return session?.user?.id ?? null;
}
