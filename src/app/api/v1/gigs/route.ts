// GET  /api/v1/gigs — all your gigs (newest first), with artist + venue.
// POST /api/v1/gigs — add a gig. Body: same fields as the website form, e.g.
//   { artistName, gigDate: "2024-06-15", venueName, venueType, latitude,
//     longitude, city, country, notes, rating }
//   or reuse existing ones with { artistId, venueId }. Answers 201 { id }.

import { getRequestUserId } from "@/lib/api/auth";
import { apiError, json, readJsonObject, unauthorized } from "@/lib/api/http";
import { listGigs } from "@/lib/db/queries";
import { createGigForUser, parseGigInput } from "@/lib/gig-service";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const userId = await getRequestUserId(request);
  if (!userId) return unauthorized();
  return json(await listGigs(userId));
}

export async function POST(request: Request): Promise<Response> {
  const userId = await getRequestUserId(request);
  if (!userId) return unauthorized();

  const body = await readJsonObject(request);
  if (!body) return apiError("Ongeldig verzoek.", 400);

  const parsed = parseGigInput(body);
  if (!parsed.ok) return apiError(parsed.error, 400);

  try {
    const id = await createGigForUser(userId, parsed.values);
    return json({ id }, 201);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Er ging iets mis.", 400);
  }
}
