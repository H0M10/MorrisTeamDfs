"use client";
// Marcar el campo sin precisión de dedo: el círculo está fijo en el centro y
// la persona mueve el mapa debajo. Un botón para confirmar.
import { Map as MapLibreMap, Marker, NavigationControl, type GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { BASE_STYLE, motion } from "@/lib/mapStyle";
import { circleRing, type Ring } from "@/lib/shapes";

const RADII = [200, 400, 800]; // metros: pivote chico, mediano, grande
const START: [number, number] = [-115.98, 39.72]; // Diamond Valley, NV
const EMPTY = { type: "FeatureCollection" as const, features: [] };

export function FieldFinder({
  locateOnStart,
  onConfirm,
}: {
  locateOnStart: boolean;
  onConfirm: (lat: number, lon: number, ring: Ring) => void;
}) {
  const { t } = useI18n();
  const s = t.simple;
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const me = useRef<Marker | null>(null);
  const [size, setSize] = useState(1);
  const sizeRef = useRef(size);
  const [status, setStatus] = useState<string>(s.moveMap);
  const [query, setQuery] = useState("");

  const draw = () => {
    const map = mapRef.current;
    const source = map?.getSource("field") as GeoJSONSource | undefined;
    if (!map || !source) return;
    const c = map.getCenter();
    const ring = circleRing(c.lat, c.lng, RADII[sizeRef.current] ?? 400);
    source.setData({
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [[...ring, ring[0] as [number, number]]] },
    });
  };

  const locate = () => {
    if (!("geolocation" in navigator)) {
      setStatus(s.noGps);
      return;
    }
    setStatus(s.locating);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: y, longitude: x } = position.coords;
        const map = mapRef.current;
        if (map) {
          map.flyTo({ center: [x, y], zoom: 15, duration: motion(1200) });
          me.current?.remove();
          const element = document.createElement("div");
          element.className = "me-pin";
          element.setAttribute("aria-hidden", "true");
          me.current = new Marker({ element }).setLngLat([x, y]).addTo(map);
        }
        setStatus(s.located);
      },
      () => setStatus(s.gpsDenied),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  useEffect(() => {
    if (!container.current) return;
    const map = new MapLibreMap({
      container: container.current,
      style: BASE_STYLE,
      center: START,
      zoom: 13,
      attributionControl: { compact: true },
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => {
      map.addSource("field", { type: "geojson", data: EMPTY });
      map.addLayer({ id: "field-fill", type: "fill", source: "field", paint: { "fill-color": "#E9B824", "fill-opacity": 0.3 } });
      map.addLayer({ id: "field-line", type: "line", source: "field", paint: { "line-color": "#E9B824", "line-width": 4 } });
      draw();
    });
    map.on("move", draw);
    mapRef.current = map;
    if (locateOnStart) map.once("load", locate);
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // El mapa se crea una sola vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    sizeRef.current = size;
    draw();
  }, [size]);

  const search = async () => {
    const text = query.trim();
    if (!text) return;
    setStatus(s.searching);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(text)}`;
      const results = (await (await fetch(url)).json()) as { lat: string; lon: string }[];
      const first = results[0];
      if (!first) {
        setStatus(s.notFound);
        return;
      }
      mapRef.current?.flyTo({ center: [Number(first.lon), Number(first.lat)], zoom: 14, duration: motion(1200) });
      setStatus(s.moveMap);
    } catch {
      setStatus(s.searchError);
    }
  };

  const confirm = () => {
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter();
    onConfirm(c.lat, c.lng, circleRing(c.lat, c.lng, RADII[size] ?? 400));
  };

  return (
    <div className="finder">
      <form
        className="finder-search"
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
      >
        <label className="visually-hidden" htmlFor="finder-q">
          {s.searchLabel}
        </label>
        <input
          id="finder-q"
          className="field"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={s.searchLabel}
        />
        <button type="submit">{s.search}</button>
      </form>
      <p className="finder-status" role="status" aria-live="polite">
        {status}
      </p>
      <div ref={container} className="finder-map" role="region" aria-label={s.mapLabel} />
      <button type="button" className="primary big" onClick={confirm}>
        {s.thisIsMyField}
      </button>
      <div className="finder-row">
        <button type="button" onClick={locate}>
          {s.myLocation}
        </button>
        <div className="finder-size" role="group" aria-label={s.circleSize}>
          <button type="button" onClick={() => setSize((v) => Math.max(0, v - 1))} disabled={size === 0}>
            {s.smaller}
          </button>
          <button type="button" onClick={() => setSize((v) => Math.min(RADII.length - 1, v + 1))} disabled={size === RADII.length - 1}>
            {s.bigger}
          </button>
        </div>
      </div>
    </div>
  );
}
