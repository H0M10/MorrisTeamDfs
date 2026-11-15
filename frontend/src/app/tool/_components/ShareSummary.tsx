"use client";
// Resumen de una evaluación para la hoja impresa y para la vista del técnico.
import type { Evaluation } from "@/lib/contract";
import { useI18n } from "@/lib/i18n";
import { ParcelStrip } from "./ParcelStrip";

export function ShareSummary({ evaluation }: { evaluation: Evaluation }) {
  const { t, pick, value } = useI18n();
  const c = evaluation.constraints;
  return (
    <>
      <p>
        <strong>{t.tool.share.parcel}:</strong> {pick(evaluation.parcel.name)} (
        {value(evaluation.parcel.area_ha)})
      </p>
      <dl className="facts">
        <dt>{t.tool.constraints.water}</dt>
        <dd>
          {value(c.max_water_mm_year)} ({t.common.kinds[c.max_water_mm_year.type]})
        </dd>
        <dt>{t.tool.constraints.window}</dt>
        <dd>{pick(c.planting_window.label)}</dd>
      </dl>
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
              <th scope="col">{t.tool.share.cover}</th>
              <th scope="col">{t.common.source}</th>
            </tr>
          </thead>
          <tbody>
            {evaluation.strategies.map((strategy) => {
              const water = strategy.metrics.annual_water_mm;
              const cover = strategy.metrics.soil_cover_months_36m;
              return (
                <tr key={strategy.id}>
                  <th scope="row">{pick(strategy.title)}</th>
                  <td>
                    {strategy.rejection_reason
                      ? `${t.tool.rotations.ruledOut}. ${pick(strategy.rejection_reason)}`
                      : t.tool.rotations.viable}
                  </td>
                  <td>
                    {value(water)} ({t.common.kinds[water.type]})
                  </td>
                  <td>{value(cover)} ({t.common.kinds[cover.type]})</td>
                  <td>
                    {water.source}. {water.date}. {water.native_scale}.
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ParcelStrip timeline={evaluation.timeline} />
    </>
  );
}

/** El mismo resumen como texto corrido, para leerlo en voz alta. */
export function useSummaryText() {
  const { t, pick, value } = useI18n();
  return (evaluation: Evaluation) => {
    const lines = [`${t.tool.share.parcel}: ${pick(evaluation.parcel.name)}.`];
    if (!evaluation.has_viable_options) lines.push(t.tool.rotations.noneViable);
    for (const strategy of evaluation.strategies) {
      const status = strategy.rejection_reason
        ? `${t.tool.rotations.ruledOut}. ${pick(strategy.rejection_reason)}`
        : `${t.tool.rotations.viable}. ${t.tool.rotations.waterPerYear}: ${value(strategy.metrics.annual_water_mm)}, ${t.common.kinds[strategy.metrics.annual_water_mm.type]}.`;
      lines.push(`${pick(strategy.title)}: ${status}`);
    }
    return lines.join(" ");
  };
}
