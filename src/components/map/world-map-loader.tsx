"use client";

// Loads the actual MapLibre map only in the browser. MapLibre can't render on
// the server (it needs `window` and a <canvas>), so we import it with
// `dynamic(..., { ssr: false })`. A `"use client"` wrapper is required because
// `ssr: false` is not allowed in Server Components.

import dynamic from "next/dynamic";

import type { VenueWithGigCount } from "@/types";

const WorldMap = dynamic(
  () => import("@/components/map/world-map").then((m) => m.WorldMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#0a0613] text-sm text-[#cbb8ff]">
        Kaart laden…
      </div>
    ),
  }
);

interface WorldMapLoaderProps {
  venues: VenueWithGigCount[];
}

export function WorldMapLoader({ venues }: WorldMapLoaderProps) {
  return <WorldMap venues={venues} />;
}
