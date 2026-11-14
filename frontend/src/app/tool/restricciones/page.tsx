"use client";
import { EvaluationGate } from "@/lib/components/LoadGate";
import { MetricCard } from "@/lib/components/MetricCard";
import { useI18n } from "@/lib/i18n";
import { Pending } from "../_components/Pending";
import { useToolEvaluation } from "../_components/useToolEvaluation";

const readable = (code: string) => code.replaceAll("_", " ");

export default function ConstraintsPage() {
  const { t, pick } = useI18n();
  const state = useToolEvaluation();
  return (
    <>
      <title>{`${t.tool.steps.constraints.name} · Field Shift`}</title>
      <h1>{t.tool.steps.constraints.title}</h1>
      <p>{t.tool.constraints.intro}</p>
      <EvaluationGate state={state}>
        {({ constraints }) => (
          <>
            <MetricCard label={t.tool.constraints.water} metric={constraints.max_water_mm_year} />
            <dl className="facts">
              <dt>{t.tool.constraints.machinery}</dt>
              <dd>{constraints.available_machinery.map(readable).join(", ") || t.tool.constraints.none}</dd>
              <dt>{t.tool.constraints.noBuyer}</dt>
              <dd>{constraints.crops_without_buyer.map(readable).join(", ") || t.tool.constraints.none}</dd>
              <dt>{t.tool.constraints.window}</dt>
              <dd>{pick(constraints.planting_window.label)}</dd>
            </dl>
          </>
        )}
      </EvaluationGate>
      <Pending>{t.tool.constraints.editPending}</Pending>
    </>
  );
}
