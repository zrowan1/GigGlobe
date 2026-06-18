"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import {
  createArtist,
  createVenue,
  deleteGigById,
  findArtistByName,
  insertGig,
  updateGigById,
} from "@/lib/db/queries";
import { searchPlaces, type GeoResult } from "@/lib/geocoding";
import type { VenueType } from "@/types";

// State returned by the create/update actions. When something goes wrong we
// return { error } so the form can show it; on success the action redirects
// and nothing is returned.
export interface GigFormState {
  error?: string;
}

// Server action wrapper around the Nominatim search, called (debounced) from
// the venue field as the user types. Keeping it here means the User-Agent
// header and caching live server-side.
export async function searchVenuePlaces(query: string): Promise<GeoResult[]> {
  return searchPlaces(query);
}

// Read and lightly validate the shared fields from the submitted form.
// Returns either the cleaned values or an error message.
function parseGigForm(formData: FormData):
  | { ok: true; values: ParsedGig }
  | { ok: false; error: string } {
  const artistName = String(formData.get("artistName") ?? "").trim();
  const artistId = String(formData.get("artistId") ?? "").trim();

  const venueName = String(formData.get("venueName") ?? "").trim();
  const venueId = String(formData.get("venueId") ?? "").trim();
  const venueType = String(formData.get("venueType") ?? "venue") as VenueType;
  const latRaw = String(formData.get("latitude") ?? "").trim();
  const lonRaw = String(formData.get("longitude") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim() || null;
  const country = String(formData.get("country") ?? "").trim() || null;

  const gigDate = String(formData.get("gigDate") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const ratingRaw = String(formData.get("rating") ?? "").trim();

  if (!artistName) return { ok: false, error: "Vul een artiest in." };
  if (!gigDate) return { ok: false, error: "Kies een datum." };

  // A venue is valid if either an existing one was picked (venueId), or a new
  // one was located via Nominatim (we then have name + coordinates).
  const hasNewVenue =
    venueName !== "" && latRaw !== "" && lonRaw !== "";
  if (!venueId && !hasNewVenue) {
    return {
      ok: false,
      error: "Kies een locatie uit de zoeklijst zodat we hem op de kaart kunnen zetten.",
    };
  }

  const rating = ratingRaw ? Number.parseInt(ratingRaw, 10) : null;

  return {
    ok: true,
    values: {
      artistName,
      artistId: artistId || null,
      venueId: venueId || null,
      venueName,
      venueType: venueType === "festival" ? "festival" : "venue",
      latitude: latRaw ? Number.parseFloat(latRaw) : null,
      longitude: lonRaw ? Number.parseFloat(lonRaw) : null,
      city,
      country,
      gigDate,
      notes,
      rating,
    },
  };
}

interface ParsedGig {
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

// Find an existing artist by exact (case-insensitive) name, or create one.
// This is the "no duplicate Kendrick Lamar" rule from the plan.
async function resolveArtistId(
  userId: string,
  values: ParsedGig
): Promise<string> {
  if (values.artistId) return values.artistId;

  const existing = await findArtistByName(userId, values.artistName);
  if (existing) return existing;

  return createArtist(userId, values.artistName);
}

// Use the picked existing venue, or create a new one from the geocode result.
async function resolveVenueId(
  userId: string,
  values: ParsedGig
): Promise<string> {
  if (values.venueId) return values.venueId;

  // parseGigForm guarantees coordinates are present when there's no venueId.
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

async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");
  return userId;
}

// Create a new gig (and any new artist/venue it needs).
export async function createGig(
  _prevState: GigFormState,
  formData: FormData
): Promise<GigFormState> {
  const parsed = parseGigForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const userId = await requireUserId();

  try {
    const artistId = await resolveArtistId(userId, parsed.values);
    const venueId = await resolveVenueId(userId, parsed.values);

    await insertGig(userId, {
      artistId,
      venueId,
      gigDate: parsed.values.gigDate,
      notes: parsed.values.notes,
      rating: parsed.values.rating,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Er ging iets mis." };
  }

  revalidatePath("/gigs");
  redirect("/gigs");
}

// Update an existing gig. The gig id travels in a hidden form field.
export async function updateGig(
  _prevState: GigFormState,
  formData: FormData
): Promise<GigFormState> {
  const gigId = String(formData.get("gigId") ?? "").trim();
  if (!gigId) return { error: "Onbekend optreden." };

  const parsed = parseGigForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const userId = await requireUserId();

  try {
    const artistId = await resolveArtistId(userId, parsed.values);
    const venueId = await resolveVenueId(userId, parsed.values);

    await updateGigById(userId, gigId, {
      artistId,
      venueId,
      gigDate: parsed.values.gigDate,
      notes: parsed.values.notes,
      rating: parsed.values.rating,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Er ging iets mis." };
  }

  revalidatePath("/gigs");
  revalidatePath(`/gigs/${gigId}`);
  redirect(`/gigs/${gigId}`);
}

// Delete a gig. The query is scoped to the user, so you can only delete your own.
export async function deleteGig(formData: FormData): Promise<void> {
  const gigId = String(formData.get("gigId") ?? "").trim();
  if (!gigId) return;

  const userId = await requireUserId();

  await deleteGigById(userId, gigId);

  revalidatePath("/gigs");
  redirect("/gigs");
}
