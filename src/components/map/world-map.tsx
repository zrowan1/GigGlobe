"use client";

// The interactive world map / globe — "Neon Nights" art style. Shows one
// glowing neon pin per venue, clusters nearby venues when zoomed out, and opens
// a neon popup with the gig count on click. A faint cyan graticule and a magenta
// atmosphere give the globe a synthwave / star-chart look.
//
// MapLibre renders to a <canvas> and touches `window`, so this component is
// only ever loaded client-side (see world-map-loader.tsx).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Map,
  Source,
  Layer,
  Popup,
  NavigationControl,
  type LayerProps,
  type MapLayerMouseEvent,
  type MapRef,
} from "react-map-gl/maplibre";
import { LngLatBounds, type GeoJSONSource } from "maplibre-gl";
import { Globe, Map as MapIcon } from "lucide-react";

import type { VenueWithGigCount } from "@/types";
import {
  applyArtStyle,
  applySky,
  buildGraticule,
  FLAT_PROJECTION,
  GLOBE_PROJECTION,
  INITIAL_VIEW_STATE,
  MAP_STYLE_URL,
  NEON,
} from "@/lib/map/style";

const SOURCE_ID = "venues";
const GRATICULE_ID = "graticule";

// --- Graticule: faint cyan grid lines over the globe ----------------------
const graticuleLayer: LayerProps = {
  id: "graticule-lines",
  type: "line",
  source: GRATICULE_ID,
  paint: {
    "line-color": NEON.cyan,
    "line-width": 0.5,
    "line-opacity": 0.1,
  },
};

// --- Clusters: a soft neon glow under a gradient core + count -------------
const clusterGlowLayer: LayerProps = {
  id: "cluster-glow",
  type: "circle",
  source: SOURCE_ID,
  filter: ["has", "point_count"],
  paint: {
    "circle-color": NEON.magenta,
    "circle-radius": ["step", ["get", "point_count"], 26, 10, 34, 30, 44],
    "circle-blur": 1,
    "circle-opacity": 0.45,
  },
};

const clusterLayer: LayerProps = {
  id: "clusters",
  type: "circle",
  source: SOURCE_ID,
  filter: ["has", "point_count"],
  paint: {
    // Small clusters glow cyan, growing through purple to hot magenta.
    "circle-color": [
      "step",
      ["get", "point_count"],
      NEON.cyan,
      10,
      NEON.purple,
      30,
      NEON.magenta,
    ],
    "circle-radius": ["step", ["get", "point_count"], 15, 10, 21, 30, 28],
    "circle-stroke-width": 1.5,
    "circle-stroke-color": "#ffffff",
    "circle-stroke-opacity": 0.85,
  },
};

const clusterCountLayer: LayerProps = {
  id: "cluster-count",
  type: "symbol",
  source: SOURCE_ID,
  filter: ["has", "point_count"],
  layout: {
    "text-field": ["get", "point_count_abbreviated"],
    "text-font": ["Noto Sans Bold"],
    "text-size": 13,
  },
  paint: {
    "text-color": "#ffffff",
    "text-halo-color": "#0a0613",
    "text-halo-width": 1,
  },
};

// --- Single venue: blurred magenta glow + bright core with a cyan ring -----
const pointGlowLayer: LayerProps = {
  id: "point-glow",
  type: "circle",
  source: SOURCE_ID,
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": NEON.magenta,
    "circle-radius": [
      "interpolate",
      ["linear"],
      ["get", "gigCount"],
      1,
      14,
      10,
      26,
    ],
    "circle-blur": 1,
    "circle-opacity": 0.55,
  },
};

const unclusteredPointLayer: LayerProps = {
  id: "unclustered-point",
  type: "circle",
  source: SOURCE_ID,
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": NEON.magentaBright,
    "circle-radius": [
      "interpolate",
      ["linear"],
      ["get", "gigCount"],
      1,
      5,
      10,
      10,
    ],
    "circle-stroke-width": 2,
    "circle-stroke-color": NEON.cyan,
  },
};

// Only the solid hit-targets are interactive (not the soft glow halos).
const INTERACTIVE_LAYERS = ["clusters", "unclustered-point"];

interface PopupInfo {
  longitude: number;
  latitude: number;
  name: string;
  type: string;
  gigCount: number;
}

interface WorldMapProps {
  venues: VenueWithGigCount[];
}

