"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  type GeoJSONSource,
  type MapMouseEvent,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Parcel, PilotSummary } from "@/lib/contract";
import { useI18n } from "@/lib/i18n";

export type MapViewMode = "default" | "relief" | "satellite";

type GeoJsonGeometry =
  | { type: "Point"; coordinates: [number, number] }
  | { type: "Polygon"; coordinates: number[][][] };

interface GeoJsonFeature {
  type: "Feature";
  properties: Record<string, string | number>;
  geometry: GeoJsonGeometry;
}

interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

const EMPTY_FC: GeoJsonFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

function buildGeodesicCircle(
  lat: number,
  lon: number,
  radiusMeters: number,
  steps = 64,
): GeoJsonFeature {
  const earthRadius = 6378137;
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  const angularDist = radiusMeters / earthRadius;
  const coords: [number, number][] = [];

  for (let i = 0; i < steps; i++) {
    const bearing = (2 * Math.PI * i) / steps;
    const sinLat =
      Math.sin(latRad) * Math.cos(angularDist) +
      Math.cos(latRad) * Math.sin(angularDist) * Math.cos(bearing);
    const ptLat = Math.asin(Math.max(-1, Math.min(1, sinLat)));
    const y = Math.sin(bearing) * Math.sin(angularDist) * Math.cos(latRad);
    const x = Math.cos(angularDist) - Math.sin(latRad) * Math.sin(ptLat);
    const ptLon = lonRad + Math.atan2(y, x);
    coords.push([(ptLon * 180) / Math.PI, (ptLat * 180) / Math.PI]);
  }
  if (coords[0]) {
    coords.push([coords[0][0], coords[0][1]]);
  }

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [coords],
    },
  };
}

function buildPickedCircleFC(lat: number, lon: number): GeoJsonFeatureCollection {
  return {
    type: "FeatureCollection",
    features: [buildGeodesicCircle(lat, lon, 250)],
  };
}

function buildPickedPinFC(lat: number, lon: number): GeoJsonFeatureCollection {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [lon, lat],
        },
      },
    ],
  };
}

/**
 * Calcula el diámetro en píxeles de un círculo de `radiusMeters` a la latitud y zoom actuales.
 * Mantiene un mínimo de 56 px para que el radio de selección sea siempre visible aunque el mapa esté alejado.
 */
function computeRadiusDiameterPx(lat: number, zoom: number, radiusMeters = 250): number {
  const metersPerPixel =
    (40075016.686 * Math.cos((lat * Math.PI) / 180)) / (512 * Math.pow(2, zoom));
  const rawRadiusPx = metersPerPixel > 0 ? radiusMeters / metersPerPixel : 36;
  return Math.max(56, Math.min(280, Math.round(rawRadiusPx * 2)));
}

function getPolygonBounds(coordinates: number[][][]): LngLatBounds | null {
  const ring = coordinates[0];
  const first = ring?.[0];
  if (!ring || !first || first[0] === undefined || first[1] === undefined) {
    return null;
  }
  const bounds = new LngLatBounds([first[0], first[1]], [first[0], first[1]]);
  for (const pt of ring) {
    if (pt[0] !== undefined && pt[1] !== undefined) {
      bounds.extend([pt[0], pt[1]]);
    }
  }
  return bounds;
}

function whenStyleReady(map: MapLibreMap, fn: () => void): void {
  if (map.getSource("parcel-polygon") && map.getLayer("layer-osm")) {
    fn();
    return;
  }
  const onStyleData = () => {
    if (map.getSource("parcel-polygon") && map.getLayer("layer-osm")) {
      map.off("styledata", onStyleData);
      fn();
    }
  };
  map.on("styledata", onStyleData);
}

