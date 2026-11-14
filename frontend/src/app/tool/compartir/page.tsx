"use client";
import { EvaluationGate } from "@/lib/components/LoadGate";
import { useI18n } from "@/lib/i18n";
import { ParcelStrip } from "../_components/ParcelStrip";
import { Pending } from "../_components/Pending";
import { useToolEvaluation } from "../_components/useToolEvaluation";

export default function SharePage() {
  const { t, pick, value } = useI18n();
  const state = useToolEvaluation();
  return (
    <>
      <title>{`${t.tool.steps.share.name} · Field Shift`}</title>
      <h1>{t.tool.steps.share.title}</h1>
      <p className="no-print">{t.tool.share.intro}</p>
      <p className="no-print">
        <button type="button" className="primary" onClick={() => window.print()}>
          {t.tool.share.print}
        </button>
      </p>
      <EvaluationGate state={state}>
        {(evaluation) => (
          <>
            <p>
              <strong>{t.tool.share.parcel}:</strong> {pick(evaluation.parcel.name)}
            </p>
            {!evaluation.has_viable_options && (
              <p>
                <strong>{t.tool.rotations.noneViable}</strong>
              </p>
            )}
            <div className="table-wrap">
              <table>
                <caption>{t.tool.steps.rotations.title}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t.tool.share.rotation}</th>
                    <th scope="col">{t.tool.share.status}</th>
                    <th scope="col">{t.tool.rotations.waterPerYear}</th>
                    <th scope="col">{t.common.source}</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluation.strategies.map((strategy) => (
                    <tr key={strategy.id}>
                      <th scope="row">{pick(strategy.title)}</th>
                      <td>
                        {strategy.rejection_reason
                          ? `${t.tool.rotations.ruledOut}. ${pick(strategy.rejection_reason)}`
                          : t.tool.rotations.viable}
                      </td>
                      <td>
                        {value(strategy.metrics.annual_water_mm)} (
                        {t.common.kinds[strategy.metrics.annual_water_mm.type]})
                      </td>
                      <td>
                        {strategy.metrics.annual_water_mm.source}. {strategy.metrics.annual_water_mm.date}.{" "}
                        {strategy.metrics.annual_water_mm.native_scale}.
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ParcelStrip timeline={evaluation.timeline} />
          </>
        )}
      </EvaluationGate>
      <Pending>{t.tool.share.linkPending}</Pending>
    </>
  );
}
