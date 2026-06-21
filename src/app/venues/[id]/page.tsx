import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/lib/auth";
import { getVenue, listGigsByVenue } from "@/lib/db/queries";
import { artistsFromGigs, venuesFromGigs } from "@/lib/gigs";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { GigsList } from "@/components/gigs/gigs-list";
import { WorldMapLoader } from "@/components/map/world-map-loader";

// Detail page for one venue: every gig you saw there, a pin on a mini-map, and
// a couple of headline numbers. Data is derived from gigs we already have,
// scoped to the logged-in user.
export default async function VenueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const venue = await getVenue(session.user.id, id);
  if (!venue) notFound();

  const gigs = await listGigsByVenue(session.user.id, id);
  const venues = venuesFromGigs(gigs);
  const artistCount = artistsFromGigs(gigs);

  const location = [venue.city, venue.country].filter(Boolean).join(", ");

  return (
    <main className="mx-auto w-full max-w-lg p-4">
      <div className="mb-2 flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link href="/gigs" aria-label="Terug naar overzicht">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="truncate text-xl font-semibold">
          {venue.type === "festival" ? "🎪" : "🎵"} {venue.name}
        </h1>
        <ThemeToggle className="ml-auto shrink-0" />
      </div>

      {location && (
        <p className="mb-4 text-sm text-muted-foreground">{location}</p>
      )}

      {/* Headline numbers, derived from the gig list. */}
      <p className="mb-4 text-sm text-muted-foreground">
        {gigs.length} {gigs.length === 1 ? "optreden" : "optredens"} ·{" "}
        {artistCount} {artistCount === 1 ? "artiest" : "artiesten"}
      </p>

      {/* Mini-map with this venue as a single pin. */}
      {venues.length > 0 && (
        <div className="mb-6 h-64 overflow-hidden rounded-xl border border-border">
          <WorldMapLoader venues={venues} compact />
        </div>
      )}

      <GigsList gigs={gigs} />
    </main>
  );
}
