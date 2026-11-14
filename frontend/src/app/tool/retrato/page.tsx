"use client";
import { EvaluationGate } from "@/lib/components/LoadGate";
import { useI18n } from "@/lib/i18n";
import { ParcelStrip } from "../_components/ParcelStrip";
import { useToolEvaluation } from "../_components/useToolEvaluation";

export default function PortraitPage() {
  const { t, pick } = useI18n();
  const state = useToolEvaluation();
  return (
    <>
      <title>{`${t.tool.steps.portrait.name} · Field Shift`}</title>
      <h1>{t.tool.steps.portrait.title}</h1>
      <EvaluationGate state={state}>
        {(evaluation) => (
          <>
            <p>
              <strong>{pick(evaluation.parcel.name)}</strong>
            </p>
            <ParcelStrip timeline={evaluation.timeline} />
          </>
        )}
      </EvaluationGate>
    </>
  );
}
