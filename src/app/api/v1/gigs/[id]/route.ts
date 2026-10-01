// GET    /api/v1/gigs/<id> — one gig with its media and saved setlist.
// PUT    /api/v1/gigs/<id> — update it (same body as POST /api/v1/gigs).
// DELETE /api/v1/gigs/<id> — delete it, including its media files + setlist.

import { getRequestUserId } from "@/lib/api/auth";
import {
  apiError,
  isUuid,
  json,
  notFound,
  readJsonObject,
  unauthorized,
} from "@/lib/api/http";
import { getGig, getSetlistByGig, listMediaByGig } from "@/lib/db/queries";
import {
  deleteGigForUser,
  parseGigInput,
  updateGigForUser,
} from "@/lib/gig-service";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params): Promise<Response> {
  const userId = await getRequestUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;
  if (!isUuid(id)) return notFound();

  const gig = await getGig(userId, id);
  if (!gig) return notFound();

  const [media, setlist] = await Promise.all([
    listMediaByGig(userId, id),
    getSetlistByGig(userId, id),
  ]);
  return json({ gig, media, setlist });
}

export async function PUT(request: Request, { params }: Params): Promise<Response> {
  const userId = await getRequestUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;
  if (!isUuid(id) || !(await getGig(userId, id))) return notFound();

  const body = await readJsonObject(request);
  if (!body) return apiError("Ongeldig verzoek.", 400);

  const parsed = parseGigInput(body);
  if (!parsed.ok) return apiError(parsed.error, 400);

  try {
    await updateGigForUser(userId, id, parsed.values);
    return json({ id });
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Er ging iets mis.", 400);
  }
}

export async function DELETE(request: Request, { params }: Params): Promise<Response> {
  const userId = await getRequestUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;
  if (!isUuid(id) || !(await getGig(userId, id))) return notFound();

  await deleteGigForUser(userId, id);
  return new Response(null, { status: 204 });
}
