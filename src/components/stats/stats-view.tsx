import Link from "next/link";
import type { ReactNode } from "react";

import type { DetailedStats, NameCount, VenueCount } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { BarRanking, RatingChart, TimelineChart } from "./charts";

// Brand neon colours, readable on both light and dark backgrounds.
const PINK = "#ff2d95";
const CYAN = "#00b4d8";
const PURPLE = "#9d7cff";

// Format an ISO date ("2026-06-13") as a readable Dutch date. (Same helper as
// the gigs list; kept local so the component has no extra dependency.)
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Turn ranked venues into the {name, count} shape the bar chart wants, folding
// the city into the label so two venues with the same name stay distinct.
function toRanking(venues: VenueCount[]): NameCount[] {
  return venues.map((v) => ({
    name: v.city ? `${v.name} (${v.city})` : v.name,
    count: v.count,
  }));
}

// A titled card wrapping one chart or block. Renders nothing when empty so the
// page never shows a chart with no bars.
function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty?: boolean;
  children: ReactNode;
}) {
  if (empty) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// One headline number with a label.
function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-0.5 py-4 text-center">
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}

export function StatsView({ stats }: { stats: DetailedStats }) {
  const { totals, ratings } = stats;
  const hasRatings = ratings.average != null;

  return (
    <div className="grid gap-6">
      {/* Headline totals. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile value={totals.gigs} label="optredens" />
        <StatTile value={totals.artists} label="artiesten" />
        <StatTile value={totals.venues} label="venues" />
        <StatTile value={totals.festivals} label="festivals" />
        <StatTile value={totals.countries} label="landen" />
        <StatTile value={totals.cities} label="steden" />
      </div>

      <Section title="Optredens per jaar" empty={stats.gigsPerYear.length === 0}>
        <TimelineChart data={stats.gigsPerYear} color={PINK} />
      </Section>

      <Section title="Meest geziene artiesten" empty={stats.topArtists.length === 0}>
        <BarRanking data={stats.topArtists} color={PINK} />
      </Section>

      <Section title="Meest bezochte venues" empty={stats.topVenues.length === 0}>
        <BarRanking data={toRanking(stats.topVenues)} color={CYAN} />
      </Section>

      <Section title="Meest bezochte festivals" empty={stats.topFestivals.length === 0}>
        <BarRanking data={toRanking(stats.topFestivals)} color={PURPLE} />
      </Section>

      <Section title="Landen" empty={stats.topCountries.length === 0}>
        <BarRanking data={stats.topCountries} color={CYAN} />
      </Section>

      <Section title="Steden" empty={stats.topCities.length === 0}>
        <BarRanking data={stats.topCities} color={PURPLE} />
      </Section>

      {/* Ratings: average + distribution + the highest-rated gigs. */}
      <Section title="Beoordelingen" empty={!hasRatings}>
        <div className="grid gap-6">
          <p className="text-sm text-muted-foreground">
            Gemiddelde beoordeling:{" "}
            <span className="font-medium text-foreground">
              {ratings.average?.toFixed(1)}
            </span>{" "}
            / 5
          </p>
          <RatingChart data={ratings.distribution} />

          {ratings.topRated.length > 0 && (
            <div className="grid gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Hoogst gewaardeerd
              </p>
              <ul className="grid gap-2">
                {ratings.topRated.map((gig) => (
                  <li key={gig.id}>
                    <Link href={`/gigs/${gig.id}`} className="block">
                      <Card className="transition-colors hover:bg-accent">
                        <CardContent className="flex items-center justify-between gap-3 py-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{gig.artist.name}</p>
                            <p className="truncate text-sm text-muted-foreground">
                              {gig.venue.name}
                              {gig.venue.city ? ` · ${gig.venue.city}` : ""}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(gig.gig_date)}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm text-[#ff2d95]">
                            {"★".repeat(gig.rating ?? 0)}
                          </span>
                        </CardContent>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
