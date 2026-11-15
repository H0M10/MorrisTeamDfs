"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EvaluationGate } from "@/lib/components/LoadGate";
import type { PilotSummary } from "@/lib/contract";
import { PARCEL_ID_ALIASES, useParcelId, usePilots } from "@/lib/evaluation";
import { useI18n } from "@/lib/i18n";
import { useToolEvaluation } from "./_components/useToolEvaluation";

const ParcelMap = dynamic(
  () => import("./_components/ParcelMap").then((mod) => mod.ParcelMap),
  { ssr: false, loading: () => <p role="status">…</p> },
);
const FieldPicker = dynamic(
  () => import("./_components/FieldPicker").then((mod) => mod.FieldPicker),
  { ssr: false, loading: () => <p role="status">…</p> },
);

/** Pivotes detectados automáticamente en Diamond Valley (dv-f001…) frente a los casos del reto. */
const isDetected = (pilot: PilotSummary) => /^dv-f\d+$/.test(pilot.id);

type Tab = "mine" | "examples";

export default function ParcelPage() {
  const { t, pick, value } = useI18n();
  const pilots = usePilots();
  const [parcelId, setParcelId] = useParcelId();
  const [tab, setTab] = useState<Tab>("mine");
  const [justAnalyzed, setJustAnalyzed] = useState(false);

  useEffect(() => {
    if (pilots.status !== "ready" || pilots.data.pilots.length === 0) return;
    // Un campo analizado en vivo no está en la lista de ejemplos, pero es válido.
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
      <h1>{t.tool.parcel.whereTitle}</h1>

      <div
        className="tab-switch"
        role="group"
        aria-label={t.tool.parcel.whereTitle}
      >
        <button
          type="button"
          aria-pressed={tab === "mine"}
          onClick={() => setTab("mine")}
        >
          {t.tool.parcel.tabMine}
        </button>
        <button
          type="button"
          aria-pressed={tab === "examples"}
          onClick={() => setTab("examples")}
        >
          {t.tool.parcel.tabExamples}
        </button>
      </div>

      {tab === "mine" && (
        <FieldPicker
          onDone={(id) => {
            setParcelId(id);
            setJustAnalyzed(true);
          }}
        />
      )}

      {tab === "examples" && (
        <>
          {pilots.status === "loading" && (
            <p role="status">{t.common.loading}</p>
          )}
          {pilots.status === "error" && (
            <p role="alert">{t.common.loadError}</p>
          )}
          {pilots.status === "ready" && (
            <>
              <p>{t.tool.parcel.examplesIntro}</p>
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
                <p className="small">
                  {t.tool.parcel.detectedNote(detected.length)}
                </p>
              )}
            </>
          )}
        </>
      )}

      <section aria-labelledby="chosen-heading" className="chosen">
        <h2 id="chosen-heading">{t.tool.parcel.chosenTitle}</h2>
        <EvaluationGate state={evaluationState}>
          {(evaluation) => (
            <>
              {justAnalyzed && (
                <p className="picker-done">{t.tool.parcel.analyzedOk}</p>
              )}
              <p>
                <strong>{pick(evaluation.parcel.name)}</strong>:{" "}
                {t.tool.parcel.area} {value(evaluation.parcel.area_ha)}.
              </p>
              <p>
                <Link className="button primary" href="/tool/retrato">
                  {t.tool.parcel.seePortrait}
                </Link>
              </p>
              {tab === "examples" && (
                <ParcelMap
                  key={evaluation.parcel.id}
                  parcel={evaluation.parcel}
                  pilots={all}
                  onSelect={setParcelId}
                />
              )}
              <p className="small">{t.tool.parcel.saved}</p>
            </>
          )}
        </EvaluationGate>
      </section>
    </>
  );
}
