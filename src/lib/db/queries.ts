// Centralised, user-scoped database access. Every function takes a `userId`
// and filters on it. This is the ONLY thing keeping one user's data separate
// from another's now that there is no database RLS — so all reads and writes
// go through here, never straight to `db` from a page or action.
//
// The helpers return the snake_case shapes from src/types (Artist, Venue,
// GigWithRelations) so the rest of the app keeps working unchanged.

import { and, desc, eq, ilike } from "drizzle-orm";

import { db } from "@/lib/db";
import { artists, gigs, venues } from "@/lib/db/schema";
import type { Artist, GigWithRelations, Venue, VenueType } from "@/types";

// --- Reads ----------------------------------------------------------------

export async function listArtists(userId: string): Promise<Artist[]> {
  const rows = await db
    .select()
    .from(artists)
    .where(eq(artists.userId, userId))
    .orderBy(artists.name);

  return rows.map((a) => ({
    id: a.id,
    user_id: a.userId,
    name: a.name,
    created_at: a.createdAt?.toISOString() ?? "",
  }));
}

export async function listVenues(userId: string): Promise<Venue[]> {
  const rows = await db
    .select()
    .from(venues)
    .where(eq(venues.userId, userId))
    .orderBy(venues.name);

  return rows.map(toVenue);
}

export async function listGigs(userId: string): Promise<GigWithRelations[]> {
  const rows = await db
    .select({ gig: gigs, artist: artists, venue: venues })
    .from(gigs)
    .innerJoin(artists, eq(gigs.artistId, artists.id))
    .innerJoin(venues, eq(gigs.venueId, venues.id))
    .where(eq(gigs.userId, userId))
    .orderBy(desc(gigs.gigDate));

  return rows.map(toGigWithRelations);
}

export async function getGig(
  userId: string,
  id: string
): Promise<GigWithRelations | null> {
  const rows = await db
    .select({ gig: gigs, artist: artists, venue: venues })
    .from(gigs)
    .innerJoin(artists, eq(gigs.artistId, artists.id))
    .innerJoin(venues, eq(gigs.venueId, venues.id))
    .where(and(eq(gigs.userId, userId), eq(gigs.id, id)))
    .limit(1);

  return rows.length ? toGigWithRelations(rows[0]) : null;
}

// --- Writes ---------------------------------------------------------------

// Find an existing artist by exact (case-insensitive) name. Returns the id or
// null. Used for the "no duplicate Kendrick Lamar" rule.
export async function findArtistByName(
  userId: string,
  name: string
): Promise<string | null> {
  const rows = await db
    .select({ id: artists.id })
    .from(artists)
    .where(and(eq(artists.userId, userId), ilike(artists.name, name)))
    .limit(1);

  return rows.length ? rows[0].id : null;
}

export async function createArtist(
  userId: string,
  name: string
): Promise<string> {
  const [row] = await db
    .insert(artists)
    .values({ userId, name })
    .returning({ id: artists.id });

  return row.id;
}

export async function createVenue(
  userId: string,
  values: {
    name: string;
    type: VenueType;
    city: string | null;
    country: string | null;
    latitude: number;
    longitude: number;
  }
): Promise<string> {
  const [row] = await db
    .insert(venues)
    .values({ userId, ...values })
    .returning({ id: venues.id });

  return row.id;
}

interface GigValues {
  artistId: string;
  venueId: string;
  gigDate: string;
  notes: string | null;
  rating: number | null;
}

export async function insertGig(
  userId: string,
  values: GigValues
): Promise<void> {
  await db.insert(gigs).values({ userId, ...values });
}

export async function updateGigById(
  userId: string,
  gigId: string,
  values: GigValues
): Promise<void> {
  await db
    .update(gigs)
    .set(values)
    .where(and(eq(gigs.userId, userId), eq(gigs.id, gigId)));
}

export async function deleteGigById(
  userId: string,
  gigId: string
): Promise<void> {
  await db
    .delete(gigs)
    .where(and(eq(gigs.userId, userId), eq(gigs.id, gigId)));
}

// --- Mapping helpers ------------------------------------------------------

type VenueRow = typeof venues.$inferSelect;
type GigJoinRow = {
  gig: typeof gigs.$inferSelect;
  artist: typeof artists.$inferSelect;
  venue: VenueRow;
};

function toVenue(v: VenueRow): Venue {
  return {
    id: v.id,
    user_id: v.userId,
    name: v.name,
    type: v.type as VenueType,
    city: v.city,
    country: v.country,
    latitude: v.latitude,
    longitude: v.longitude,
    created_at: v.createdAt?.toISOString() ?? "",
  };
}

function toGigWithRelations(row: GigJoinRow): GigWithRelations {
  return {
    id: row.gig.id,
    user_id: row.gig.userId,
    artist_id: row.gig.artistId,
    venue_id: row.gig.venueId,
    gig_date: row.gig.gigDate,
    notes: row.gig.notes,
    rating: row.gig.rating,
    created_at: row.gig.createdAt?.toISOString() ?? "",
    artist: { id: row.artist.id, name: row.artist.name },
    venue: {
      id: row.venue.id,
      name: row.venue.name,
      type: row.venue.type as VenueType,
      city: row.venue.city,
      country: row.venue.country,
      latitude: row.venue.latitude,
      longitude: row.venue.longitude,
    },
  };
}