export function WorldMap({ venues }: WorldMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [projection, setProjection] = useState<
    typeof GLOBE_PROJECTION | typeof FLAT_PROJECTION
  >(GLOBE_PROJECTION);
  const [popup, setPopup] = useState<PopupInfo | null>(null);

  // Turn the venues into a GeoJSON FeatureCollection that MapLibre can cluster.
  const geojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: venues.map((v) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [v.longitude, v.latitude],
        },
        properties: {
          venueId: v.id,
          name: v.name,
          type: v.type,
          gigCount: v.gig_count,
        },
      })),
    }),
    [venues]
  );

  // The graticule grid is static — build it once.
  const graticule = useMemo(() => buildGraticule(), []);

  // Keep the live map projection in sync with our toggle.
  useEffect(() => {
    mapRef.current?.getMap().setProjection({ type: projection });
  }, [projection]);

  const handleLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.setProjection({ type: GLOBE_PROJECTION });
    applyArtStyle(map);
    applySky(map);

    // Fit the camera to your venues so the globe opens already zoomed in on
    // wherever you've actually been (e.g. just Europe), instead of the whole
    // world. With no venues we keep the default world view.
    if (venues.length > 0) {
      const bounds = new LngLatBounds();
      for (const v of venues) bounds.extend([v.longitude, v.latitude]);
      map.fitBounds(bounds, { padding: 64, maxZoom: 6, duration: 0 });
    }
  }, [venues]);

  const handleClick = useCallback((event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    if (!feature) {
      setPopup(null);
      return;
    }

    const [longitude, latitude] = (feature.geometry as GeoJSON.Point)
      .coordinates;

    // Cluster: zoom in to expand it.
    if (feature.properties?.point_count) {
      const map = mapRef.current?.getMap();
      const source = map?.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      const clusterId = feature.properties.cluster_id as number;
      source
        ?.getClusterExpansionZoom(clusterId)
        .then((zoom) => map?.easeTo({ center: [longitude, latitude], zoom }))
        .catch(() => {});
      return;
    }

    // Single venue: open its popup.
    setPopup({
      longitude,
      latitude,
      name: feature.properties?.name as string,
      type: feature.properties?.type as string,
      gigCount: feature.properties?.gigCount as number,
    });
  }, []);

  return (
    <Map
      ref={mapRef}
      initialViewState={INITIAL_VIEW_STATE}
      mapStyle={MAP_STYLE_URL}
      interactiveLayerIds={INTERACTIVE_LAYERS}
      onLoad={handleLoad}
      onClick={handleClick}
      style={{ width: "100%", height: "100%" }}
    >
      <NavigationControl position="top-right" visualizePitch />

      {/* Faint neon grid over the globe. */}
      <Source id={GRATICULE_ID} type="geojson" data={graticule}>
        <Layer {...graticuleLayer} />
      </Source>

      <Source
        id={SOURCE_ID}
        type="geojson"
        data={geojson}
        cluster
        clusterRadius={50}
        clusterMaxZoom={8}
      >
        <Layer {...clusterGlowLayer} />
        <Layer {...clusterLayer} />
        <Layer {...clusterCountLayer} />
        <Layer {...pointGlowLayer} />
        <Layer {...unclusteredPointLayer} />
      </Source>

      {popup && (
        <Popup
          longitude={popup.longitude}
          latitude={popup.latitude}
          anchor="bottom"
          offset={16}
          closeOnClick={false}
          onClose={() => setPopup(null)}
          className="neon-popup"
        >
          <div className="space-y-1">
            <p className="font-semibold text-[#ff7ac6]">
              {popup.type === "festival" ? "🎪" : "🎵"} {popup.name}
            </p>
            <p className="text-sm text-[#cbb8ff]">
              {popup.gigCount} {popup.gigCount === 1 ? "optreden" : "optredens"}
            </p>
            <Link
              href="/gigs"
              className="text-sm font-medium text-[#00e5ff] underline decoration-[#00e5ff]/50 underline-offset-2 hover:decoration-[#00e5ff]"
            >
              Bekijk optredens
            </Link>
          </div>
        </Popup>
      )}

      {/* Manual globe ↔ flat toggle, on top of the automatic globe→flat zoom. */}
      <button
        type="button"
        onClick={() =>
          setProjection((p) =>
            p === GLOBE_PROJECTION ? FLAT_PROJECTION : GLOBE_PROJECTION
          )
        }
        className="absolute right-2 top-24 z-10 flex h-8 w-8 items-center justify-center rounded-md border border-[#00e5ff]/40 bg-[#0a0613]/80 text-[#00e5ff] shadow-[0_0_12px_rgba(0,229,255,0.35)] backdrop-blur transition-colors hover:bg-[#160d2b]"
        aria-label={
          projection === GLOBE_PROJECTION ? "Toon platte kaart" : "Toon globe"
        }
        title={projection === GLOBE_PROJECTION ? "Platte kaart" : "Globe"}
      >
        {projection === GLOBE_PROJECTION ? (
          <MapIcon className="h-4 w-4" />
        ) : (
          <Globe className="h-4 w-4" />
        )}
      </button>
    </Map>
  );
}
