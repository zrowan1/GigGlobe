// Shared write logic for gigs, used by both the website's server actions
// (src/app/gigs/actions.ts) and the JSON API for the iPhone app
// (src/app/api/v1). Keeping it in one place means validation, the
// "no duplicate artist" rule and the clean-up on delete behave identically
// no matter which client made the change.
//
// Every function takes the logged-in userId and only goes through the scoped
// helpers in src/lib/db/queries.ts.

import {
  createArtist,
  createVenue,
  deleteGigById,
  deleteMediaByGig,
  deleteSetlistByGig,
  findArtistByName,
  getArtist,
  getGig,
  getVenue,
  insertGig,
  updateGigById,
  upsertSetlist,
} from "@/lib/db/queries";
import { removeFiles } from "@/lib/media/storage";
import type { SetlistSearchResult } from "@/lib/setlist";
import type { SetlistSong, VenueType } from "@/types";

export interface GigInput {
  artistName: string;
  artistId: string | null;
  venueId: string | null;
  venueName: string;
  venueType: VenueType;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  country: string | null;
  gigDate: string;
  notes: string | null;
  rating: number | null;
}

export type ParseResult =
  | { ok: true; values: GigInput }
  | { ok: false; error: string };

// Turn any value (form field, JSON number, null) into a trimmed string.
function str(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

// Read and validate the gig fields from a plain object. The website passes
// Object.fromEntries(formData); the API passes the parsed JSON body. Both use
// the same field names, so one parser serves both.
export function parseGigInput(input: Record<string, unknown>): ParseResult {
  const artistName = str(input.artistName);
  const artistId = str(input.artistId);

  const venueName = str(input.venueName);
  const venueId = str(input.venueId);
  const venueType = str(input.venueType) === "festival" ? "festival" : "venue";
  const latRaw = str(input.latitude);
  const lonRaw = str(input.longitude);
  const city = str(input.city) || null;
  const country = str(input.country) || null;

  const gigDate = str(input.gigDate);
  const notes = str(input.notes) || null;
  const ratingRaw = str(input.rating);

  if (!artistName && !artistId) return { ok: false, error: "Vul een artiest in." };
  if (!gigDate) return { ok: false, error: "Kies een datum." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(gigDate)) {
    return { ok: false, error: "Ongeldige datum (verwacht JJJJ-MM-DD)." };
  }

  // Every location needs a name (free text, e.g. "Pinkpop"). When you reuse a
  // saved venue (venueId) the name is already filled in for you.
  if (!venueId && venueName === "") {
    return { ok: false, error: "Vul een naam voor de locatie in." };
  }

  // For a new location we also need coordinates, which come from picking a
  // place in the "Plaats" field. Reusing a saved venue (venueId) already has
  // them.
  const latitude = latRaw ? Number.parseFloat(latRaw) : null;
  const longitude = lonRaw ? Number.parseFloat(lonRaw) : null;
  const hasCoords =
    latitude !== null &&
    longitude !== null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);
  if (!venueId && !hasCoords) {
    return {
      ok: false,
      error:
        "Kies een plaats uit de zoeklijst zodat we het optreden op de kaart kunnen zetten.",
    };
  }

  const rating = ratingRaw ? Number.parseInt(ratingRaw, 10) : null;
  if (rating !== null && !(rating >= 1 && rating <= 5)) {
    return { ok: false, error: "Een beoordeling is 1 t/m 5 sterren." };
  }

  return {
    ok: true,
    values: {
      artistName,
      artistId: artistId || null,
      venueId: venueId || null,
      venueName,
      venueType,
      latitude: hasCoords ? latitude : null,
      longitude: hasCoords ? longitude : null,
      city,
      country,
      gigDate,
      notes,
      rating,
    },
  };
}

