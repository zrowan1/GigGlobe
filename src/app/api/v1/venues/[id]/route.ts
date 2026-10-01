// GET /api/v1/venues/<id> — one venue plus all your gigs there.

import { getRequestUserId } from "@/lib/api/auth";
import { isUuid, json, notFound, unauthorized } from "@/lib/api/http";
import { getVenue, listGigsByVenue } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const userId = await getRequestUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;
  if (!isUuid(id)) return notFound();

  const venue = await getVenue(userId, id);
  if (!venue) return notFound();

  return json({ venue, gigs: await listGigsByVenue(userId, id) });
}
