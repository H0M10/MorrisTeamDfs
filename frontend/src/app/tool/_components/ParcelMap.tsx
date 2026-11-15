"use client";
// Mapa de un campo de ejemplo (MapLibre GL): su contorno, los demás campos como puntos
// que se pueden tocar, tres vistas (satélite, relieve 3D, mapa) y el tamaño real del
// píxel de cada fuente. Basado en el mapa de Checo (@Checo-coder, be08ba0).
import {
  LngLatBounds,
  Map as MapLibreMap,
  NavigationControl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { Evaluation, PilotSummary } from "@/lib/contract";
import { useI18n } from "@/lib/i18n";
import {
  BASE_STYLE,
  MAP_VIEWS,
  applyView,
  whenReady,
  type MapView,
} from "@/lib/mapStyle";

type ParcelData = Evaluation["parcel"];

export function ParcelMap({
  parcel,
  pilots = [],
  onSelect,
}: {
  parcel: ParcelData;
  /** Las demás parcelas evaluables: se pintan como puntos que se pueden elegir. */
  pilots?: PilotSummary[];
  onSelect?: (id: string) => void;
}) {
  const { pick, t } = useI18n();
  const p = t.tool.parcel;
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const selectRef = useRef(onSelect);
  const [view, setView] = useState<MapView>("satellite");

  useEffect(() => {
    selectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!container.current) return;
    const ring = (parcel.polygon_wgs84 ?? []) as [number, number][];
    const map = new MapLibreMap({
      container: container.current,
      style: BASE_STYLE,
      center: [parcel.center.lon, parcel.center.lat],
      zoom: 14,
      maxPitch: 75,
      attributionControl: { compact: true },
    });
    map.addControl(
      new NavigationControl({ visualizePitch: true }),
      "top-right",
    );
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("parcel", {
        type: "geojson",
        data:
          ring.length >= 3
            ? {
                type: "Feature",
                properties: {},
                geometry: { type: "Polygon", coordinates: [ring] },
              }
            : { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "parcel-fill",
        type: "fill",
        source: "parcel",
        paint: { "fill-color": "#1247B8", "fill-opacity": 0.25 },
      });
      map.addLayer({
        id: "parcel-line",
        type: "line",
        source: "parcel",
        paint: { "line-color": "#FFFFFF", "line-width": 3 },
      });
      map.addSource("pilots", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: pilots
            .filter((pilot) => pilot.id !== parcel.id)
            .map((pilot) => ({
              type: "Feature" as const,
              properties: { id: pilot.id },
              geometry: {
                type: "Point" as const,
                coordinates: [pilot.center.lon, pilot.center.lat],
              },
            })),
        },
      });
      map.addLayer({
        id: "pilots",
        type: "circle",
        source: "pilots",
        paint: {
          "circle-radius": 8,
          "circle-color": "#E9B824",
          "circle-stroke-color": "#000000",
          "circle-stroke-width": 1.5,
        },
      });
      map.on("click", "pilots", (event) => {
        const id = event.features?.[0]?.properties?.id;
        if (typeof id === "string") selectRef.current?.(id);
      });
      map.on("mouseenter", "pilots", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "pilots", () => {
        map.getCanvas().style.cursor = "";
      });

      if (ring.length >= 3) {
        const first = ring[0] as [number, number];
        const bounds = ring.reduce(
          (b, point) => b.extend(point),
          new LngLatBounds(first, first),
        );
        // Con más campos alrededor se aleja un poco para que se vean los vecinos.
        map.fitBounds(bounds, {
          padding: 40,
          maxZoom: pilots.length > 1 ? 13.5 : 16,
          duration: 0,
        });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [parcel, pilots]);

  useEffect(() => {
    const map = mapRef.current;
    if (map) whenReady(map, () => applyView(map, view));
  }, [view]);

  const footprints = Object.entries(parcel.native_pixel_footprints_m ?? {});
  const meters = new Intl.NumberFormat();

  return (
    <section aria-labelledby="map-heading" className="map-block">
      <h2 id="map-heading">
        {p.mapTitle}: {pick(parcel.name)}
      </h2>
      {pilots.length > 1 && <p>{p.mapHelp}</p>}
      <div
        className="method-switch map-views"
        role="group"
        aria-label={t.tool.picker.viewLabel}
      >
        {MAP_VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => setView(v)}
          >
            {t.tool.picker.views[v]}
          </button>
        ))}
      </div>
      {view === "relief" && <p className="small">{t.tool.picker.reliefHint}</p>}
      <div
        ref={container}
        className="picker-map"
        role="region"
        aria-label={`Mapa interactivo mostrando los límites de ${pick(parcel.name)}`}
      />
      <details className="map-footprints">
        <summary>{p.footprintsTitle}</summary>
        <p className="small">{p.footprintsHelp}</p>
        <dl className="facts">
          {footprints.map(([key, size]) => (
            <div key={key} className="footprint-row">
              <dt>{p.sourceNames[key] ?? key.replaceAll("_", " ")}</dt>
              <dd>
                {meters.format(size)} {p.metersPerPixel}
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </section>
  );
}