const INITIAL_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution: "© OpenStreetMap contributors",
    },
    topo: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: "Tiles © Esri, USGS, NOAA",
    },
    satellite: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: "Tiles © Esri, Earthstar Geographics",
    },
    "terrain-dem": {
      type: "raster-dem",
      tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
      encoding: "terrarium",
      tileSize: 256,
      maxzoom: 15,
    },
    "parcel-polygon": {
      type: "geojson",
      data: EMPTY_FC,
    },
    "pilot-points": {
      type: "geojson",
      data: EMPTY_FC,
    },
    "picked-circle": {
      type: "geojson",
      data: EMPTY_FC,
    },
    "picked-pin": {
      type: "geojson",
      data: EMPTY_FC,
    },
  },
  layers: [
    {
      id: "layer-osm",
      type: "raster",
      source: "osm",
      layout: { visibility: "visible" },
    },
    {
      id: "layer-topo",
      type: "raster",
      source: "topo",
      layout: { visibility: "none" },
    },
    {
      id: "layer-hillshade",
      type: "hillshade",
      source: "terrain-dem",
      layout: { visibility: "none" },
      paint: {
        "hillshade-exaggeration": 0.75,
        "hillshade-shadow-color": "#000000",
        "hillshade-highlight-color": "#FFFFFF",
      },
    },
    {
      id: "layer-satellite",
      type: "raster",
      source: "satellite",
      layout: { visibility: "none" },
    },
    {
      id: "parcel-polygon-fill",
      type: "fill",
      source: "parcel-polygon",
      paint: {
        "fill-color": "#2F7D32",
        "fill-opacity": 0.28,
      },
    },
    {
      id: "parcel-polygon-line",
      type: "line",
      source: "parcel-polygon",
      paint: {
        "line-color": "#1B4D20",
        "line-width": 3,
      },
    },
    {
      id: "pilot-points-circle",
      type: "circle",
      source: "pilot-points",
      paint: {
        "circle-radius": 7,
        "circle-color": "#E9B824",
        "circle-stroke-color": "#5A4632",
        "circle-stroke-width": 2,
      },
    },
    {
      id: "picked-circle-fill",
      type: "fill",
      source: "picked-circle",
      paint: {
        "fill-color": "#2F7D32",
        "fill-opacity": 0.32,
      },
    },
    {
      id: "picked-circle-halo",
      type: "line",
      source: "picked-circle",
      paint: {
        "line-color": "#FFFFFF",
        "line-width": 5,
      },
    },
    {
      id: "picked-circle-line",
      type: "line",
      source: "picked-circle",
      paint: {
        "line-color": "#2F7D32",
        "line-width": 3,
      },
    },
    {
      id: "picked-pin-circle",
      type: "circle",
      source: "picked-pin",
      paint: {
        "circle-radius": 5,
        "circle-color": "#E9B824",
        "circle-stroke-color": "#000000",
        "circle-stroke-width": 2,
      },
    },
  ],
};

interface ParcelMapProps {
  parcel: Parcel;
  pilots?: PilotSummary[];
  onSelect?: (id: string) => void;
  picked?: { lat: number; lon: number } | null;
  onPickPoint?: (lat: number, lon: number) => void;
}

