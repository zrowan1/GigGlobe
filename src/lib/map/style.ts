// Map styling for the world map / globe.
//
// We use OpenFreeMap (https://openfreemap.org) for the base map: free vector
// tiles, no API key, no account — and self-hostable later if we ever want to.
// Its styles are plain MapLibre style JSON, so we get full control over the
// art style.
//
// Rather than vendoring a 300-layer style file, we start from OpenFreeMap's
// hosted "positron" style and recolour it on load to GigGlobe's dark theme via
// `applyArtStyle()`. Tweak the ART_STYLE palette below to change the look. If
// you ever want total control over every layer, download the style JSON into
// public/ and point MAP_STYLE_URL at it instead.

import type { Map as MapLibreMap } from "maplibre-gl";

// Hosted OpenFreeMap base style. "positron" is a clean, minimal style that
// recolours nicely to a dark theme.
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

// GigGlobe's dark art-style palette. These are the colours applied to the base
// map on load. Change these to restyle the whole map.
export const ART_STYLE = {
  land: "#12161f", // background / landmass
  water: "#0e2238", // seas, lakes, rivers
  landuse: "#161b26", // parks, residential, etc. (subtle lift off land)
  building: "#1b212e",
  road: "#2a3140",
  roadMinor: "#222936",
  boundary: "#3a4254",
  label: "#c7cdd9", // place / poi text
  labelHalo: "#0b0e15", // dark halo so labels stay readable
} as const;

// Recolour the loaded base style to our dark theme. We walk the style's layers
// and recolour by layer type and id heuristics (rather than hard-coding exact
// layer ids), so it stays robust if OpenFreeMap tweaks its style. Each
// setPaintProperty is guarded because not every property applies to every
// layer.
export function applyArtStyle(map: MapLibreMap): void {
  const set = (layerId: string, prop: string, value: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.setPaintProperty(layerId, prop as any, value);
    } catch {
      // Property doesn't apply to this layer — ignore.
    }
  };

  for (const layer of map.getStyle().layers ?? []) {
    const id = layer.id.toLowerCase();

    switch (layer.type) {
      case "background":
        set(layer.id, "background-color", ART_STYLE.land);
        break;
      case "fill":
        if (id.includes("water")) set(layer.id, "fill-color", ART_STYLE.water);
        else if (id.includes("building"))
          set(layer.id, "fill-color", ART_STYLE.building);
        else if (
          id.includes("landuse") ||
          id.includes("landcover") ||
          id.includes("park") ||
          id.includes("wood") ||
          id.includes("forest")
        )
          set(layer.id, "fill-color", ART_STYLE.landuse);
        else set(layer.id, "fill-color", ART_STYLE.land);
        break;
      case "line":
        if (id.includes("water") || id.includes("waterway"))
          set(layer.id, "line-color", ART_STYLE.water);
        else if (id.includes("boundary") || id.includes("admin"))
          set(layer.id, "line-color", ART_STYLE.boundary);
        else if (id.includes("minor") || id.includes("service") || id.includes("path"))
          set(layer.id, "line-color", ART_STYLE.roadMinor);
        else set(layer.id, "line-color", ART_STYLE.road);
        break;
      case "symbol":
        set(layer.id, "text-color", ART_STYLE.label);
        set(layer.id, "text-halo-color", ART_STYLE.labelHalo);
        break;
      default:
        break;
    }
  }
}
