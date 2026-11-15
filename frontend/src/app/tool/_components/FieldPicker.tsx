"use client";
// "Marca tu campo": recorrido guiado en tres pasos sobre un mapa de satélite.
//   1. Encuentra tu campo (tu ubicación o buscar por pueblo).
//   2. Márcalo: toca el centro de tu pivote, o dibuja sus orillas tocando las esquinas.
//   3. Analiza. El servidor trae 36 meses de satélite y clima de esa área y corre el
//      mismo motor y los mismos modelos.
// Alternativa con teclado: escribir las coordenadas del centro.
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  type GeoJSONSource,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { ApiError, api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import {
  BASE_STYLE,
  MAP_VIEWS,
  applyView,
  motion,
  whenReady,
  type MapView,
} from "@/lib/mapStyle";
import {
  centerAndAreaHa,
  circleRing,
  rememberLiveRequest,
  type Ring,
} from "@/lib/shapes";

type Method = "center" | "edges";
const SIZES = [
  { key: "small", radius: 200 },
  { key: "medium", radius: 400 },
  { key: "large", radius: 800 },
] as const;
type SizeKey = (typeof SIZES)[number]["key"];

// Diamond Valley, NV: el caso del reto. El agricultor se mueve a su campo desde aquí.
const START: [number, number] = [-115.98, 39.72]; // [lon, lat]
const EMPTY = { type: "FeatureCollection" as const, features: [] };
const YELLOW = "#E9B824";

export function FieldPicker({
  onDone,
}: {
  onDone: (parcelId: string) => void;
}) {
  const { t, pick } = useI18n();
  const p = t.tool.picker;
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markers = useRef<Marker[]>([]);

  const [view, setView] = useState<MapView>("satellite");
  const [method, setMethod] = useState<Method>("center");
  const [size, setSize] = useState<SizeKey>("medium");
  const [center, setCenter] = useState<{ lat: number; lon: number } | null>(
    null,
  );
  const [corners, setCorners] = useState<Ring>([]);
  const [query, setQuery] = useState("");
  const [findMessage, setFindMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");

  // Lo que cambia en cada clic se lee por referencia: el mapa se crea una sola vez.
  const methodRef = useRef(method);
  useEffect(() => {
    methodRef.current = method;
  }, [method]);

  useEffect(() => {
    if (!container.current) return;
    const map = new MapLibreMap({
      container: container.current,
      style: BASE_STYLE,
      center: START,
      zoom: 12,
      maxPitch: 75,
      doubleClickZoom: false, // el doble toque marcaría dos esquinas
      attributionControl: { compact: true },
    });
    map.addControl(
      new NavigationControl({ visualizePitch: true }),
      "top-right",
    );
    map.getCanvas().style.cursor = "crosshair";
    map.on("load", () => {
      map.addSource("shape", { type: "geojson", data: EMPTY });
      map.addLayer({
        id: "shape-fill",
        type: "fill",
        source: "shape",
        paint: { "fill-color": YELLOW, "fill-opacity": 0.28 },
      });
      map.addLayer({
        id: "shape-line",
        type: "line",
        source: "shape",
        paint: { "line-color": YELLOW, "line-width": 3 },
      });
    });
    map.on("click", (event) => {
      const { lat: y, lng: x } = event.lngLat;
      if (methodRef.current === "center") {
        setCenter({ lat: y, lon: x });
        // Con el mapa lejos el círculo se ve chico: se acerca para comprobar que cubre el pivote.
        if (map.getZoom() < 14 && map.getPitch() < 10) {
          map.flyTo({ center: [x, y], zoom: 15, duration: motion(800) });
        }
      } else setCorners((list) => [...list, [x, y]]);
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mapRef.current) applyView(mapRef.current, view);
  }, [view]);

  const radius = SIZES.find((s) => s.key === size)?.radius ?? 400;
  const ring: Ring | null =
    method === "center"
      ? center
        ? circleRing(center.lat, center.lon, radius)
        : null
      : corners.length >= 3
        ? corners
        : null;
  const area = ring ? centerAndAreaHa(ring) : null;

  // Dibuja la figura propuesta y las esquinas numeradas (o el centro del pivote).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    whenReady(map, () => {
      const source = map.getSource("shape") as GeoJSONSource | undefined;
      let shape: Ring = [];
      if (method === "center" && center)
        shape = circleRing(center.lat, center.lon, radius);
      if (method === "edges") shape = corners;
      const closed =
        shape.length >= 3 ? [...shape, shape[0] as [number, number]] : shape;
      source?.setData(
        closed.length >= 2
          ? {
              type: "Feature",
              properties: {},
              geometry:
                closed.length >= 4
                  ? { type: "Polygon", coordinates: [closed] }
                  : { type: "LineString", coordinates: closed },
            }
          : EMPTY,
      );
      for (const marker of markers.current) marker.remove();
      markers.current = [];
      const pins: { at: [number, number]; label: string }[] =
        method === "center" && center
          ? [{ at: [center.lon, center.lat], label: "" }]
          : method === "edges"
            ? corners.map((c, i) => ({ at: c, label: String(i + 1) }))
            : [];
      for (const pin of pins) {
        const element = document.createElement("div");
        element.className = pin.label ? "corner-pin" : "center-pin";
        element.textContent = pin.label;
        element.setAttribute("aria-hidden", "true");
        markers.current.push(
          new Marker({ element }).setLngLat(pin.at).addTo(map),
        );
      }
    });
  }, [method, center, corners, radius]);

  useEffect(() => {
    if (!busy) return;
    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [busy]);

  const flyTo = (y: number, x: number, zoom = 15) =>
    mapRef.current?.flyTo({ center: [x, y], zoom, duration: motion(1200) });

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      setFindMessage(p.noGps);
      return;
    }
    setFindMessage(p.locating);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        flyTo(position.coords.latitude, position.coords.longitude, 16);
        setFindMessage(p.located);
      },
      () => setFindMessage(p.gpsDenied),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const search = async () => {
    const text = query.trim();
    if (!text) return;
    setFindMessage(p.searching);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(text)}`;
      const results = (await (await fetch(url)).json()) as {
        lat: string;
        lon: string;
        display_name: string;
      }[];
      const first = results[0];
      if (!first) {
        setFindMessage(p.notFound);
        return;
      }
      flyTo(Number(first.lat), Number(first.lon), 14);
      setFindMessage(p.found(first.display_name));
    } catch {
      setFindMessage(p.searchError);
    }
  };

  const typedCenter = () => {
    const y = Number(lat);
    const x = Number(lon);
    if (
      lat === "" ||
      lon === "" ||
      !Number.isFinite(y) ||
      !Number.isFinite(x)
    ) {
      setError(p.badCoordinates);
      return;
    }
    setMethod("center");
    setCenter({ lat: y, lon: x });
    flyTo(y, x, 15);
    setError(null);
  };

  const analyze = async () => {
    if (!ring || !area) return;
    const point = method === "center" && center ? center : area;
    setBusy(true);
    setSeconds(0);
    setError(null);
    try {
      const evaluation = await api.analyze(point.lat, point.lon, ring);
      rememberLiveRequest(evaluation.parcel.id, {
        lat: point.lat,
        lon: point.lon,
        polygon: ring,
      });
      setCenter(null);
      setCorners([]);
      onDone(evaluation.parcel.id);
    } catch (caught) {
      setError(caught instanceof ApiError ? pick(caught.localized) : p.error);
    } finally {
      setBusy(false);
    }
  };

  // Qué tiene que hacer ahora la persona, en una frase.
  let next: string;
  if (method === "center") next = center ? p.readyCenter : p.tapCenter;
  else if (corners.length === 0) next = p.tapFirstCorner;
  else if (corners.length < 3) next = p.tapMoreCorners(3 - corners.length);
  else next = p.readyEdges(corners.length);

  return (
    <section aria-labelledby="picker-heading" className="picker no-print">
      <h2 id="picker-heading" className="visually-hidden">
        {p.title}
      </h2>

      <h3>
        <span className="step-badge" aria-hidden="true">
          1
        </span>{" "}
        {p.step1}
      </h3>
      <div className="inline-fields">
        <button type="button" className="primary" onClick={useMyLocation}>
          {p.useLocation}
        </button>
        <span>{p.or}</span>
        <label className="visually-hidden" htmlFor="place-search">
          {p.searchLabel}
        </label>
        <input
          id="place-search"
          className="field"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void search();
            }
          }}
          placeholder={p.searchPlaceholder}
        />
        <button type="button" onClick={() => void search()}>
          {p.search}
        </button>
      </div>
      <p role="status" aria-live="polite" className="small">
        {findMessage ?? p.findHelp}
      </p>

      <h3>
        <span className="step-badge" aria-hidden="true">
          2
        </span>{" "}
        {p.step2}
      </h3>
      <div className="method-switch" role="group" aria-label={p.step2}>
        <button
          type="button"
          aria-pressed={method === "center"}
          onClick={() => setMethod("center")}
        >
          {p.methodCenter}
        </button>
        <button
          type="button"
          aria-pressed={method === "edges"}
          onClick={() => setMethod("edges")}
        >
          {p.methodEdges}
        </button>
      </div>
      {method === "center" ? (
        <div className="method-switch" role="group" aria-label={p.sizeLabel}>
          {SIZES.map((s) => (
            <button
              key={s.key}
              type="button"
              aria-pressed={size === s.key}
              onClick={() => setSize(s.key)}
            >
              {p.sizes[s.key]}
            </button>
          ))}
        </div>
      ) : (
        <div className="inline-fields">
          <button
            type="button"
            disabled={corners.length === 0}
            onClick={() => setCorners((c) => c.slice(0, -1))}
          >
            {p.undo}
          </button>
          <button
            type="button"
            disabled={corners.length === 0}
            onClick={() => setCorners([])}
          >
            {p.restart}
          </button>
        </div>
      )}

      <p className="picker-next" role="status" aria-live="polite">
        {next}
      </p>
      <div
        className="method-switch map-views"
        role="group"
        aria-label={p.viewLabel}
      >
        {MAP_VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => setView(v)}
          >
            {p.views[v]}
          </button>
        ))}
      </div>
      {view === "relief" && <p className="small">{p.reliefHint}</p>}
      <div
        ref={container}
        className="picker-map"
        role="region"
        aria-label={p.mapLabel}
      />

      <details className="picker-keyboard">
        <summary>{p.typeCoordinates}</summary>
        <p className="inline-fields">
          <label>
            {p.lat}{" "}
            <input
              className="field"
              inputMode="decimal"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="39.7000"
            />
          </label>
          <label>
            {p.lon}{" "}
            <input
              className="field"
              inputMode="decimal"
              value={lon}
              onChange={(e) => setLon(e.target.value)}
              placeholder="-116.0000"
            />
          </label>
          <button type="button" onClick={typedCenter}>
            {p.placeCenter}
          </button>
        </p>
      </details>

      <h3>
        <span className="step-badge" aria-hidden="true">
          3
        </span>{" "}
        {p.step3}
      </h3>
      <p>
        <button
          type="button"
          className="primary picker-go"
          disabled={!ring || busy}
          onClick={() => void analyze()}
        >
          {busy
            ? p.analyzing
            : area
              ? p.analyzeArea(area.areaHa.toFixed(0))
              : p.analyzeDisabled}
        </button>
      </p>
      <div role="status" aria-live="polite">
        {busy && (
          <>
            <p>
              <strong>{p.working(seconds)}</strong>
            </p>
            <ul>
              <li>{p.workImages}</li>
              <li>{p.workClimate}</li>
              <li>{p.workModels}</li>
            </ul>
          </>
        )}
        {error && <p className="picker-error">{error}</p>}
      </div>
      <p className="small">{p.note}</p>
    </section>
  );
}
