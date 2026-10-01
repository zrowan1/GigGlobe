// GET /api/v1/venues — all your venues with the number of gigs at each.
// This is what the map uses for its pins.

import { getRequestUserId } from "@/lib/api/auth";
import { json, unauthorized } from "@/lib/api/http";
import { listVenuesWithGigCounts } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const userId = await getRequestUserId(request);
  if (!userId) return unauthorized();
  return json(await listVenuesWithGigCounts(userId));
}
