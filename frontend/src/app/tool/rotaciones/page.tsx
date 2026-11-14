"use client";
import { EvaluationGate } from "@/lib/components/LoadGate";
import { useI18n } from "@/lib/i18n";
import { Pending } from "../_components/Pending";
import { useToolEvaluation } from "../_components/useToolEvaluation";

export default function RotationsPage() {
  const { t, pick, value } = useI18n();
  const state = useToolEvaluation();
  return (
    <>
      <title>{`${t.tool.steps.rotations.name} · Field Shift`}</title>
      <h1>{t.tool.steps.rotations.title}</h1>
      <EvaluationGate state={state}>
        {(evaluation) => (
          <>
            {!evaluation.has_viable_options && (
              <p role="status">
                <strong>{t.tool.rotations.noneViable}</strong>
              </p>
            )}
            {evaluation.strategies.map((strategy) => (
              <section key={strategy.id} aria-labelledby={`rotation-${strategy.id}`}>
                <h2 id={`rotation-${strategy.id}`}>{pick(strategy.title)}</h2>
                <p className={strategy.viable ? "status-viable" : "status-out"}>
                  <strong>{strategy.viable ? t.tool.rotations.viable : t.tool.rotations.ruledOut}</strong>
                </p>
                {strategy.rejection_reason ? (
                  <p>{pick(strategy.rejection_reason)}</p>
                ) : (
                  <p>
                    {t.tool.rotations.waterPerYear}: {value(strategy.metrics.annual_water_mm)} (
                    {t.common.kinds[strategy.metrics.annual_water_mm.type]})
                  </p>
                )}
              </section>
            ))}
          </>
        )}
      </EvaluationGate>
      <Pending>{t.tool.rotations.calendarPending}</Pending>
    </>
  );
}
