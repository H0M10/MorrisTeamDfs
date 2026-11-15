"use client";
// "¿Cuándo está expuesto tu campo?": año típico en una tabla real (accesible
// por sí misma), con tono por nivel además del número, y frases calculadas por
// código. La helada y el calor son regionales (NASA POWER, unos 50 km): la
// nota lo dice (AGENTS.md regla 5).
import type { TimelineMonth } from "@/lib/contract";
import { useI18n } from "@/lib/i18n";
import { GREEN_MIN, seasonFacts, typicalYear, type MonthSummary } from "./seasons";

type CountRow = "exposed" | "snow" | "frostWhileGreen" | "heatWhileGreen";
type AvgRow = "frostAvg" | "heatAvg";

export function FieldSeasons({ timeline }: { timeline: TimelineMonth[] }) {
  const { t, lang } = useI18n();
  const s = t.tool.seasons;
  const summary = typicalYear(timeline);
  const facts = seasonFacts(timeline, summary);
  const list = new Intl.ListFormat(lang === "es" ? "es" : "en", { type: "conjunction" });
  const names = (months: number[]) => list.format(months.map((m) => s.monthNames[m - 1] ?? ""));
  const number = new Intl.NumberFormat(lang === "es" ? "es-MX" : "en-US", {
    maximumFractionDigits: 0,
  });
  const hasSnow = summary.some((m) => m.snow > 0);

  const lines: string[] = [];
  lines.push(
    facts.exposedMonths > 0
      ? s.exposedSummary(
          facts.exposedMonths,
          facts.monthsWithData,
          facts.mostlyExposed.length > 0 ? names(facts.mostlyExposed) : null,
        )
      : s.noExposed,
  );
  if (facts.frostGreenMonths.length > 0) lines.push(s.frostSummary(names(facts.frostGreenMonths)));
  if (facts.heatGreenMonths.length > 0) lines.push(s.heatSummary(names(facts.heatGreenMonths)));
  if (facts.frostGreenMonths.length === 0 && facts.heatGreenMonths.length === 0)
    lines.push(s.noStress);

  const countCell = (m: MonthSummary, row: CountRow, tone: string) => {
    const n = m[row];
    const level = m.withData === 0 ? 0 : Math.min(3, Math.ceil((n / m.withData) * 3));
    return (
      <td key={m.month} className="season-cell" data-tone={tone} data-level={level}>
        {m.withData === 0 ? s.noData : s.yearsOf(n, m.withData)}
      </td>
    );
  };
  const avgCell = (m: MonthSummary, row: AvgRow, tone: string, max: number) => {
    const v = m[row];
    const level = v === null || max === 0 ? 0 : Math.min(3, Math.ceil((v / max) * 3));
    return (
      <td key={m.month} className="season-cell" data-tone={tone} data-level={level}>
        {v === null ? s.noData : number.format(v)}
      </td>
    );
  };
  const maxOf = (row: AvgRow) => Math.max(0, ...summary.map((m) => m[row] ?? 0));

  return (
    <section aria-labelledby="seasons-title" data-guide-id="portrait.seasons">
      <h2 id="seasons-title">{s.title}</h2>
      <p>{s.lead}</p>
      <div className="priority-result">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <div className="table-wrap" tabIndex={0} role="region" aria-labelledby="seasons-title">
        <table className="seasons">
          <caption>{s.caption}</caption>
          <thead>
            <tr>
              <td />
              {t.common.months.map((name, i) => (
                <th scope="col" key={name} abbr={s.monthNames[i]}>
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">{s.rows.exposed}</th>
              {summary.map((m) => countCell(m, "exposed", "earth"))}
            </tr>
            {hasSnow && (
              <tr>
                <th scope="row">{s.rows.snow}</th>
                {summary.map((m) => countCell(m, "snow", "blue"))}
              </tr>
            )}
            <tr>
              <th scope="row">{s.rows.frostGreen}</th>
              {summary.map((m) => countCell(m, "frostWhileGreen", "blue"))}
            </tr>
            <tr>
              <th scope="row">{s.rows.heatGreen}</th>
              {summary.map((m) => countCell(m, "heatWhileGreen", "straw"))}
            </tr>
            <tr>
              <th scope="row">{s.rows.frost}</th>
              {summary.map((m) => avgCell(m, "frostAvg", "blue", maxOf("frostAvg")))}
            </tr>
            <tr>
              <th scope="row">{s.rows.heat}</th>
              {summary.map((m) => avgCell(m, "heatAvg", "straw", maxOf("heatAvg")))}
            </tr>
          </tbody>
        </table>
      </div>
      <details>
        <summary>{s.howTitle}</summary>
        <ul>
          {s.how(GREEN_MIN).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}
