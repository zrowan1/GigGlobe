// GET /api/v1/artists — all your artists (A–Z), e.g. for suggestions in the form.

import { getRequestUserId } from "@/lib/api/auth";
import { json, unauthorized } from "@/lib/api/http";
import { listArtists } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const userId = await getRequestUserId(request);
  if (!userId) return unauthorized();
  return json(await listArtists(userId));
}