// Use the given artist id (only if it is the user's own), find an existing
// artist by exact (case-insensitive) name, or create one. This is the
// "no duplicate Kendrick Lamar" rule from the plan.
async function resolveArtistId(userId: string, values: GigInput): Promise<string> {
  if (values.artistId) {
    const own = await getArtist(userId, values.artistId);
    if (!own) throw new Error("Artiest niet gevonden.");
    return own.id;
  }

  const existing = await findArtistByName(userId, values.artistName);
  if (existing) return existing;

  return createArtist(userId, values.artistName);
}

// Use the picked existing venue (only if it is the user's own), or create a
// new one from the geocode result.
async function resolveVenueId(userId: string, values: GigInput): Promise<string> {
  if (values.venueId) {
    const own = await getVenue(userId, values.venueId);
    if (!own) throw new Error("Locatie niet gevonden.");
    return own.id;
  }

  // parseGigInput guarantees coordinates are present when there's no venueId.
  if (values.latitude === null || values.longitude === null) {
    throw new Error("Kon de locatie niet opslaan.");
  }

  return createVenue(userId, {
    name: values.venueName,
    type: values.venueType,
    city: values.city,
    country: values.country,
    latitude: values.latitude,
    longitude: values.longitude,
  });
}

// Create a gig (and any new artist/venue it needs). Returns the new gig id.
export async function createGigForUser(
  userId: string,
  values: GigInput
): Promise<string> {
  const artistId = await resolveArtistId(userId, values);
  const venueId = await resolveVenueId(userId, values);

  return insertGig(userId, {
    artistId,
    venueId,
    gigDate: values.gigDate,
    notes: values.notes,
    rating: values.rating,
  });
}

// Update an existing gig. The caller checks the gig exists for this user.
export async function updateGigForUser(
  userId: string,
  gigId: string,
  values: GigInput
): Promise<void> {
  const artistId = await resolveArtistId(userId, values);
  const venueId = await resolveVenueId(userId, values);

  await updateGigById(userId, gigId, {
    artistId,
    venueId,
    gigDate: values.gigDate,
    notes: values.notes,
    rating: values.rating,
  });
}

// Delete a gig with everything hanging off it. The media and setlist FKs have
// no ON DELETE CASCADE, so those rows (and the media files on disk) go first —
// otherwise the gig delete would fail on the constraint and leave orphaned
// files behind.
export async function deleteGigForUser(userId: string, gigId: string): Promise<void> {
  const removedMedia = await deleteMediaByGig(userId, gigId);
  await removeFiles(
    ...removedMedia.flatMap((m) => [m.storage_path, m.thumbnail_path])
  );

  await deleteSetlistByGig(userId, gigId);
  await deleteGigById(userId, gigId);
}

// Save (or replace) the setlist the user picked for a gig. The chosen result
// comes from the client; it is public setlist.fm data, but we still keep only
// the fields we need and cap the song list to a sane length before storing.
export async function saveSetlistForUser(
  userId: string,
  gigId: string,
  result: SetlistSearchResult
): Promise<boolean> {
  if (!result?.id || !result?.url) return false;
  // The link is rendered as a source link, so only accept real setlist.fm URLs.
  if (!/^https:\/\/(www\.)?setlist\.fm\//.test(String(result.url))) return false;
  // The setlist row is keyed on gigId, so make sure the gig is the user's own
  // before writing (an upsert on someone else's gig id would overwrite theirs).
  if (!(await getGig(userId, gigId))) return false;

  const songs: SetlistSong[] = (Array.isArray(result.songs) ? result.songs : [])
    .slice(0, 200)
    .map((s) => ({
      name: String(s.name ?? "").slice(0, 300),
      info: s.info ? String(s.info).slice(0, 300) : null,
      cover: s.cover ? String(s.cover).slice(0, 200) : null,
    }));

  await upsertSetlist(userId, gigId, {
    setlistfmId: String(result.id),
    setlistfmUrl: String(result.url),
    songs,
  });
  return true;
}
