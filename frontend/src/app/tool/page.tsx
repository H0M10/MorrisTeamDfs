"use client";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { EvaluationGate } from "@/lib/components/LoadGate";
import { PARCEL_ID_ALIASES, useParcelId, usePilots } from "@/lib/evaluation";
import { useI18n } from "@/lib/i18n";
import { useToolEvaluation } from "./_components/useToolEvaluation";

const ParcelMap = dynamic(() => import("./_components/ParcelMap").then((mod) => mod.ParcelMap), {
  ssr: false,
  loading: () => <p role="status">Cargando mapa...</p>,
});

export default function ParcelPage() {
  const { t, pick, value } = useI18n();
  const pilots = usePilots();
  const [parcelId, setParcelId] = useParcelId();

  useEffect(() => {
    if (pilots.status !== "ready" || pilots.data.pilots.length === 0) return;
    const available = pilots.data.pilots;
    if (available.some((pilot) => pilot.id === parcelId)) return;
    const first = available[0];
    if (!first) return;
    const aliased = PARCEL_ID_ALIASES[parcelId];
    const match =
      (aliased && available.find((pilot) => pilot.id === aliased)?.id) ?? first.id;
    setParcelId(match);
  }, [pilots, parcelId, setParcelId]);

  const evaluationState = useToolEvaluation(parcelId);

  return (
    <>
      <title>{`${t.tool.steps.parcel.name} · Field Shift`}</title>
      <h1>{t.tool.steps.parcel.title}</h1>

      {pilots.status === "loading" && <p role="status">{t.common.loading}</p>}
      {pilots.status === "error" && <p role="alert">{t.common.loadError}</p>}

      {pilots.status === "ready" && (
        <>
          <fieldset className="border-2 border-black p-4 rounded mb-6">
            <legend className="font-bold px-2">{t.tool.parcel.legend}</legend>
            <ul className="choice-list">
              {pilots.data.pilots.map((pilot) => {
                const isSelected = pilot.id === parcelId;
                return (
                  <li key={pilot.id}>
                    <label
                      className={`choice ${isSelected ? "border-[#1247B8] bg-blue-50" : ""}`}
                    >
                      <input
                        type="radio"
                        name="parcel"
                        value={pilot.id}
                        checked={isSelected}
                        onChange={() => setParcelId(pilot.id)}
                      />
                      <span>
                        <strong>{pick(pilot.name)}</strong>
                        <br />
                        {t.tool.parcel.area}: {value(pilot.area_ha)}.{" "}
                        {pilot.region_mode === "labeled"
                          ? t.tool.parcel.labeled
                          : t.tool.parcel.unlabeled}
                        .
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
          <p>{t.tool.parcel.saved}</p>
        </>
      )}

      <EvaluationGate state={evaluationState}>
        {(evaluation) => <ParcelMap key={evaluation.parcel.id} parcel={evaluation.parcel} />}
      </EvaluationGate>
    </>
  );
}
