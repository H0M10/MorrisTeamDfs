"use client";
import { EvaluationGate } from "@/lib/components/LoadGate";
import { MetricCard } from "@/lib/components/MetricCard";
import type { ConstraintsInput, Evaluation } from "@/lib/contract";
import { useDeclaredConstraints, useParcelId } from "@/lib/evaluation";
import { useI18n } from "@/lib/i18n";
import { ConstraintsEditor } from "../_components/ConstraintControls";
import { useToolEvaluation } from "../_components/useToolEvaluation";

const readable = (code: string) => code.replaceAll("_", " ");

export default function ConstraintsPage() {
  const { t, pick } = useI18n();
  const [parcelId] = useParcelId();
  const [declared, setDeclared] = useDeclaredConstraints(parcelId);
  // La evaluación ya viene recalculada con lo declarado: Rotaciones, Evidencia
  // y Compartir leen lo mismo desde el dispositivo.
  const state = useToolEvaluation();

  const handleSave = (updated: Evaluation["constraints"]) => {
    const input: ConstraintsInput = {
      max_water_mm_year: updated.max_water_mm_year.value ?? 0,
      available_machinery: updated.available_machinery,
      crops_without_buyer: updated.crops_without_buyer,
      planting_window: {
        start_month: updated.planting_window.start_month,
        end_month: updated.planting_window.end_month,
      },
    };
    setDeclared(input);
  };

  return (
    <>
      <title>{`${t.tool.steps.constraints.name} · Field Shift`}</title>
      <h1>{t.tool.steps.constraints.title}</h1>
      <p>{t.tool.constraints.intro}</p>

      <EvaluationGate state={state}>
        {(evaluation) => {
          const active = evaluation.constraints;
          return (
            <>
              {declared && (
                <p role="status" className="note-pending">
                  {t.tool.constraints.declaredNote}{" "}
                  <button type="button" onClick={() => setDeclared(null)}>
                    {t.tool.constraints.reset}
                  </button>
                </p>
              )}
              <MetricCard label={t.tool.constraints.water} metric={active.max_water_mm_year} />
              <dl className="facts" data-guide-id="constraints.current">
                <dt>{t.tool.constraints.machinery}</dt>
                <dd>{active.available_machinery.map(readable).join(", ") || t.tool.constraints.none}</dd>
                <dt>{t.tool.constraints.noBuyer}</dt>
                <dd>{active.crops_without_buyer.map(readable).join(", ") || t.tool.constraints.none}</dd>
                <dt>{t.tool.constraints.window}</dt>
                <dd>{pick(active.planting_window.label)}</dd>
              </dl>
              <ConstraintsEditor
                key={JSON.stringify(declared)}
                initialConstraints={active}
                onSave={handleSave}
                isSubmitting={false}
              />
            </>
          );
        }}
      </EvaluationGate>
    </>
  );
}
