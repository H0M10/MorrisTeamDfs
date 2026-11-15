"use client";
import { EvaluationGate } from "@/lib/components/LoadGate";
import { MetricCard } from "@/lib/components/MetricCard";
import type { LocalizedText } from "@/lib/contract";
import { useDeclaredConstraints, useParcelId } from "@/lib/evaluation";
import { useI18n } from "@/lib/i18n";
import { AskBox } from "../_components/AskBox";
import { useToolEvaluation } from "../_components/useToolEvaluation";

export default function EvidencePage() {
  const { t, pick } = useI18n();
  const state = useToolEvaluation();
  const [parcelId] = useParcelId();
  const [constraints] = useDeclaredConstraints(parcelId);
  const list = (title: string, items: LocalizedText[]) => (
    <>
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item.es}>{pick(item)}</li>
        ))}
      </ul>
    </>
  );
  return (
    <>
      <title>{`${t.tool.steps.evidence.name} · Field Shift`}</title>
      <h1>{t.tool.steps.evidence.title}</h1>
      <EvaluationGate state={state}>
        {(evaluation) => (
          <>
            {evaluation.strategies.map((strategy) => (
              <section
                key={strategy.id}
                aria-labelledby={`evidence-${strategy.id}`}
                data-guide-id={`evidence.${strategy.id}`}
              >
                <h2 id={`evidence-${strategy.id}`}>{pick(strategy.title)}</h2>
                {strategy.rejection_reason ? (
                  // Restricciones primero: de una rotación descartada no se listan ventajas.
                  <p className="status-out">
                    <strong>{t.tool.evidence.rejected}.</strong> {pick(strategy.rejection_reason)}
                  </p>
                ) : (
                  <>
                    <h3>{t.tool.evidence.why}</h3>
                    <p>{pick(strategy.evidence_card.why_suggested)}</p>
                    <div className="evidence-card">
                      <div className="evidence-card-info">
                        {list(t.tool.evidence.support, strategy.evidence_card.supporting_evidence)}
                      </div>
                      <div className="evidence-card-info">
                        {list(t.tool.evidence.benefits, strategy.evidence_card.benefits)}
                      </div>
                      <div className="evidence-card-info">
                        {list(t.tool.evidence.gaps, strategy.evidence_card.information_gaps)}
                      </div>
                      <div className="evidence-card-info">
                        {list(t.tool.evidence.risks, strategy.evidence_card.local_review_risks)}
                      </div>
                    </div>
                    {/* {list(t.tool.evidence.support, strategy.evidence_card.supporting_evidence)}
                    {list(t.tool.evidence.benefits, strategy.evidence_card.benefits)}
                    {list(t.tool.evidence.gaps, strategy.evidence_card.information_gaps)}
                    {list(t.tool.evidence.risks, strategy.evidence_card.local_review_risks)} */}
                    <MetricCard label={t.tool.rotations.waterPerYear} metric={strategy.metrics.annual_water_mm} />
                  </>
                )}
              </section>
            ))}
            <AskBox parcelId={parcelId} constraints={constraints} />
          </>
        )}
      </EvaluationGate>
    </>
  );
}
