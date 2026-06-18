// Map styling for the world map / globe — "Neon Nights" art style.
//
// We use OpenFreeMap (https://openfreemap.org) for the base vector tiles: free,
// no API key, no account, self-hostable later. Its styles are plain MapLibre
// style JSON, so we get full control over the look.
//
// Rather than vendoring a 300-layer style file, we start from OpenFreeMap's
// hosted "positron" style and aggressively recolour it on load via
// `applyArtStyle()` into a deep-space synthwave look: near-black purple land,
// inky water, neon magenta/cyan accents, most map "noise" (POI/road labels,
// buildings) dialled right down so it never feels like Google Maps. The globe
// gets a glowing atmosphere (`applySky`) and a faint cyan graticule grid
// (`buildGraticule`). Tweak the NEON palette below to restyle everything.

import type { Map as MapLibreMap } from "maplibre-gl";

// Hosted OpenFreeMap base style. "positron" is a clean, minimal style that
// recolours nicely into a dark neon theme.
export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

// Where the camera starts: a zoomed-out view of the whole world so the globe
// is visible on first load.
export const INITIAL_VIEW_STATE = {
  longitude: 5,
  latitude: 30,
  zoom: 1.4,
};

// MapLibre v5's globe projection: a 3D globe when zoomed out that flattens to
// a regular map as you zoom in.
export const GLOBE_PROJECTION = "globe" as const;
export const FLAT_PROJECTION = "mercator" as const;

// "Neon Nights" palette. Two neon accents (magenta + cyan) over a deep
// purple-black base. Change these to restyle the whole map.
export const NEON = {
  magenta: "#ff2d95",
  magentaBright: "#ff7ac6",
  cyan: "#00e5ff",
  purple: "#8b5cf6",
} as const;

const ART_STYLE = {
  space: "#0a0613", // background / deep space
  land: "#160d2b", // landmass
  landAlt: "#1a1033", // subtle land variation (landuse)
  water: "#0c0820", // seas, lakes, rivers
  building: "#1f1240", // barely-there building fills
  road: "#241544", // major roads (very muted)
  roadMinor: "#1b0f33", // minor roads
  boundary: "#6d28d9", // country / admin borders (muted neon purple)
  label: "#cbb8ff", // place / country text (light lavender)
  labelHalo: "#0a0613", // dark halo so labels stay readable
} as const;

// Layer-id fragments whose symbol layers we hide entirely to kill map "noise"
// and keep the stylised, sparse feel: POIs, road shields/names, house numbers.
const HIDDEN_LABEL_HINTS = [
  "poi",
  "road",
  "street",
  "housenum",
  "building",
  "transit",
  "rail",
  "ferry",
  "aeroway",
  "airport",
];

// Recolour the loaded base style into the neon theme. We walk the style's
// layers and recolour by layer type + id heuristics (rather than hard-coding
// exact layer ids), so it stays robust if OpenFreeMap tweaks its style. Each
// setPaintProperty is guarded because not every property applies to every
// layer.
export function applyArtStyle(map: MapLibreMap): void {
  const setPaint = (layerId: string, prop: string, value: string | number) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.setPaintProperty(layerId, prop as any, value as any);
    } catch {
      // Property doesn't apply to this layer — ignore.
    }
  };

  for (const layer of map.getStyle().layers ?? []) {
    const id = layer.id.toLowerCase();

    switch (layer.type) {
      case "background":
        setPaint(layer.id, "background-color", ART_STYLE.space);
        break;
      case "fill":
        if (id.includes("water")) {
          setPaint(layer.id, "fill-color", ART_STYLE.water);
        } else if (id.includes("building")) {
          setPaint(layer.id, "fill-color", ART_STYLE.building);
          setPaint(layer.id, "fill-opacity", 0.25);
        } else if (
          id.includes("landuse") ||
          id.includes("landcover") ||
          id.includes("park") ||
          id.includes("wood") ||
          id.includes("forest")
        ) {
          setPaint(layer.id, "fill-color", ART_STYLE.landAlt);
        } else {
          setPaint(layer.id, "fill-color", ART_STYLE.land);
        }
        break;
      case "line":
        if (id.includes("water") || id.includes("waterway")) {
          setPaint(layer.id, "line-color", ART_STYLE.water);
        } else if (id.includes("boundary") || id.includes("admin")) {
          setPaint(layer.id, "line-color", ART_STYLE.boundary);
          setPaint(layer.id, "line-opacity", 0.5);
        } else if (
          id.includes("minor") ||
          id.includes("service") ||
          id.includes("path")
        ) {
          setPaint(layer.id, "line-color", ART_STYLE.roadMinor);
        } else {
          setPaint(layer.id, "line-color", ART_STYLE.road);
        }
        break;
      case "symbol": {
        // Hide noisy labels entirely; recolour the rest (place/country names).
        if (HIDDEN_LABEL_HINTS.some((hint) => id.includes(hint))) {
          try {
            map.setLayoutProperty(layer.id, "visibility", "none");
          } catch {
            // ignore
          }
        } else {
          setPaint(layer.id, "text-color", ART_STYLE.label);
          setPaint(layer.id, "text-halo-color", ART_STYLE.labelHalo);
          setPaint(layer.id, "text-halo-width", 1.4);
        }
        break;
      }
      default:
        break;
    }
  }
}

// Glowing neon atmosphere around the globe. MapLibre v5's `sky` spec renders an
// atmospheric halo on the globe; we tint it magenta so the planet looks lit by
// a neon sunset. The atmosphere fades out as you zoom in (back to a flat map).
export function applySky(map: MapLibreMap): void {
  try {
    map.setSky({
      "sky-color": ART_STYLE.space,
      "sky-horizon-blend": 0.7,
      "horizon-color": "#3a1a5c",
      "horizon-fog-blend": 0.6,
      "fog-color": NEON.magenta,
      "fog-ground-blend": 0.5,
      "atmosphere-blend": [
        "interpolate",
        ["linear"],
        ["zoom"],
        0,
        0.9,
        5,
        0.5,
        9,
        0,
      ],
    });
  } catch {
    // Older renderers without sky support — ignore.
  }
}

// A faint graticule (lines of latitude/longitude) drawn over the globe for a
// "navigation / star-chart" feel. Returns a GeoJSON FeatureCollection of
// densely-sampled line strings so they curve nicely on the 3D globe.
export function buildGraticule(stepDeg = 20): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  // Meridians (lines of longitude).
  for (let lon = -180; lon <= 180; lon += stepDeg) {
    const coordinates: [number, number][] = [];
    for (let lat = -85; lat <= 85; lat += 3) coordinates.push([lon, lat]);
    features.push({
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates },
    });
  }

  // Parallels (lines of latitude).
  for (let lat = -60; lat <= 60; lat += stepDeg) {
    const coordinates: [number, number][] = [];
    for (let lon = -180; lon <= 180; lon += 3) coordinates.push([lon, lat]);
    features.push({
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates },
    });
  }

  return { type: "FeatureCollection", features };
}
