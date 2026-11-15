"use client";
// Analizar cualquier campo de EE. UU.: se elige la forma del área (círculo o
// cuadrado alrededor de un punto, o dibujada tocando sus esquinas en el mapa) y el
// servidor trae sus datos de satélite y clima y los procesa con el mismo motor y
// los mismos modelos. Tarda de 30 a 90 s la primera vez.
import { useEffect, useState, type FormEvent } from "react";
import { ApiError, api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import {
  centerAndAreaHa,
  rememberLiveRequest,
  type Ring,
  type ShapeMode,
} from "@/lib/shapes";

export const CIRCLE_RADII = [100, 250, 400, 800];
export const SQUARE_SIDES = [200, 400, 800];

export interface ShapeState {
  mode: ShapeMode;
  radius: number;
  side: number;
  point: { lat: number; lon: number } | null;
  vertices: Ring;
}

export function LiveAnalyze({
  shape,
  onShape,
  ring,
  onDone,
}: {
  shape: ShapeState;
  onShape: (next: ShapeState) => void;
  /** La figura que se va a analizar, ya calculada (o null si falta algo). */
  ring: Ring | null;
  onDone: (parcelId: string) => void;
}) {
  const { t, pick } = useI18n();
  const l = t.tool.live;
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Lo tocado en el mapa llena las casillas.
  useEffect(() => {
    if (!shape.point) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLat(shape.point.lat.toFixed(4));
    setLon(shape.point.lon.toFixed(4));
  }, [shape.point]);

  useEffect(() => {
    if (!busy) return;
    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [busy]);

  const area = ring && ring.length >= 3 ? centerAndAreaHa(ring) : null;

  const typed = (nextLat: string, nextLon: string) => {
    setLat(nextLat);
    setLon(nextLon);
    const a = Number(nextLat);
    const b = Number(nextLon);
    if (
      nextLat !== "" &&
      nextLon !== "" &&
      Number.isFinite(a) &&
      Number.isFinite(b)
    ) {
      onShape({ ...shape, point: { lat: a, lon: b } });
    }
  };

  const analyze = async (event: FormEvent) => {
    event.preventDefault();
    if (!ring || !area) {
      setError(shape.mode === "draw" ? l.needCorners : l.badCoordinates);
      return;
    }
    const center = shape.mode === "draw" ? area : (shape.point ?? area);
    setBusy(true);
    setSeconds(0);
    setError(null);
    try {
      const evaluation = await api.analyze(center.lat, center.lon, ring);
      rememberLiveRequest(evaluation.parcel.id, {
        lat: center.lat,
        lon: center.lon,
        polygon: ring,
      });
      onDone(evaluation.parcel.id);
    } catch (caught) {
      setError(caught instanceof ApiError ? pick(caught.localized) : l.error);
    } finally {
      setBusy(false);
    }
  };

  const step =
    seconds < 8 ? l.stepImages : seconds < 25 ? l.stepClimate : l.stepModels;

  return (
    <section aria-labelledby="live-heading" className="editor no-print">
      <h2 id="live-heading">{l.title}</h2>
      <p>{l.intro}</p>
      <form onSubmit={analyze}>
        <fieldset>
          <legend>{l.shapeLegend}</legend>
          <ul className="check-list">
            {(["circle", "square", "draw"] as const).map((mode) => (
              <li key={mode}>
                <label className="choice">
                  <input
                    type="radio"
                    name="shape"
                    checked={shape.mode === mode}
                    onChange={() => onShape({ ...shape, mode })}
                  />
                  <span>{l.shapes[mode]}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        {shape.mode === "circle" && (
          <p>
            <label>
              {l.radius}{" "}
              <select
                className="field"
                value={shape.radius}
                onChange={(event) =>
                  onShape({ ...shape, radius: Number(event.target.value) })
                }
              >
                {CIRCLE_RADII.map((r) => (
                  <option key={r} value={r}>
                    {l.radiusOption(r)}
                  </option>
                ))}
              </select>
            </label>
          </p>
        )}
        {shape.mode === "square" && (
          <p>
            <label>
              {l.side}{" "}
              <select
                className="field"
                value={shape.side}
                onChange={(event) =>
                  onShape({ ...shape, side: Number(event.target.value) })
                }
              >
                {SQUARE_SIDES.map((s) => (
                  <option key={s} value={s}>
                    {l.sideOption(s)}
                  </option>
                ))}
              </select>
            </label>
          </p>
        )}

        {shape.mode === "draw" ? (
          <>
            <p>{l.drawHelp}</p>
            <p className="inline-fields">
              <span>{l.corners(shape.vertices.length)}</span>
              <button
                type="button"
                disabled={shape.vertices.length === 0}
                onClick={() =>
                  onShape({ ...shape, vertices: shape.vertices.slice(0, -1) })
                }
              >
                {l.undo}
              </button>
              <button
                type="button"
                disabled={shape.vertices.length === 0}
                onClick={() => onShape({ ...shape, vertices: [] })}
              >
                {l.clear}
              </button>
            </p>
          </>
        ) : (
          <p className="inline-fields">
            <label>
              {l.lat}{" "}
              <input
                className="field"
                inputMode="decimal"
                value={lat}
                onChange={(event) => typed(event.target.value, lon)}
                placeholder="39.7000"
              />
            </label>
            <label>
              {l.lon}{" "}
              <input
                className="field"
                inputMode="decimal"
                value={lon}
                onChange={(event) => typed(lat, event.target.value)}
                placeholder="-116.0000"
              />
            </label>
          </p>
        )}

        {area && <p>{l.areaPreview(area.areaHa.toFixed(1))}</p>}

        <p>
          <button type="submit" className="primary" disabled={busy}>
            {busy ? l.analyzing : l.submit}
          </button>
        </p>
      </form>
      <div role="status" aria-live="polite">
        {busy && (
          <p>
            {step} ({l.seconds(seconds)})
          </p>
        )}
        {error && <p>{error}</p>}
      </div>
      <p className="small">{l.note}</p>
    </section>
  );
}
