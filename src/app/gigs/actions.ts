"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
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
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  values: ParsedGig
): Promise<string> {
  if (values.artistId) return values.artistId;

  const { data: existing } = await supabase
    .from("artists")
    .select("id")
    .ilike("name", values.artistName)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("artists")
    .insert({ user_id: userId, name: values.artistName })
    .select("id")
    .single();

  if (error || !created) throw new Error("Kon de artiest niet opslaan.");
  return created.id;
}

// Use the picked existing venue, or create a new one from the geocode result.
async function resolveVenueId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  values: ParsedGig
): Promise<string> {
  if (values.venueId) return values.venueId;

  const { data: created, error } = await supabase
    .from("venues")
    .insert({
      user_id: userId,
      name: values.venueName,
      type: values.venueType,
      city: values.city,
      country: values.country,
      latitude: values.latitude,
      longitude: values.longitude,
    })
    .select("id")
    .single();

  if (error || !created) throw new Error("Kon de locatie niet opslaan.");
  return created.id;
}

async function requireUserId(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user.id;
}

// Create a new gig (and any new artist/venue it needs).
export async function createGig(
  _prevState: GigFormState,
  formData: FormData
): Promise<GigFormState> {
  const parsed = parseGigForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  try {
    const artistId = await resolveArtistId(supabase, userId, parsed.values);
    const venueId = await resolveVenueId(supabase, userId, parsed.values);

    const { error } = await supabase.from("gigs").insert({
      user_id: userId,
      artist_id: artistId,
      venue_id: venueId,
      gig_date: parsed.values.gigDate,
      notes: parsed.values.notes,
      rating: parsed.values.rating,
    });

    if (error) return { error: "Kon het optreden niet opslaan." };
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

  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  try {
    const artistId = await resolveArtistId(supabase, userId, parsed.values);
    const venueId = await resolveVenueId(supabase, userId, parsed.values);

    const { error } = await supabase
      .from("gigs")
      .update({
        artist_id: artistId,
        venue_id: venueId,
        gig_date: parsed.values.gigDate,
        notes: parsed.values.notes,
        rating: parsed.values.rating,
      })
      .eq("id", gigId);

    if (error) return { error: "Kon het optreden niet bijwerken." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Er ging iets mis." };
  }

  revalidatePath("/gigs");
  revalidatePath(`/gigs/${gigId}`);
  redirect(`/gigs/${gigId}`);
}

// Delete a gig. RLS guarantees you can only delete your own.
export async function deleteGig(formData: FormData): Promise<void> {
  const gigId = String(formData.get("gigId") ?? "").trim();
  if (!gigId) return;

  const supabase = await createClient();
  await requireUserId(supabase);

  await supabase.from("gigs").delete().eq("id", gigId);

  revalidatePath("/gigs");
  redirect("/gigs");
}
