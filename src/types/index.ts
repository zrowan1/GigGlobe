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
  storage_path: string; // relative to MEDIA_DIR
  thumbnail_path: string | null; // relative to MEDIA_DIR; null for videos
  media_type: MediaType;
  width: number | null;
  height: number | null;
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

// A venue plus how many gigs took place there. Feeds the map pins: one pin
// per venue, sized/labelled by the number of gigs.
export interface VenueWithGigCount extends Venue {
  gig_count: number;
}

// One song in a setlist. `info` holds setlist.fm's note (e.g. "acoustic"),
// `cover` the original artist when the song is a cover. Both are null when
// absent. Stored as JSONB on the setlists row, so this shape is the DB shape.
export interface SetlistSong {
  name: string;
  info: string | null;
  cover: string | null;
}

// A setlist fetched from setlist.fm and saved for one gig. We keep the source
// id and url because setlist.fm requires a visible attribution link back to
// the original setlist whenever we display it.
export interface Setlist {
  id: string;
  user_id: string;
  gig_id: string;
  setlistfm_id: string;
  setlistfm_url: string;
  songs: SetlistSong[];
  fetched_at: string;
  created_at: string;
}

// Top-level numbers for the map's stats counter ("X optredens · Y venues · Z
// landen").
export interface GigStats {
  gigs: number;
  venues: number;
  countries: number;
}
