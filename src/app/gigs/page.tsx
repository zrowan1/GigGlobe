import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { GigWithRelations } from "@/types";

// Format an ISO date ("2026-06-13") as a readable Dutch date.
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// List of all your gigs, newest first. This is the page you land on after
// adding one, so it doubles as the "did it work?" confirmation.
export default async function GigsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("gigs")
    .select(
      "*, artist:artists(id,name), venue:venues(id,name,type,city,country,latitude,longitude)"
    )
    .order("gig_date", { ascending: false });

  const gigs = (data as GigWithRelations[] | null) ?? [];

  return (
    <main className="mx-auto w-full max-w-2xl p-4">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Optredens</h1>
        <Button asChild>
          <Link href="/gigs/new">
            <Plus /> Nieuw
          </Link>
        </Button>
      </div>

      {gigs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-4xl">🎤</p>
            <div>
              <p className="font-medium">Nog geen optredens</p>
              <p className="text-sm text-muted-foreground">
                Voeg je eerste concert of festival toe — daarna verschijnt het
                hier.
              </p>
            </div>
            <Button asChild>
              <Link href="/gigs/new">
                <Plus /> Eerste optreden toevoegen
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-3">
          {gigs.map((gig) => (
            <li key={gig.id}>
              <Link href={`/gigs/${gig.id}`} className="block">
                <Card className="transition-colors hover:bg-accent">
                  <CardContent className="flex items-center justify-between gap-3 py-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{gig.artist.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {gig.venue.name}
                        {gig.venue.city ? ` · ${gig.venue.city}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(gig.gig_date)}
                        {gig.rating ? ` · ${"★".repeat(gig.rating)}` : ""}
                      </p>
                    </div>
                    <ChevronRight className="shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
