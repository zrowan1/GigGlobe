import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/lib/auth";
import { getArtist, listGigsByArtist } from "@/lib/db/queries";
import { countriesFromGigs, venuesFromGigs } from "@/lib/gigs";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { GigsList } from "@/components/gigs/gigs-list";
import { WorldMapLoader } from "@/components/map/world-map-loader";

// Detail page for one artist: every gig where you saw them, a mini-map of the
// venues, and a few headline numbers. All data comes from gigs we already have
// (no new tables), scoped to the logged-in user.
export default async function ArtistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const artist = await getArtist(session.user.id, id);
  if (!artist) notFound();

  const gigs = await listGigsByArtist(session.user.id, id);
  const venues = venuesFromGigs(gigs);
  const countries = countriesFromGigs(gigs);

  return (
    <main className="mx-auto w-full max-w-lg p-4">
      <div className="mb-6 flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link href="/gigs" aria-label="Terug naar overzicht">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="truncate text-xl font-semibold">{artist.name}</h1>
        <ThemeToggle className="ml-auto shrink-0" />
      </div>

      {/* Headline numbers, derived from the gig list. */}
      <p className="mb-4 text-sm text-muted-foreground">
        {gigs.length} keer gezien ·{" "}
        {venues.length} {venues.length === 1 ? "venue" : "venues"} ·{" "}
        {countries} {countries === 1 ? "land" : "landen"}
      </p>

      {/* Mini-map of the venues you saw this artist at. */}
      {venues.length > 0 && (
        <div className="mb-6 h-64 overflow-hidden rounded-xl border border-border">
          <WorldMapLoader venues={venues} compact />
        </div>
      )}

      <GigsList gigs={gigs} />
    </main>
  );
}
