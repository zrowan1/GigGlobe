import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteGigButton } from "@/components/gigs/delete-gig-button";
import type { GigWithRelations } from "@/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Detail page for a single gig. In Phase 3 this is where the photo/video
// gallery will live; for now it shows the details and the edit/delete actions.
export default async function GigDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("gigs")
    .select(
      "*, artist:artists(id,name), venue:venues(id,name,type,city,country,latitude,longitude)"
    )
    .eq("id", id)
    .maybeSingle();

  const gig = data as GigWithRelations | null;
  if (!gig) notFound();

  const location = [gig.venue.city, gig.venue.country].filter(Boolean).join(", ");

  return (
    <main className="mx-auto w-full max-w-lg p-4">
      <div className="mb-6 flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link href="/gigs" aria-label="Terug naar overzicht">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="truncate text-xl font-semibold">{gig.artist.name}</h1>
      </div>

      <Card>
        <CardContent className="grid gap-4 py-6">
          <Detail label="Datum" value={formatDate(gig.gig_date)} />
          <Detail
            label={gig.venue.type === "festival" ? "Festival" : "Venue"}
            value={location ? `${gig.venue.name} — ${location}` : gig.venue.name}
          />
          {gig.rating && (
            <Detail label="Beoordeling" value={"★".repeat(gig.rating)} />
          )}
          {gig.notes && <Detail label="Notities" value={gig.notes} />}
        </CardContent>
      </Card>

      {/* Media gallery placeholder — built in Phase 3. */}
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Foto&apos;s en video&apos;s komen hier in een latere fase.
      </p>

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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="whitespace-pre-wrap">{value}</span>
    </div>
  );
}
