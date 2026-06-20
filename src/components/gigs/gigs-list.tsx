import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";

import type { GigWithRelations } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Format an ISO date ("2026-06-13") as a readable Dutch date.
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// The list of gigs (newest first). Used both on the standalone /gigs page and
// in the right-hand panel / mobile tab of the home view, so it lives in one
// reusable component. It renders its own empty state.
export function GigsList({ gigs }: { gigs: GigWithRelations[] }) {
  if (gigs.length === 0) {
    return (
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
    );
  }

  return (
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
  );
}
