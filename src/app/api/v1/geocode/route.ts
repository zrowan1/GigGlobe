// GET /api/v1/geocode?q=<text> — place suggestions from Nominatim
// (OpenStreetMap), used by the venue field. The app must debounce typing:
// Nominatim allows at most ~1 request per second.

import { getRequestUserId } from "@/lib/api/auth";
import { json, unauthorized } from "@/lib/api/http";
import { searchPlaces } from "@/lib/geocoding";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const userId = await getRequestUserId(request);
  if (!userId) return unauthorized();

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  return json(await searchPlaces(q));
}
