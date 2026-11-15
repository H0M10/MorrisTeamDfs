"use client";
// Analizar cualquier lugar: se elige un punto (tocando el mapa o escribiendo
// coordenadas) y el servidor trae sus datos de satélite y clima y los procesa
// con el mismo motor y los mismos modelos. Tarda de 30 a 90 s la primera vez.
import { useEffect, useState, type FormEvent } from "react";
import { ApiError, api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export function LiveAnalyze({
  point,
  onPoint,
  onDone,
}: {
  point: { lat: number; lon: number } | null;
  onPoint: (point: { lat: number; lon: number }) => void;
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
    if (!point) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLat(point.lat.toFixed(4));
    setLon(point.lon.toFixed(4));
  }, [point]);

  useEffect(() => {
    if (!busy) return;
    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [busy]);

  const analyze = async (event: FormEvent) => {
    event.preventDefault();
    const latN = Number(lat);
    const lonN = Number(lon);
    if (
      !Number.isFinite(latN) ||
      !Number.isFinite(lonN) ||
      lat === "" ||
      lon === ""
    ) {
      setError(l.badCoordinates);
      return;
    }
    onPoint({ lat: latN, lon: lonN });
    setBusy(true);
    setSeconds(0);
    setError(null);
    try {
      const evaluation = await api.analyze(latN, lonN);
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
        <p className="inline-fields">
          <label>
            {l.lat}{" "}
            <input
              className="field"
              inputMode="decimal"
              value={lat}
              onChange={(event) => setLat(event.target.value)}
              placeholder="39.7000"
            />
          </label>
          <label>
            {l.lon}{" "}
            <input
              className="field"
              inputMode="decimal"
              value={lon}
              onChange={(event) => setLon(event.target.value)}
              placeholder="-116.0000"
            />
          </label>
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
