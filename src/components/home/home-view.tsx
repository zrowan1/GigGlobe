"use client";

// The home screen. It combines the world map and the gigs list into one view:
//
//   - On desktop (lg+) the two sit side by side: map fills the left, the list
//     is a scrollable sidebar on the right.
//   - On mobile they become two tabs ("Kaart" / "Lijst"). The map stays mounted
//     the whole time (we only hide it with CSS), so switching tabs never throws
//     away the globe's zoom/rotation or reloads MapLibre.

import { useState } from "react";
import Link from "next/link";
import { List, LogOut, Map as MapIcon, Plus } from "lucide-react";

import { signOut } from "@/app/actions";
import type { GigStats, GigWithRelations, VenueWithGigCount } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/theme-toggle";
import { WorldMapLoader } from "@/components/map/world-map-loader";
import { GigsList } from "@/components/gigs/gigs-list";

// "Nieuw" + theme toggle + logout. Shown in the list-panel header (desktop +
// mobile list tab) and floating over the map on mobile.
function ActionButtons() {
  return (
    <div className="flex items-center gap-2">
      <Button asChild size="sm">
        <Link href="/gigs/new">
          <Plus /> Nieuw
        </Link>
      </Button>
      <ThemeToggle className="size-9" />
      <form action={signOut}>
        <Button size="icon" variant="outline" type="submit" aria-label="Uitloggen" className="size-9">
          <LogOut />
        </Button>
      </form>
    </div>
  );
}

interface HomeViewProps {
  venues: VenueWithGigCount[];
  stats: GigStats;
  gigs: GigWithRelations[];
}

export function HomeView({ venues, stats, gigs }: HomeViewProps) {
  const [tab, setTab] = useState<"map" | "list">("map");

  return (
    <main className="relative h-svh w-full overflow-hidden lg:grid lg:grid-cols-[1fr_minmax(320px,400px)]">
      {/* MAP PANEL ------------------------------------------------------- */}
      <section
        className={cn(
          "relative h-svh w-full overflow-hidden lg:block lg:h-svh",
          tab === "map" ? "block" : "hidden"
        )}
      >
        <WorldMapLoader venues={venues} />

        {/* Brand + stats, top-left. */}
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

        {/* Quick actions over the map — mobile only (desktop uses the sidebar
            header instead). */}
        <div className="absolute right-2 top-2 z-10 lg:hidden">
          <ActionButtons />
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
      </section>

      {/* LIST PANEL ------------------------------------------------------ */}
      <aside
        className={cn(
          "h-svh w-full overflow-y-auto bg-background lg:block lg:border-l lg:border-border",
          tab === "list" ? "block" : "hidden"
        )}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-background/95 p-3 backdrop-blur">
          <h2 className="text-lg font-semibold">Optredens</h2>
          <ActionButtons />
        </header>
        <div className="p-3 pb-24 lg:pb-3">
          <GigsList gigs={gigs} />
        </div>
      </aside>

      {/* MOBILE TAB SWITCHER (hidden on desktop, where both panels show). */}
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as "map" | "list")}
        className="absolute inset-x-0 bottom-3 z-20 flex justify-center lg:hidden"
      >
        <TabsList className="rounded-full shadow-lg">
          <TabsTrigger value="map" className="rounded-full px-4">
            <MapIcon /> Kaart
          </TabsTrigger>
          <TabsTrigger value="list" className="rounded-full px-4">
            <List /> Lijst
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </main>
  );
}
