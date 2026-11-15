"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { EvaluationGate } from "@/lib/components/LoadGate";
import type { PilotSummary } from "@/lib/contract";
import { PARCEL_ID_ALIASES, useParcelId, usePilots } from "@/lib/evaluation";
import { useI18n } from "@/lib/i18n";
import { LiveAnalyze } from "./_components/LiveAnalyze";
import { useToolEvaluation } from "./_components/useToolEvaluation";

const ParcelMap = dynamic(
  () => import("./_components/ParcelMap").then((mod) => mod.ParcelMap),
  {
    ssr: false,
    loading: () => <p role="status">…</p>,
  },
);

/** Pivotes detectados automáticamente en Diamond Valley (dv-f001…) frente a los casos del reto. */
const isDetected = (pilot: PilotSummary) => /^dv-f\d+$/.test(pilot.id);

export default function ParcelPage() {
  const { t, pick, value } = useI18n();
  const pilots = usePilots();
  const [parcelId, setParcelId] = useParcelId();

  useEffect(() => {
    if (pilots.status !== "ready" || pilots.data.pilots.length === 0) return;
    // Un punto analizado en vivo no está en la lista de pilotos, pero es válido.
    if (parcelId.startsWith("live-")) return;
    const available = pilots.data.pilots;
    if (available.some((pilot) => pilot.id === parcelId)) return;
    const first = available.find((pilot) => !isDetected(pilot)) ?? available[0];
    if (!first) return;
    const aliased = PARCEL_ID_ALIASES[parcelId];
    const match =
      (aliased && available.find((pilot) => pilot.id === aliased)?.id) ??
      first.id;
    setParcelId(match);
  }, [pilots, parcelId, setParcelId]);

  const evaluationState = useToolEvaluation(parcelId);
  const [picked, setPicked] = useState<{ lat: number; lon: number } | null>(
    null,
  );
  const all = pilots.status === "ready" ? pilots.data.pilots : [];
  const cases = all.filter((pilot) => !isDetected(pilot));
  const detected = all.filter(isDetected);
  const option = (pilot: PilotSummary) => (
    <option key={pilot.id} value={pilot.id}>
      {pick(pilot.name)} · {value(pilot.area_ha)}
      {pilot.has_viable_options ? "" : ` · ${t.tool.parcel.noneViableShort}`}
    </option>
  );

  return (
    <>
      <title>{`${t.tool.steps.parcel.name} · Field Shift`}</title>
      <h1>{t.tool.steps.parcel.title}</h1>

      {pilots.status === "loading" && <p role="status">{t.common.loading}</p>}
      {pilots.status === "error" && <p role="alert">{t.common.loadError}</p>}

      {pilots.status === "ready" && (
        <>
          <p>
            <label htmlFor="parcel-select" className="field-label">
              {t.tool.parcel.legend}
            </label>
            <select
              id="parcel-select"
              className="field field-wide"
              value={parcelId}
              onChange={(event) => setParcelId(event.target.value)}
            >
              {cases.length > 0 && (
                <optgroup label={t.tool.parcel.cases}>
                  {cases.map(option)}
                </optgroup>
              )}
              {detected.length > 0 && (
                <optgroup label={t.tool.parcel.detected(detected.length)}>
                  {detected.map(option)}
                </optgroup>
              )}
            </select>
          </p>
          {detected.length > 0 && (
            <p>{t.tool.parcel.detectedNote(detected.length)}</p>
          )}
          <p>{t.tool.parcel.saved}</p>
        </>
      )}

      <LiveAnalyze
        point={picked}
        onPoint={setPicked}
        onDone={(id) => {
          setPicked(null);
          setParcelId(id);
        }}
      />

      <EvaluationGate state={evaluationState}>
        {(evaluation) => (
          <>
            <p>
              <strong>{pick(evaluation.parcel.name)}</strong>:{" "}
              {t.tool.parcel.area} {value(evaluation.parcel.area_ha)}.{" "}
              {evaluation.parcel.region_mode === "labeled"
                ? t.tool.parcel.labeled
                : t.tool.parcel.unlabeled}
              .
            </p>
            <ParcelMap
              key={evaluation.parcel.id}
              parcel={evaluation.parcel}
              pilots={all}
              onSelect={setParcelId}
              onPickPoint={(lat, lon) => setPicked({ lat, lon })}
              picked={picked}
            />
          </>
        )}
      </EvaluationGate>
    </>
  );
}
