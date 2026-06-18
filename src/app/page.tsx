import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, Plus } from "lucide-react";

import { auth } from "@/lib/auth";
import { signOut } from "@/app/actions";
import { getGigStats, listVenuesWithGigCounts } from "@/lib/db/queries";
import { Button } from "@/components/ui/button";
import { WorldMapLoader } from "@/components/map/world-map-loader";

// Home page = the world map. Every venue shows up as a pin on the globe, with
// a stats counter and quick links overlaid on top.
export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [venues, stats] = await Promise.all([
    listVenuesWithGigCounts(session.user.id),
    getGigStats(session.user.id),
  ]);

  return (
    <main className="relative h-svh w-full overflow-hidden">
      <WorldMapLoader venues={venues} />

      {/* Brand + stats counter, top-left. */}
      <div className="pointer-events-none absolute left-2 top-2 z-10 flex flex-col gap-2">
        <div className="pointer-events-auto rounded-lg border border-[#00e5ff]/40 bg-[#0a0613]/85 px-3 py-2 shadow-[0_0_18px_rgba(255,45,149,0.3)] backdrop-blur">
          <p className="text-sm font-semibold tracking-wide text-[#ff7ac6]">
            🌍 GigGlobe
          </p>
          <p className="text-xs text-[#cbb8ff]">
            {stats.gigs} {stats.gigs === 1 ? "optreden" : "optredens"} ·{" "}
            {stats.venues} {stats.venues === 1 ? "venue" : "venues"} ·{" "}
            {stats.countries} {stats.countries === 1 ? "land" : "landen"}
          </p>
        </div>
      </div>

      {/* Quick actions, bottom. */}
      <div className="absolute inset-x-2 bottom-2 z-10 flex items-center justify-center gap-2">
        <Button asChild size="sm">
          <Link href="/gigs/new">
            <Plus /> Nieuw
          </Link>
        </Button>
        <Button asChild size="sm" variant="secondary">
          <Link href="/gigs">Mijn optredens</Link>
        </Button>
        <form action={signOut}>
          <Button size="sm" variant="outline" type="submit" aria-label="Uitloggen">
            <LogOut />
          </Button>
        </form>
      </div>

      {/* Empty state: no venues yet. */}
      {venues.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-4">
          <div className="pointer-events-auto max-w-xs rounded-xl border border-[#00e5ff]/40 bg-[#0a0613]/90 p-6 text-center shadow-[0_0_28px_rgba(255,45,149,0.35)] backdrop-blur">
            <p className="text-4xl">🎤</p>
            <p className="mt-3 font-medium text-[#ff7ac6]">Nog geen optredens</p>
            <p className="mt-1 text-sm text-[#cbb8ff]">
              Voeg je eerste concert of festival toe — dan verschijnt het hier
              als pin op de wereld.
            </p>
            <Button asChild className="mt-4 w-full">
              <Link href="/gigs/new">
                <Plus /> Eerste optreden toevoegen
              </Link>
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
