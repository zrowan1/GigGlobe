// Nominatim (OpenStreetMap) geocoding wrapper.
//
// We use this to turn a venue name like "Ziggo Dome" into coordinates so we
// can later drop a pin on the map. Nominatim is free, but their usage policy
// asks us to:
//   - send a User-Agent that identifies our app,
//   - stay under ~1 request/second.
// That is why this runs server-side (a server action can set a User-Agent,
// the browser cannot) and the form that calls it debounces typing.

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

// A single place suggestion, already cleaned up for our use.
export interface GeoResult {
  displayName: string; // full address, e.g. "Ziggo Dome, Amsterdam, ..."
  name: string; // short label, e.g. "Ziggo Dome"
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
}

// The raw shape Nominatim returns (only the fields we care about).
interface NominatimResult {
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    country?: string;
  };
}

function toGeoResult(r: NominatimResult): GeoResult {
  const address = r.address ?? {};
  return {
    displayName: r.display_name,
    name: r.name || r.display_name.split(",")[0]!.trim(),
    city:
      address.city ??
      address.town ??
      address.village ??
      address.municipality ??
      null,
    country: address.country ?? null,
    latitude: Number.parseFloat(r.lat),
    longitude: Number.parseFloat(r.lon),
  };
}

// Search for places matching `query`. Returns at most 5 suggestions.
// Returns an empty list for very short queries or on any error, so callers
// never have to handle exceptions for a simple type-ahead field.
export async function searchPlaces(query: string): Promise<GeoResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", trimmed);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "GigGlobe/0.1 (concert tracker)",
        "Accept-Language": "nl",
      },
      // Cache identical queries for a day. This is both faster for the user
      // and friendlier to Nominatim's rate limit.
      next: { revalidate: 86400 },
    });

    if (!res.ok) return [];

    const data = (await res.json()) as NominatimResult[];
    return data.map(toGeoResult);
  } catch {
    return [];
  }
}
