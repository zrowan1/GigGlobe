"use client";

// Recharts wrappers for the statistics page. These are the only client
// components in the stats feature — the page and <StatsView /> stay on the
// server and just hand plain data down. Colours reference the app's CSS
// variables / brand neon so charts track the light/dark theme.

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { NameCount, RatingBucket, YearCount } from "@/types";

const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 12 };
const AXIS_LINE = { stroke: "var(--border)" };

// Shared tooltip styling so the box matches popover colours in both themes.
const TOOLTIP_PROPS = {
  cursor: { fill: "var(--muted)", opacity: 0.4 },
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--popover-foreground)",
    fontSize: 12,
  },
  labelStyle: { color: "var(--popover-foreground)" },
  itemStyle: { color: "var(--popover-foreground)" },
} as const;

// A horizontal ranking (artists / venues / festivals / countries / cities):
// one bar per row, longest at the top, with the count labelled at the end.
export function BarRanking({
  data,
  color,
}: {
  data: NameCount[];
  color: string;
}) {
  const height = Math.max(data.length * 34 + 16, 80);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 0, right: 32, bottom: 0, left: 0 }}
        barCategoryGap={6}
      >
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={130}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <Tooltip {...TOOLTIP_PROPS} />
        <Bar dataKey="count" fill={color} radius={[0, 4, 4, 0]}>
          <LabelList
            dataKey="count"
            position="right"
            style={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// Gigs per year, as vertical bars across time.
export function TimelineChart({
  data,
  color,
}: {
  data: YearCount[];
  color: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis
          dataKey="year"
          tick={AXIS_TICK}
          axisLine={AXIS_LINE}
          tickLine={false}
        />
        <YAxis
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip {...TOOLTIP_PROPS} />
        <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Rating distribution: how many gigs got 1..5 stars. Each bar is tinted from
// the destructive (low) towards the brand pink (high) for a quick read.
const RATING_COLORS = ["#7a7a8c", "#a06cc4", "#c44d9e", "#ff2d95", "#ff5fb0"];

export function RatingChart({ data }: { data: RatingBucket[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis
          dataKey="rating"
          tickFormatter={(r: number) => "★".repeat(r)}
          tick={AXIS_TICK}
          axisLine={AXIS_LINE}
          tickLine={false}
        />
        <YAxis
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip {...TOOLTIP_PROPS} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.rating} fill={RATING_COLORS[entry.rating - 1]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