export function ParcelMap({
  parcel,
  pilots = [],
  onSelect,
  picked = null,
  onPickPoint,
}: ParcelMapProps) {
  const { t, pick } = useI18n();
  const p = t.tool.parcel;

  const [viewMode, setViewMode] = useState<MapViewMode>("default");
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<MapLibreMap | null>(null);
  const pickedMarkerRef = useRef<Marker | null>(null);
  const pickedRingElRef = useRef<HTMLDivElement | null>(null);
  const pickedCoordsRef = useRef<{ lat: number; lon: number } | null>(picked);
  const viewModeRef = useRef<MapViewMode>(viewMode);
  const pickRef = useRef(onPickPoint);
  const selectRef = useRef(onSelect);
  const initialCenter = useRef(parcel.center);

  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  useEffect(() => {
    pickRef.current = onPickPoint;
    selectRef.current = onSelect;
  }, [onPickPoint, onSelect]);

  const syncPickedVisuals = (
    map: MapLibreMap,
    coords: { lat: number; lon: number } | null,
  ) => {
    pickedCoordsRef.current = coords;

    if (!coords) {
      if (pickedMarkerRef.current) {
        pickedMarkerRef.current.remove();
        pickedMarkerRef.current = null;
        pickedRingElRef.current = null;
      }
      whenStyleReady(map, () => {
        (map.getSource("picked-circle") as GeoJSONSource | undefined)?.setData(EMPTY_FC);
        (map.getSource("picked-pin") as GeoJSONSource | undefined)?.setData(EMPTY_FC);
      });
      return;
    }

    const diameterPx = computeRadiusDiameterPx(coords.lat, map.getZoom(), 250);

    if (!pickedMarkerRef.current) {
      const wrapper = document.createElement("div");
      wrapper.className = "map-picked-marker";
      wrapper.setAttribute("aria-hidden", "true");

      const ring = document.createElement("div");
      ring.className = "map-picked-marker__ring";
      ring.style.width = `${diameterPx}px`;
      ring.style.height = `${diameterPx}px`;

      const dot = document.createElement("div");
      dot.className = "map-picked-marker__dot";
      ring.appendChild(dot);

      const badge = document.createElement("div");
      badge.className = "map-picked-marker__badge";
      badge.textContent = "Radio 250 m";

      wrapper.appendChild(ring);
      wrapper.appendChild(badge);

      pickedRingElRef.current = ring;
      pickedMarkerRef.current = new Marker({
        element: wrapper,
        anchor: "center",
      })
        .setLngLat([coords.lon, coords.lat])
        .addTo(map);
    } else {
      pickedMarkerRef.current.setLngLat([coords.lon, coords.lat]);
      if (pickedRingElRef.current) {
        pickedRingElRef.current.style.width = `${diameterPx}px`;
        pickedRingElRef.current.style.height = `${diameterPx}px`;
      }
    }

    whenStyleReady(map, () => {
      (map.getSource("picked-circle") as GeoJSONSource | undefined)?.setData(
        buildPickedCircleFC(coords.lat, coords.lon),
      );
      (map.getSource("picked-pin") as GeoJSONSource | undefined)?.setData(
        buildPickedPinFC(coords.lat, coords.lon),
      );
    });
  };

  const polygonFeatureCollection = useMemo<GeoJsonFeatureCollection>(() => {
    if (!parcel.polygon_wgs84 || parcel.polygon_wgs84.length === 0) return EMPTY_FC;
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { id: parcel.id },
          geometry: {
            type: "Polygon",
            coordinates: [parcel.polygon_wgs84],
          },
        },
      ],
    };
  }, [parcel.id, parcel.polygon_wgs84]);

  const pilotPointsFeatureCollection = useMemo<GeoJsonFeatureCollection>(() => {
    const features: GeoJsonFeature[] = pilots
      .filter((item) => item.id !== parcel.id)
      .map((item) => ({
        type: "Feature",
        properties: {
          id: item.id,
          name: pick(item.name),
        },
        geometry: {
          type: "Point",
          coordinates: [item.center.lon, item.center.lat],
        },
      }));
    return {
      type: "FeatureCollection",
      features,
    };
  }, [pilots, parcel.id, pick]);

  // 1. Initialize MapLibre GL map once
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container: mapContainer.current,
        style: INITIAL_STYLE,
        center: [initialCenter.current.lon, initialCenter.current.lat],
        zoom: 14,
        pitch: 0,
        bearing: 0,
        maxPitch: 78,
        attributionControl: false,
        doubleClickZoom: false,
      });
    } catch {
      return;
    }

    const canvas = map.getCanvas();
    canvas.tabIndex = -1;
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cursor = "crosshair";

    map.addControl(new NavigationControl({ visualizePitch: true }), "top-right");

    const updateMarkerScaleOnZoom = () => {
      const current = pickedCoordsRef.current;
      if (!current || !pickedRingElRef.current) return;
      const diameterPx = computeRadiusDiameterPx(current.lat, map.getZoom(), 250);
      pickedRingElRef.current.style.width = `${diameterPx}px`;
      pickedRingElRef.current.style.height = `${diameterPx}px`;
    };

    map.on("zoom", updateMarkerScaleOnZoom);

    const handleMapPick = (e: MapMouseEvent, isDoubleClick: boolean) => {
      const hit = map.queryRenderedFeatures(e.point, {
        layers: ["pilot-points-circle"],
      });
      if (hit.length > 0 && hit[0]?.properties?.id) {
        selectRef.current?.(String(hit[0].properties.id));
        return;
      }
      const { lat, lng } = e.lngLat;
      syncPickedVisuals(map, { lat, lon: lng });
      pickRef.current?.(lat, lng);

      if (isDoubleClick) {
        const prefersReducedMotion =
          typeof window !== "undefined" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const is3D = viewModeRef.current === "relief";
        map.easeTo({
          center: [lng, lat],
          zoom: Math.max(map.getZoom(), is3D ? 13.8 : 15),
          pitch: is3D ? 65 : 0,
          bearing: is3D ? -28 : 0,
          duration: prefersReducedMotion ? 0 : 450,
        });
      }
    };

    map.on("mouseenter", "pilot-points-circle", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "pilot-points-circle", () => {
      map.getCanvas().style.cursor = "crosshair";
    });

    map.on("click", (e: MapMouseEvent) => {
      handleMapPick(e, false);
    });
    map.on("dblclick", (e: MapMouseEvent) => {
      e.preventDefault();
      handleMapPick(e, true);
    });

    mapInstance.current = map;

    if (pickedCoordsRef.current) {
      syncPickedVisuals(map, pickedCoordsRef.current);
    }

    return () => {
      if (pickedMarkerRef.current) {
        pickedMarkerRef.current.remove();
        pickedMarkerRef.current = null;
        pickedRingElRef.current = null;
      }
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // 2. Switch between Default (2D), 3D Relief (DEM terrain + hillshade + pitch), and Satellite
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    whenStyleReady(map, () => {
      map.setLayoutProperty(
        "layer-osm",
        "visibility",
        viewMode === "default" ? "visible" : "none",
      );
      map.setLayoutProperty(
        "layer-topo",
        "visibility",
        viewMode === "relief" ? "visible" : "none",
      );
      map.setLayoutProperty(
        "layer-hillshade",
        "visibility",
        viewMode === "relief" ? "visible" : "none",
      );
      map.setLayoutProperty(
        "layer-satellite",
        "visibility",
        viewMode === "satellite" ? "visible" : "none",
      );

      const isSat = viewMode === "satellite";
      map.setPaintProperty("parcel-polygon-line", "line-color", isSat ? "#E9B824" : "#1B4D20");
      map.setPaintProperty("parcel-polygon-fill", "fill-opacity", isSat ? 0.25 : 0.3);

      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (viewMode === "relief") {
        map.setTerrain({ source: "terrain-dem", exaggeration: 2.2 });
        map.easeTo({
          zoom: Math.min(map.getZoom(), 12.2),
          pitch: 65,
          bearing: -28,
          duration: prefersReducedMotion ? 0 : 750,
        });
      } else {
        map.setTerrain(null);
        map.easeTo({
          zoom: Math.max(map.getZoom(), 13.8),
          pitch: 0,
          bearing: 0,
          duration: prefersReducedMotion ? 0 : 500,
        });
      }
    });
  }, [viewMode]);

  // 3. Update active parcel polygon and recenter when parcel changes
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    whenStyleReady(map, () => {
      (map.getSource("parcel-polygon") as GeoJSONSource | undefined)?.setData(
        polygonFeatureCollection,
      );

      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const is3D = viewModeRef.current === "relief";

      if (parcel.polygon_wgs84 && parcel.polygon_wgs84.length > 0) {
        const bounds = getPolygonBounds([parcel.polygon_wgs84]);
        if (bounds) {
          map.fitBounds(bounds, {
            padding: 40,
            maxZoom: is3D ? 12.2 : 14.5,
            pitch: is3D ? 65 : 0,
            bearing: is3D ? -28 : 0,
            duration: prefersReducedMotion ? 0 : 500,
          });
          return;
        }
      }

      map.easeTo({
        center: [parcel.center.lon, parcel.center.lat],
        zoom: is3D ? 12.2 : 14,
        pitch: is3D ? 65 : 0,
        bearing: is3D ? -28 : 0,
        duration: prefersReducedMotion ? 0 : 500,
      });
    });
  }, [parcel, polygonFeatureCollection]);

  // 4. Update pilot points GeoJSON source
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    whenStyleReady(map, () => {
      (map.getSource("pilot-points") as GeoJSONSource | undefined)?.setData(
        pilotPointsFeatureCollection,
      );
    });
  }, [pilotPointsFeatureCollection]);

  // 5. Sync picked 250 m marker and GeoJSON circle when `picked` prop changes
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    syncPickedVisuals(map, picked);
  }, [picked]);

  const footprints = parcel.native_pixel_footprints_m || {};
  const hasFootprints = Object.keys(footprints).length > 0;
  const viewModes: MapViewMode[] = ["default", "relief", "satellite"];

  return (
    <section className="map-section" aria-label={p.mapTitle}>
      <div className="map-header">
        <h2>{p.mapTitle}</h2>
        <div className="map-toolbar" role="group" aria-label={p.viewLabel}>
          {viewModes.map((mode) => {
            const active = viewMode === mode;
            return (
              <button
                key={mode}
                type="button"
                aria-pressed={active}
                onClick={() => setViewMode(mode)}
              >
                {p.views[mode]}
              </button>
            );
          })}
        </div>
      </div>

      <p>{p.mapHelp}</p>
      {viewMode === "relief" && <p className="step-meta">{p.relief3dHint}</p>}

      <div
        ref={mapContainer}
        className="map-canvas"
        role="region"
        aria-label={`${p.mapTitle}: ${pick(parcel.name)}`}
      />

      {picked && (
        <p className="map-picked-status" role="status" aria-live="polite">
          {p.pickedBanner(picked.lat.toFixed(4), picked.lon.toFixed(4))}
        </p>
      )}

      <details className="map-footprints">
        <summary>
          <strong>{p.footprintsTitle}</strong> · {p.coordinatesLabel}: Lat{" "}
          {parcel.center.lat.toFixed(4)}, Lon {parcel.center.lon.toFixed(4)}
        </summary>
        {hasFootprints ? (
          <dl className="footprint-list">
            {Object.entries(footprints).map(([key, meters]) => {
              const label = p.sourceNames[key] || key;
              return (
                <div key={key} className="footprint-row">
                  <dt>{label}</dt>
                  <dd>
                    <strong>
                      {meters} {p.metersPerPixel}
                    </strong>
                  </dd>
                </div>
              );
            })}
          </dl>
        ) : (
          <p>{p.footprintsUnavailable}</p>
        )}
      </details>
    </section>
  );
}
