"use client";
// La tira de la parcela: un calendario de 36 meses pintado con el color medio
// real de cada mes. Primera versión. La tabla que la acompaña es su
// alternativa accesible y trae los mismos datos (AGENTS.md sección 9).
import type { TimelineMonth } from "@/lib/contract";
import { useI18n } from "@/lib/i18n";

export function ParcelStrip({ timeline }: { timeline: TimelineMonth[] }) {
  const { t, pick, month, value } = useI18n();
  const first = timeline[0];
  const last = timeline[timeline.length - 1];
  if (!first || !last) return null;

  const years = new Map<string, TimelineMonth[]>();
  for (const item of timeline) {
    const year = item.month.slice(0, 4);
    years.set(year, [...(years.get(year) ?? []), item]);
  }

  return (
    <section aria-labelledby="strip-title">
      <h2 id="strip-title">{t.strip.title}</h2>
      <p>{t.strip.lead}</p>

      <div className="strip" role="img" aria-label={t.strip.summary(month(first.month), month(last.month))}>
        <div className="strip-row" aria-hidden="true">
          <span />
          {t.common.months.map((name) => (
            <span key={name} className="month-head">
              {name}
            </span>
          ))}
        </div>
        {[...years.entries()].map(([year, items]) => (
          <div className="strip-row" key={year}>
            <span className="year">{year}</span>
            {items.map((item) => (
              <span
                key={item.month}
                className="strip-cell"
                style={{ gridColumn: Number(item.month.slice(5, 7)) + 1, background: item.hls_color_hex }}
                title={`${month(item.month)}: ${pick(item.crop_label)}`}
              />
            ))}
          </div>
        ))}
      </div>

      <details>
        <summary>{t.strip.showTable}</summary>
        <div className="table-wrap">
          <table>
            <caption>{t.strip.caption}</caption>
            <thead>
              <tr>
                <th scope="col">{t.strip.month}</th>
                <th scope="col">{t.strip.color}</th>
                <th scope="col">{t.strip.crop}</th>
                <th scope="col">{t.strip.vigor}</th>
                <th scope="col">{t.strip.rain}</th>
                <th scope="col">{t.strip.waterUse}</th>
                <th scope="col">{t.strip.frost}</th>
                <th scope="col">{t.strip.heat}</th>
              </tr>
            </thead>
            <tbody>
              {timeline.map((item) => (
                <tr key={item.month}>
                  <th scope="row">{month(item.month)}</th>
                  <td>
                    <span className="swatch" style={{ background: item.hls_color_hex }} aria-hidden="true" />
                    {item.hls_color_hex}
                  </td>
                  <td>{pick(item.crop_label)}</td>
                  <td>{value(item.indices.ndvi)}</td>
                  <td>{value(item.rain_mm)}</td>
                  <td>{value(item.et_mm)}</td>
                  <td>{value(item.frost_days)}</td>
                  <td>{value(item.heat_days)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
