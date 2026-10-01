// PUT    /api/v1/gigs/<id>/setlist — save the setlist the user picked. Body: one
//        result from GET /api/v1/setlists/search.
// DELETE /api/v1/gigs/<id>/setlist — remove the saved setlist.
//
// Remember: wherever the app shows a setlist it must also show the
// setlist.fm source link (setlistfm_url), as setlist.fm requires.

import { getRequestUserId } from "@/lib/api/auth";
import {
  apiError,
  isUuid,
  json,
  notFound,
  readJsonObject,
  unauthorized,
} from "@/lib/api/http";
import { deleteSetlistByGig, getGig, getSetlistByGig } from "@/lib/db/queries";
import { saveSetlistForUser } from "@/lib/gig-service";
import type { SetlistSearchResult } from "@/lib/setlist";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params): Promise<Response> {
  const userId = await getRequestUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;
  if (!isUuid(id) || !(await getGig(userId, id))) return notFound();

  const body = await readJsonObject(request);
  if (!body) return apiError("Ongeldig verzoek.", 400);

  const saved = await saveSetlistForUser(
    userId,
    id,
    body as unknown as SetlistSearchResult
  );
  if (!saved) return apiError("Ongeldige setlist.", 400);

  return json(await getSetlistByGig(userId, id));
}

export async function DELETE(request: Request, { params }: Params): Promise<Response> {
  const userId = await getRequestUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;
  if (!isUuid(id)) return notFound();

  await deleteSetlistByGig(userId, id);
  return new Response(null, { status: 204 });
}
