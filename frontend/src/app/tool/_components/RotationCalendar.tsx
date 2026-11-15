"use client";
// Calendario de 36 meses de las tres rotaciones, alineadas mes con mes.
// Cada cuadro sale de `strategy.sequence_36m` del contrato: cultivo, color de
// la paleta y trama. Nada es fijo ni de ejemplo (AGENTS.md regla 1).
// La trama acompaña al color para no depender de él; la tabla de abajo es la
// alternativa accesible con la misma información (AGENTS.md sección 9).
import type { CSSProperties } from "react";
import { useI18n } from "@/lib/i18n";
import type { Strategy } from "./priorities";

type SequenceMonth = Strategy["sequence_36m"][number];

export function RotationCalendar({ strategies }: { strategies: Strategy[] }) {
  const { t, pick, month } = useI18n();
  const r = t.tool.rotations;
  const reference = strategies[0]?.sequence_36m ?? [];
  const first = reference[0];
  const last = reference[reference.length - 1];
  if (!first || !last) return null;

  const years = [...new Set(reference.map((item) => item.month.slice(0, 4)))];
  const byMonth = (strategy: Strategy) =>
    new Map(strategy.sequence_36m.map((item) => [item.month, item]));
  const maps = strategies.map((strategy) => ({ strategy, months: byMonth(strategy) }));

  // Leyenda: un renglón por cultivo distinto que aparece en alguna rotación.
  const legend = new Map<string, SequenceMonth>();
  for (const strategy of strategies) {
    for (const item of strategy.sequence_36m) {
      if (!legend.has(item.crop_code)) legend.set(item.crop_code, item);
    }
  }

  const cell = (item: SequenceMonth | undefined, key: string) =>
    item ? (
      <span
        key={key}
        className="crop-cell"
        data-palette={item.palette_token}
        data-pattern={item.pattern}
        // Columna del mes: con el nombre a la izquierda (pantalla ancha) o arriba (teléfono).
        style={
          {
            "--col": Number(item.month.slice(5, 7)) + 1,
            "--col-sm": Number(item.month.slice(5, 7)),
          } as CSSProperties
        }
        title={`${month(item.month)}: ${pick(item.crop_label)}`}
      />
    ) : null;

  return (
    <section aria-labelledby="calendar-title">
      <h2 id="calendar-title">{r.calendarTitle}</h2>
      <p>{r.calendarLead}</p>

      <div
        className="rotation-calendar"
        role="img"
        aria-label={r.calendarLabel(strategies.length, month(first.month), month(last.month))}
      >
        {years.map((year) => (
          <div className="cal-year" key={year}>
            <div className="cal-row cal-head" aria-hidden="true">
              <span className="cal-name cal-year-label">{year}</span>
              {t.common.months.map((name) => (
                <span key={name} className="month-head">
                  {name}
                </span>
              ))}
            </div>
            {maps.map(({ strategy, months }) => (
              <div
                className={`cal-row${strategy.viable ? "" : " cal-ruled-out"}`}
                key={strategy.id}
              >
                <span className="cal-name">
                  {pick(strategy.title)}
                  {!strategy.viable && <em> ({r.ruledOutTag})</em>}
                </span>
                {Array.from({ length: 12 }, (_, i) => {
                  const key = `${year}-${String(i + 1).padStart(2, "0")}`;
                  return cell(months.get(key), key);
                })}
              </div>
            ))}
          </div>
        ))}
      </div>

      <h3>{r.legendTitle}</h3>
      <ul className="cal-legend">
        {[...legend.values()].map((item) => (
          <li key={item.crop_code}>
            <span
              className="crop-cell crop-swatch"
              data-palette={item.palette_token}
              data-pattern={item.pattern}
              aria-hidden="true"
            />
            {pick(item.crop_label)}
          </li>
        ))}
      </ul>

      <details>
        <summary>{r.showCalendarTable}</summary>
        <div className="table-wrap">
          <table>
            <caption>{r.calendarCaption}</caption>
            <thead>
              <tr>
                <th scope="col">{r.month}</th>
                {strategies.map((strategy) => (
                  <th scope="col" key={strategy.id}>
                    {pick(strategy.title)}
                    {!strategy.viable && ` (${r.ruledOutTag})`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reference.map((item) => (
                <tr key={item.month}>
                  <th scope="row">{month(item.month)}</th>
                  {maps.map(({ strategy, months }) => {
                    const entry = months.get(item.month);
                    return (
                      <td key={strategy.id}>{entry ? pick(entry.crop_label) : t.common.noData}</td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
