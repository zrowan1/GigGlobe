"use client";

// The interactive world map / globe. Shows one pin per venue, clusters nearby
// venues when zoomed out, and opens a popup with the gig count on click.
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
  FLAT_PROJECTION,
  GLOBE_PROJECTION,
  INITIAL_VIEW_STATE,
  MAP_STYLE_URL,
} from "@/lib/map/style";

const SOURCE_ID = "venues";

// Layer styling. Clusters are stepped by how many venues they contain; single
// venue pins grow slightly with their gig count.
const clusterLayer: LayerProps = {
  id: "clusters",
  type: "circle",
  source: SOURCE_ID,
  filter: ["has", "point_count"],
  paint: {
    "circle-color": [
      "step",
      ["get", "point_count"],
      "#6366f1",
      10,
      "#8b5cf6",
      30,
      "#d946ef",
    ],
    "circle-radius": ["step", ["get", "point_count"], 16, 10, 22, 30, 30],
    "circle-stroke-width": 2,
    "circle-stroke-color": "#0b0e15",
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
  paint: { "text-color": "#ffffff" },
};

const unclusteredPointLayer: LayerProps = {
  id: "unclustered-point",
  type: "circle",
  source: SOURCE_ID,
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": "#f43f5e",
    "circle-radius": [
      "interpolate",
      ["linear"],
      ["get", "gigCount"],
      1,
      6,
      10,
      12,
    ],
    "circle-stroke-width": 2,
    "circle-stroke-color": "#ffffff",
  },
};

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

  // Keep the live map projection in sync with our toggle.
  useEffect(() => {
    mapRef.current?.getMap().setProjection({ type: projection });
  }, [projection]);

  const handleLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.setProjection({ type: GLOBE_PROJECTION });
    applyArtStyle(map);

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

      <Source
        id={SOURCE_ID}
        type="geojson"
        data={geojson}
        cluster
        clusterRadius={50}
        clusterMaxZoom={8}
      >
        <Layer {...clusterLayer} />
        <Layer {...clusterCountLayer} />
        <Layer {...unclusteredPointLayer} />
      </Source>

      {popup && (
        <Popup
          longitude={popup.longitude}
          latitude={popup.latitude}
          anchor="bottom"
          offset={12}
          closeOnClick={false}
          onClose={() => setPopup(null)}
        >
          <div className="space-y-1 text-foreground">
            <p className="font-medium">
              {popup.type === "festival" ? "🎪" : "🎵"} {popup.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {popup.gigCount} {popup.gigCount === 1 ? "optreden" : "optredens"}
            </p>
            <Link
              href="/gigs"
              className="text-sm font-medium text-primary underline"
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
        className="absolute right-2 top-24 z-10 flex h-8 w-8 items-center justify-center rounded-md border bg-background/90 text-foreground shadow-sm backdrop-blur hover:bg-accent"
        aria-label={
          projection === GLOBE_PROJECTION
            ? "Toon platte kaart"
            : "Toon globe"
        }
        title={
          projection === GLOBE_PROJECTION ? "Platte kaart" : "Globe"
        }
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
