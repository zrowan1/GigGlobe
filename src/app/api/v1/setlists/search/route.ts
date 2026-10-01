// GET /api/v1/setlists/search?artist=<name>&date=<YYYY-MM-DD>[&city=<name>]
// Candidate setlists from setlist.fm. Runs server-side so the API key stays
// on the server.

import { getRequestUserId } from "@/lib/api/auth";
import { apiError, json, unauthorized } from "@/lib/api/http";
import { searchSetlists } from "@/lib/setlist";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const userId = await getRequestUserId(request);
  if (!userId) return unauthorized();

  const params = new URL(request.url).searchParams;
  const artist = params.get("artist")?.trim() ?? "";
  const date = params.get("date")?.trim() ?? "";
  const city = params.get("city")?.trim() || null;
  if (!artist || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return apiError("Geef een artiest en een datum (JJJJ-MM-DD) op.", 400);
  }

  return json(await searchSetlists(artist, date, city));
}
