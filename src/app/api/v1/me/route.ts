// GET /api/v1/me — who am I? The app uses this to check its stored token is
// still valid (401 means: show the login screen again).

import { getRequestUserId } from "@/lib/api/auth";
import { json, unauthorized } from "@/lib/api/http";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const userId = await getRequestUserId(request);
  if (!userId) return unauthorized();
  return json({ id: userId });
}
