"use client";
// Las tres rotaciones lado a lado con todas las métricas del contrato.
// Cada cifra lleva su ficha a un toque: tipo, fuente, fecha y escala
// (AGENTS.md regla 4). De una rotación descartada no se comparan cifras:
// se dice por qué se descartó (regla 3, restricciones primero).
import type { MetricValue } from "@/lib/contract";
import { useI18n } from "@/lib/i18n";
import type { RankableKey, Strategy } from "./priorities";

const ROWS = [
  "annual_water_mm",
  "water_delta_vs_current_mm",
  "soil_cover_months_36m",
  "frost_risk_days_year",
  "heat_risk_days_year",
  "prior_crop_vigor_delta_pct",
] as const;

export function ComparisonTable({
  strategies,
  best,
}: {
  strategies: Strategy[];
  best: Partial<Record<RankableKey, string>>;
}) {
  const { t, pick, value } = useI18n();
  const r = t.tool.rotations;
  const badges = (id: string) =>
    (Object.entries(best) as [RankableKey, string][])
      .filter(([, strategyId]) => strategyId === id)
      .map(([key]) => r.best[key]);

  const metricCell = (metric: MetricValue) => (
    <>
      <span className="metric-value">
        {value(metric)}
        {metric.interval && ` (${metric.interval.lower} – ${metric.interval.upper})`}
      </span>{" "}
      <span className="metric-kind">{t.common.kinds[metric.type]}</span>
      <details className="metric-source">
        <summary>{r.whereFrom}</summary>
        <dl className="facts">
          <dt>{t.common.source}</dt>
          <dd>{metric.source}</dd>
          <dt>{t.common.date}</dt>
          <dd>{metric.date}</dd>
          <dt>{t.common.scale}</dt>
          <dd>{metric.native_scale}</dd>
        </dl>
      </details>
    </>
  );

  return (
    <section aria-labelledby="compare-title">
      <h2 id="compare-title">{r.compareTitle}</h2>
      <div className="table-wrap" tabIndex={0} role="region" aria-labelledby="compare-title">
        <table className="compare">
          <caption>{r.compareCaption}</caption>
          <thead>
            <tr>
              <td />
              {strategies.map((strategy) => (
                <th scope="col" key={strategy.id}>
                  <span className="compare-title">{pick(strategy.title)}</span>
                  <span className={strategy.viable ? "status-viable" : "status-out"}>
                    {strategy.viable ? r.viable : r.ruledOut}
                  </span>
                  {badges(strategy.id).map((badge) => (
                    <span className="badge" key={badge}>
                      {badge}
                    </span>
                  ))}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row}>
                <th scope="row">{r.rowNames[row]}</th>
                {strategies.map((strategy) => (
                  <td key={strategy.id}>
                    {strategy.viable ? metricCell(strategy.metrics[row]) : r.notCompared}
                  </td>
                ))}
              </tr>
            ))}
            {strategies.some((strategy) => strategy.rejection_reason) && (
              <tr>
                <th scope="row">{r.whyRuledOut}</th>
                {strategies.map((strategy) => (
                  <td key={strategy.id}>
                    {strategy.rejection_reason ? pick(strategy.rejection_reason) : "—"}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
