// GET /api/v1/artists/<id> — one artist plus all your gigs of that artist.

import { getRequestUserId } from "@/lib/api/auth";
import { isUuid, json, notFound, unauthorized } from "@/lib/api/http";
import { getArtist, listGigsByArtist } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const userId = await getRequestUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;
  if (!isUuid(id)) return notFound();

  const artist = await getArtist(userId, id);
  if (!artist) return notFound();

  return json({ artist, gigs: await listGigsByArtist(userId, id) });
}
