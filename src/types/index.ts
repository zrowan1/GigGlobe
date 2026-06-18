// Shared TypeScript types for GigGlobe.
// These mirror the database tables (see AGENTS.md / the migration).
// Having them in one place means the rest of the app can import them
// instead of re-describing the same shapes everywhere.

export type VenueType = "venue" | "festival";
export type MediaType = "photo" | "video";

export interface Artist {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface Venue {
  id: string;
  user_id: string;
  name: string;
  type: VenueType;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  created_at: string;
}

export interface Gig {
  id: string;
  user_id: string;
  artist_id: string;
  venue_id: string;
  gig_date: string; // ISO date string, e.g. "2026-06-13"
  notes: string | null;
  rating: number | null; // 1-5, or null if not rated
  created_at: string;
}

export interface Media {
  id: string;
  user_id: string;
  gig_id: string;
  storage_path: string;
  media_type: MediaType;
  created_at: string;
}

// A gig together with its artist and venue, as returned by the list and
// detail queries (the Drizzle helpers in src/lib/db/queries.ts join the
// related rows into these nested objects).
export interface GigWithRelations extends Gig {
  artist: Pick<Artist, "id" | "name">;
  venue: Pick<
    Venue,
    "id" | "name" | "type" | "city" | "country" | "latitude" | "longitude"
  >;
}
