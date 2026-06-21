import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";

import { auth } from "@/lib/auth";
import { getGig, getSetlistByGig, listMediaByGig } from "@/lib/db/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { DeleteGigButton } from "@/components/gigs/delete-gig-button";
import { SetlistSection } from "@/components/gigs/setlist-section";
import { MediaGallery } from "@/components/media/media-gallery";
import { MediaUploader } from "@/components/media/media-uploader";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Detail page for a single gig: the details, the photo/video gallery, and the
// edit/delete actions. The artist and venue link through to their own pages.
export default async function GigDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const gig = await getGig(session.user.id, id);
  if (!gig) notFound();

  const media = await listMediaByGig(session.user.id, id);
  const setlist = await getSetlistByGig(session.user.id, id);

  const location = [gig.venue.city, gig.venue.country].filter(Boolean).join(", ");

  return (
    <main className="mx-auto w-full max-w-lg p-4">
      <div className="mb-6 flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link href="/gigs" aria-label="Terug naar overzicht">
            <ArrowLeft />
          </Link>
        </Button>
        <Link
          href={`/artists/${gig.artist_id}`}
          className="truncate text-xl font-semibold underline decoration-muted-foreground/40 underline-offset-4 hover:decoration-foreground"
        >
          {gig.artist.name}
        </Link>
        <ThemeToggle className="ml-auto shrink-0" />
      </div>

      <Card>
        <CardContent className="grid gap-4 py-6">
          <Detail label="Datum" value={formatDate(gig.gig_date)} />
          <Detail
            label={gig.venue.type === "festival" ? "Festival" : "Venue"}
            value={location ? `${gig.venue.name} — ${location}` : gig.venue.name}
            href={`/venues/${gig.venue_id}`}
          />
          {gig.rating && (
            <Detail label="Beoordeling" value={"★".repeat(gig.rating)} />
          )}
          {gig.notes && <Detail label="Notities" value={gig.notes} />}
        </CardContent>
      </Card>

      {/* Setlist (songs played), fetched from setlist.fm. */}
      <section className="mt-6 grid gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Setlist
        </h2>
        <SetlistSection
          gigId={gig.id}
          artistName={gig.artist.name}
          gigDate={gig.gig_date}
          cityName={gig.venue.city}
          setlist={setlist}
        />
      </section>

      {/* Photo/video memories for this gig. */}
      <section className="mt-6 grid gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Foto&apos;s &amp; video&apos;s
        </h2>
        <MediaUploader gigId={gig.id} />
        <MediaGallery media={media} />
      </section>

      <div className="mt-6 grid gap-3">
        <Button asChild variant="outline" className="w-full">
          <Link href={`/gigs/${gig.id}/edit`}>
            <Pencil /> Bewerken
          </Link>
        </Button>
        <DeleteGigButton gigId={gig.id} />
      </div>
    </main>
  );
}

function Detail({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="grid gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {href ? (
        <Link
          href={href}
          className="whitespace-pre-wrap underline decoration-muted-foreground/40 underline-offset-4 hover:decoration-foreground"
        >
          {value}
        </Link>
      ) : (
        <span className="whitespace-pre-wrap">{value}</span>
      )}
    </div>
  );
}
