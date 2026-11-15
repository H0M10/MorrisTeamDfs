"use client";

import { empiricalCoverage, meanWidth } from "../_lib/metrics";
import { engineerCopy } from "../_lib/copy";
import type { CqrData } from "../_lib/types";

function formatPercent(value: number | null, pending: string): string {
  return value === null ? pending : `${(value * 100).toFixed(1)}%`;
}

function formatNumber(value: number | null, pending: string): string {
  return value === null ? pending : value.toFixed(3);
}

function BandChart({ data, lang }: { data: CqrData; lang: "es" | "en" }) {
  const copy = engineerCopy[lang];
  if (data.points.length === 0) return <p>{copy.noChartData}</p>;

  const values = data.points.flatMap(({ y, lo, hi }) => [y, lo, hi]);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const span = maximum - minimum || 1;
  const x = (index: number) =>
    36 + (index * 568) / Math.max(data.points.length - 1, 1);
  const y = (value: number) => 172 - ((value - minimum) / span) * 144;
  const upper = data.points.map((point, index) => `${x(index)},${y(point.hi)}`).join(" ");
  const lower = [...data.points]
    .reverse()
    .map((point, reverseIndex) => {
      const index = data.points.length - reverseIndex - 1;
      return `${x(index)},${y(point.lo)}`;
    })
    .join(" ");
  const observed = data.points.map((point, index) => `${x(index)},${y(point.y)}`).join(" ");

  return (
    <svg
      role="img"
      aria-label={copy.chartAlt}
      viewBox="0 0 640 200"
      width="100%"
      height="200"
    >
      <title>{copy.chartTitle}</title>
      <line x1="36" y1="172" x2="604" y2="172" stroke="currentColor" />
      <polygon points={`${upper} ${lower}`} fill="#e9b824" fillOpacity="0.35" />
      <polyline points={observed} fill="none" stroke="#a9c8ff" strokeWidth="3" />
      {data.points.map((point, index) => (
        <circle key={point.month} cx={x(index)} cy={y(point.y)} r="3" fill="#ffffff" />
      ))}
    </svg>
  );
}

export function CqrAnalysis({ data, lang }: { data: CqrData; lang: "es" | "en" }) {
  const copy = engineerCopy[lang];
  const coverage = empiricalCoverage(data.points);
  const width = meanWidth(data.points);
  const hasData = data.points.length > 0;

  return (
    <section aria-labelledby="cqr-title">
      <h2 id="cqr-title">{copy.cqrTitle}</h2>
      <p>
        {copy.cqrDescription} {lang === "es" ? "Escala" : "Scale"}: {data.scale}.
      </p>
      <dl className="facts">
        <dt>{copy.empiricalCoverage}</dt>
        <dd>{formatPercent(coverage, copy.pending)}</dd>
        <dt>{copy.nominalCoverage}</dt>
        <dd>{formatPercent(data.nominalCoverage, copy.pending)}</dd>
        <dt>{copy.meanWidth}</dt>
        <dd>
          {formatNumber(width, copy.pending)}
          {width !== null && data.unit ? ` ${data.unit}` : ""}
        </dd>
      </dl>
      {hasData ? (
        <>
          <BandChart data={data} lang={lang} />
          <div className="table-wrap" tabIndex={0} role="region" aria-label={copy.tableRegion}>
            <table>
              <caption>{copy.tableCaption}</caption>
              <thead>
                <tr>
                  <th scope="col">{copy.month}</th>
                  <th scope="col">{copy.observation}</th>
                  <th scope="col">{copy.lower}</th>
                  <th scope="col">{copy.upper}</th>
                  <th scope="col">{copy.unit}</th>
                  <th scope="col">{copy.source}</th>
                  <th scope="col">{copy.date}</th>
                  <th scope="col">{copy.nativeScale}</th>
                </tr>
              </thead>
              <tbody>
                {data.points.map((point) => (
                  <tr key={point.month}>
                    <th scope="row">{point.month}</th>
                    <td>{point.y}</td>
                    <td>{point.lo}</td>
                    <td>{point.hi}</td>
                    <td>{point.unit}</td>
                    <td>{point.source}</td>
                    <td>{point.date}</td>
                    <td>{point.nativeScale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p role="status">{copy.noCqrData}</p>
      )}
    </section>
  );
}
