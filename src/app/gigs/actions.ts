"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { deleteSetlistByGig } from "@/lib/db/queries";
import { searchPlaces, type GeoResult } from "@/lib/geocoding";
import {
  createGigForUser,
  deleteGigForUser,
  parseGigInput,
  saveSetlistForUser,
  updateGigForUser,
} from "@/lib/gig-service";
import {
  searchSetlists as searchSetlistsApi,
  type SetlistSearchResult,
} from "@/lib/setlist";

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

// --- Setlist.fm -----------------------------------------------------------
// These run server-side so the setlist.fm API key and headers stay off the
// client. The detail page's setlist component calls them.

// Look up candidate setlists for an artist on a date (optionally a city).
export async function searchSetlists(
  artistName: string,
  gigDate: string,
  cityName?: string | null
): Promise<SetlistSearchResult[]> {
  await requireUserId();
  return searchSetlistsApi(artistName, gigDate, cityName);
}

// Save (or replace) the setlist the user picked for a gig. Validation lives in
// saveSetlistForUser (src/lib/gig-service.ts), shared with the app's API.
export async function saveSetlist(
  gigId: string,
  result: SetlistSearchResult
): Promise<void> {
  if (!gigId) return;

  const userId = await requireUserId();
  await saveSetlistForUser(userId, gigId, result);

  revalidatePath(`/gigs/${gigId}`);
}

// Remove the saved setlist for a gig.
export async function removeSetlist(gigId: string): Promise<void> {
  if (!gigId) return;
  const userId = await requireUserId();
  await deleteSetlistByGig(userId, gigId);
  revalidatePath(`/gigs/${gigId}`);
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
  const parsed = parseGigInput(Object.fromEntries(formData));
  if (!parsed.ok) return { error: parsed.error };

  const userId = await requireUserId();

  try {
    await createGigForUser(userId, parsed.values);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Er ging iets mis." };
  }

  revalidatePath("/gigs");
  revalidatePath("/");
  redirect("/gigs");
}

// Update an existing gig. The gig id travels in a hidden form field.
export async function updateGig(
  _prevState: GigFormState,
  formData: FormData
): Promise<GigFormState> {
  const gigId = String(formData.get("gigId") ?? "").trim();
  if (!gigId) return { error: "Onbekend optreden." };

  const parsed = parseGigInput(Object.fromEntries(formData));
  if (!parsed.ok) return { error: parsed.error };

  const userId = await requireUserId();

  try {
    await updateGigForUser(userId, gigId, parsed.values);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Er ging iets mis." };
  }

  revalidatePath("/gigs");
  revalidatePath(`/gigs/${gigId}`);
  revalidatePath("/");
  redirect(`/gigs/${gigId}`);
}

// Delete a gig. The query is scoped to the user, so you can only delete your
// own. deleteGigForUser also removes the gig's media (rows + files) and setlist.
export async function deleteGig(formData: FormData): Promise<void> {
  const gigId = String(formData.get("gigId") ?? "").trim();
  if (!gigId) return;

  const userId = await requireUserId();
  await deleteGigForUser(userId, gigId);

  revalidatePath("/gigs");
  revalidatePath("/");
  redirect("/gigs");
}
