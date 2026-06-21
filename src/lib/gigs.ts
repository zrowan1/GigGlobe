// Small presentation helpers that derive view data from a list of gigs.
// These live outside the DB layer because they only reshape data we already
// fetched (no database access, no user scoping needed here).

import type { GigWithRelations, VenueWithGigCount } from "@/types";

// Collapse a gig list into its unique venues, each tagged with how many of
// those gigs happened there. Used to feed the embedded mini-map on the artist
// and venue detail pages without an extra query. Venue order follows first
// appearance in the (newest-first) gig list.
export function venuesFromGigs(gigs: GigWithRelations[]): VenueWithGigCount[] {
  const byId = new Map<string, VenueWithGigCount>();

  for (const gig of gigs) {
    const existing = byId.get(gig.venue.id);
    if (existing) {
      existing.gig_count += 1;
      continue;
    }
    byId.set(gig.venue.id, {
      ...gig.venue,
      // GigWithRelations only carries a subset of Venue; the mini-map needs
      // user_id/created_at on the type but never reads them, so fill them in.
      user_id: gig.user_id,
      created_at: gig.created_at,
      gig_count: 1,
    });
  }

  return [...byId.values()];
}

// The number of distinct, non-empty countries across a gig list.
export function countriesFromGigs(gigs: GigWithRelations[]): number {
  const set = new Set<string>();
  for (const gig of gigs) {
    if (gig.venue.country) set.add(gig.venue.country);
  }
  return set.size;
}

// The number of distinct artists across a gig list (for the venue page).
export function artistsFromGigs(gigs: GigWithRelations[]): number {
  return new Set(gigs.map((g) => g.artist.id)).size;
}
