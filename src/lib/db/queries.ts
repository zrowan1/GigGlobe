// Centralised, user-scoped database access. Every function takes a `userId`
// and filters on it. This is the ONLY thing keeping one user's data separate
// from another's now that there is no database RLS — so all reads and writes
// go through here, never straight to `db` from a page or action.
//
// The helpers return the snake_case shapes from src/types (Artist, Venue,
// GigWithRelations) so the rest of the app keeps working unchanged.

import { and, countDistinct, desc, eq, ilike, isNotNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { artists, gigs, media, setlists, venues } from "@/lib/db/schema";
import type {
  Artist,
  DetailedStats,
  GigStats,
  GigWithRelations,
  Media,
  MediaType,
  NameCount,
  Setlist,
  SetlistSong,
  Venue,
  VenueCount,
  VenueType,
  VenueWithGigCount,
} from "@/types";

// --- Reads ----------------------------------------------------------------

export async function listArtists(userId: string): Promise<Artist[]> {
  const rows = await db
    .select()
    .from(artists)
    .where(eq(artists.userId, userId))
    .orderBy(artists.name);

  return rows.map(toArtist);
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

// A single artist, scoped to the user. Returns null if it doesn't exist or
// belongs to someone else — the detail page turns that into a 404.
export async function getArtist(
  userId: string,
  id: string
): Promise<Artist | null> {
  const rows = await db
    .select()
    .from(artists)
    .where(and(eq(artists.userId, userId), eq(artists.id, id)))
    .limit(1);

  return rows.length ? toArtist(rows[0]) : null;
}

// A single venue, scoped to the user. Same 404 contract as getArtist.
export async function getVenue(
  userId: string,
  id: string
): Promise<Venue | null> {
  const rows = await db
    .select()
    .from(venues)
    .where(and(eq(venues.userId, userId), eq(venues.id, id)))
    .limit(1);

  return rows.length ? toVenue(rows[0]) : null;
}

// All gigs for one artist, newest first. Same join/shape as listGigs, with an
// extra filter on the artist. Feeds the artist detail page (its gig list and
// the venues for its mini-map).
export async function listGigsByArtist(
  userId: string,
  artistId: string
): Promise<GigWithRelations[]> {
  const rows = await db
    .select({ gig: gigs, artist: artists, venue: venues })
    .from(gigs)
    .innerJoin(artists, eq(gigs.artistId, artists.id))
    .innerJoin(venues, eq(gigs.venueId, venues.id))
    .where(and(eq(gigs.userId, userId), eq(gigs.artistId, artistId)))
    .orderBy(desc(gigs.gigDate));

  return rows.map(toGigWithRelations);
}

// All gigs at one venue, newest first. Mirror of listGigsByArtist.
export async function listGigsByVenue(
  userId: string,
  venueId: string
): Promise<GigWithRelations[]> {
  const rows = await db
    .select({ gig: gigs, artist: artists, venue: venues })
    .from(gigs)
    .innerJoin(artists, eq(gigs.artistId, artists.id))
    .innerJoin(venues, eq(gigs.venueId, venues.id))
    .where(and(eq(gigs.userId, userId), eq(gigs.venueId, venueId)))
    .orderBy(desc(gigs.gigDate));

  return rows.map(toGigWithRelations);
}

// All media for one gig, oldest first, so the gallery shows them in upload
// order. Scoped to the user *and* the gig.
export async function listMediaByGig(
  userId: string,
  gigId: string
): Promise<Media[]> {
  const rows = await db
    .select()
    .from(media)
    .where(and(eq(media.userId, userId), eq(media.gigId, gigId)))
    .orderBy(media.createdAt);

  return rows.map(toMedia);
}

// Single media row, scoped to the user. This is the ownership gate for the
// serving and delete paths: if it returns null the caller must 404.
export async function getMedia(
  userId: string,
  id: string
): Promise<Media | null> {
  const rows = await db
    .select()
    .from(media)
    .where(and(eq(media.userId, userId), eq(media.id, id)))
    .limit(1);

  return rows.length ? toMedia(rows[0]) : null;
}

// The saved setlist for one gig, or null if none was fetched yet. Scoped to
// the user *and* the gig.
export async function getSetlistByGig(
  userId: string,
  gigId: string
): Promise<Setlist | null> {
  const rows = await db
    .select()
    .from(setlists)
    .where(and(eq(setlists.userId, userId), eq(setlists.gigId, gigId)))
    .limit(1);

  return rows.length ? toSetlist(rows[0]) : null;
}

// All venues plus the number of gigs at each, for the map pins. A LEFT JOIN
// keeps venues that have no gigs yet (gig_count = 0); GROUP BY collapses the
// joined gig rows back to one row per venue. Postgres COUNT() comes back as a
// bigint string, so we cast it to int.
export async function listVenuesWithGigCounts(
  userId: string
): Promise<VenueWithGigCount[]> {
  const rows = await db
    .select({
      venue: venues,
      gigCount: sql<number>`count(${gigs.id})::int`,
    })
    .from(venues)
    .leftJoin(gigs, eq(gigs.venueId, venues.id))
    .where(eq(venues.userId, userId))
    .groupBy(venues.id)
    .orderBy(venues.name);

  return rows.map((row) => ({ ...toVenue(row.venue), gig_count: row.gigCount }));
}

// The three headline numbers for the map's stats counter. Each is a single
// scoped COUNT; countries counts the distinct, non-null venue countries.
export async function getGigStats(userId: string): Promise<GigStats> {
  const [gigRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(gigs)
    .where(eq(gigs.userId, userId));

  const [venueRow] = await db
    .select({
      venues: sql<number>`count(*)::int`,
      countries: countDistinct(venues.country),
    })
    .from(venues)
    .where(eq(venues.userId, userId));

  return {
    gigs: gigRow?.count ?? 0,
    venues: venueRow?.venues ?? 0,
    countries: Number(venueRow?.countries ?? 0),
  };
}

// Everything the /stats page needs, computed in SQL and bundled into one
// object. Each aggregation is its own user-scoped query; they run in parallel.
// Counts come back from Postgres as bigint strings, so every COUNT is cast to
// ::int (and countDistinct is wrapped in Number()) to get real JS numbers.
export async function getDetailedStats(
  userId: string
): Promise<DetailedStats> {
  // Most-seen artists: count gigs per artist, highest first.
  const topArtistsQuery = db
    .select({ name: artists.name, count: sql<number>`count(*)::int` })
    .from(gigs)
    .innerJoin(artists, eq(gigs.artistId, artists.id))
    .where(eq(gigs.userId, userId))
    .groupBy(artists.id, artists.name)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  // Top venues/festivals: same query, filtered by venue type. venues.id is the
  // primary key so the other venue columns may be selected without grouping on
  // each (Postgres functional-dependency rule), as in listVenuesWithGigCounts.
  const topVenuesByType = (type: VenueType) =>
    db
      .select({
        id: venues.id,
        name: venues.name,
        type: venues.type,
        city: venues.city,
        country: venues.country,
        count: sql<number>`count(${gigs.id})::int`,
      })
      .from(gigs)
      .innerJoin(venues, eq(gigs.venueId, venues.id))
      .where(and(eq(gigs.userId, userId), eq(venues.type, type)))
      .groupBy(venues.id)
      .orderBy(desc(sql`count(${gigs.id})`))
      .limit(10);

  // Gigs per country (non-null only), highest first.
  const topCountriesQuery = db
    .select({ name: venues.country, count: sql<number>`count(*)::int` })
    .from(gigs)
    .innerJoin(venues, eq(gigs.venueId, venues.id))
    .where(and(eq(gigs.userId, userId), isNotNull(venues.country)))
    .groupBy(venues.country)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  // Gigs per city. Group on city + country so identically-named cities in
  // different countries don't merge; the label combines both.
  const topCitiesQuery = db
    .select({
      city: venues.city,
      country: venues.country,
      count: sql<number>`count(*)::int`,
    })
    .from(gigs)
    .innerJoin(venues, eq(gigs.venueId, venues.id))
    .where(and(eq(gigs.userId, userId), isNotNull(venues.city)))
    .groupBy(venues.city, venues.country)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  // Timeline: gigs per calendar year, ascending.
  const yearExpr = sql`extract(year from ${gigs.gigDate})`;
  const gigsPerYearQuery = db
    .select({ year: sql<number>`${yearExpr}::int`, count: sql<number>`count(*)::int` })
    .from(gigs)
    .where(eq(gigs.userId, userId))
    .groupBy(yearExpr)
    .orderBy(yearExpr);

  // Totals from the gigs table: total gigs + distinct artists actually seen.
  const gigTotalsQuery = db
    .select({
      gigs: sql<number>`count(*)::int`,
      artists: sql<number>`count(distinct ${gigs.artistId})::int`,
    })
    .from(gigs)
    .where(eq(gigs.userId, userId));

  // Totals from the venues table: venues vs festivals, distinct countries/cities.
  const venueTotalsQuery = db
    .select({
      venues: sql<number>`(count(*) filter (where ${venues.type} = 'venue'))::int`,
      festivals: sql<number>`(count(*) filter (where ${venues.type} = 'festival'))::int`,
      countries: countDistinct(venues.country),
      cities: countDistinct(venues.city),
    })
    .from(venues)
    .where(eq(venues.userId, userId));

  // Ratings: average, per-rating distribution, and the highest-rated gigs.
  const avgRatingQuery = db
    .select({ avg: sql<string | null>`avg(${gigs.rating})` })
    .from(gigs)
    .where(and(eq(gigs.userId, userId), isNotNull(gigs.rating)));

  const ratingDistQuery = db
    .select({ rating: gigs.rating, count: sql<number>`count(*)::int` })
    .from(gigs)
    .where(and(eq(gigs.userId, userId), isNotNull(gigs.rating)))
    .groupBy(gigs.rating);

  const topRatedQuery = db
    .select({ gig: gigs, artist: artists, venue: venues })
    .from(gigs)
    .innerJoin(artists, eq(gigs.artistId, artists.id))
    .innerJoin(venues, eq(gigs.venueId, venues.id))
    .where(and(eq(gigs.userId, userId), isNotNull(gigs.rating)))
    .orderBy(desc(gigs.rating), desc(gigs.gigDate))
    .limit(5);

  const [
    topArtists,
    topVenues,
    topFestivals,
    countryRows,
    cityRows,
    gigsPerYear,
    gigTotals,
    venueTotals,
    avgRows,
    distRows,
    topRatedRows,
  ] = await Promise.all([
    topArtistsQuery,
    topVenuesByType("venue"),
    topVenuesByType("festival"),
    topCountriesQuery,
    topCitiesQuery,
    gigsPerYearQuery,
    gigTotalsQuery,
    venueTotalsQuery,
    avgRatingQuery,
    ratingDistQuery,
    topRatedQuery,
  ]);

  const topCountries: NameCount[] = countryRows.map((r) => ({
    name: r.name ?? "Onbekend",
    count: r.count,
  }));

  const topCities: NameCount[] = cityRows.map((r) => ({
    name: r.country ? `${r.city}, ${r.country}` : (r.city ?? "Onbekend"),
    count: r.count,
  }));

  // Always emit five rating buckets (1..5) so the chart axis is stable even
  // when some ratings are unused.
  const distByRating = new Map(distRows.map((r) => [r.rating, r.count]));
  const distribution = [1, 2, 3, 4, 5].map((rating) => ({
    rating,
    count: distByRating.get(rating) ?? 0,
  }));

  const avgRaw = avgRows[0]?.avg;
  const average = avgRaw == null ? null : Number(avgRaw);

  return {
    totals: {
      gigs: gigTotals[0]?.gigs ?? 0,
      artists: gigTotals[0]?.artists ?? 0,
      venues: venueTotals[0]?.venues ?? 0,
      festivals: venueTotals[0]?.festivals ?? 0,
      countries: Number(venueTotals[0]?.countries ?? 0),
      cities: Number(venueTotals[0]?.cities ?? 0),
    },
    topArtists,
    topVenues: topVenues as VenueCount[],
    topFestivals: topFestivals as VenueCount[],
    topCountries,
    topCities,
    gigsPerYear,
    ratings: {
      average,
      distribution,
      topRated: topRatedRows.map(toGigWithRelations),
    },
  };
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

interface MediaValues {
  gigId: string;
  storagePath: string;
  thumbnailPath: string | null;
  mediaType: MediaType;
  width: number | null;
  height: number | null;
}

export async function insertMedia(
  userId: string,
  values: MediaValues
): Promise<Media> {
  const [row] = await db
    .insert(media)
    .values({ userId, ...values })
    .returning();

  return toMedia(row);
}

// Delete a media row, scoped to the user, and return it so the caller knows
// which files to remove from disk. Returns null if nothing matched (e.g. it
// wasn't the user's media), in which case no files should be touched.
export async function deleteMedia(
  userId: string,
  id: string
): Promise<Media | null> {
  const [row] = await db
    .delete(media)
    .where(and(eq(media.userId, userId), eq(media.id, id)))
    .returning();

  return row ? toMedia(row) : null;
}

// Delete all media rows for a gig, returning them so the caller can remove the
// files. Used when deleting a whole gig (the media FK has no ON DELETE CASCADE,
// so the rows must go first, and the files with them).
export async function deleteMediaByGig(
  userId: string,
  gigId: string
): Promise<Media[]> {
  const rows = await db
    .delete(media)
    .where(and(eq(media.userId, userId), eq(media.gigId, gigId)))
    .returning();

  return rows.map(toMedia);
}

interface SetlistValues {
  setlistfmId: string;
  setlistfmUrl: string;
  songs: SetlistSong[];
}

// Save (or replace) the setlist for a gig. The unique gigId means fetching a
// setlist again overwrites the previous one instead of adding a second row.
export async function upsertSetlist(
  userId: string,
  gigId: string,
  values: SetlistValues
): Promise<void> {
  await db
    .insert(setlists)
    .values({ userId, gigId, ...values })
    .onConflictDoUpdate({
      target: setlists.gigId,
      set: {
        setlistfmId: values.setlistfmId,
        setlistfmUrl: values.setlistfmUrl,
        songs: values.songs,
        fetchedAt: new Date(),
      },
    });
}

// Delete the setlist for a gig, scoped to the user. Used both by the "remove
// setlist" action and when deleting a whole gig (the FK has no cascade).
export async function deleteSetlistByGig(
  userId: string,
  gigId: string
): Promise<void> {
  await db
    .delete(setlists)
    .where(and(eq(setlists.userId, userId), eq(setlists.gigId, gigId)));
}

// --- Mapping helpers ------------------------------------------------------

type VenueRow = typeof venues.$inferSelect;
type GigJoinRow = {
  gig: typeof gigs.$inferSelect;
  artist: typeof artists.$inferSelect;
  venue: VenueRow;
};

function toMedia(m: typeof media.$inferSelect): Media {
  return {
    id: m.id,
    user_id: m.userId,
    gig_id: m.gigId,
    storage_path: m.storagePath,
    thumbnail_path: m.thumbnailPath,
    media_type: m.mediaType as MediaType,
    width: m.width,
    height: m.height,
    created_at: m.createdAt?.toISOString() ?? "",
  };
}

function toArtist(a: typeof artists.$inferSelect): Artist {
  return {
    id: a.id,
    user_id: a.userId,
    name: a.name,
    created_at: a.createdAt?.toISOString() ?? "",
  };
}

function toSetlist(s: typeof setlists.$inferSelect): Setlist {
  return {
    id: s.id,
    user_id: s.userId,
    gig_id: s.gigId,
    setlistfm_id: s.setlistfmId,
    setlistfm_url: s.setlistfmUrl,
    songs: s.songs,
    fetched_at: s.fetchedAt?.toISOString() ?? "",
    created_at: s.createdAt?.toISOString() ?? "",
  };
}

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
