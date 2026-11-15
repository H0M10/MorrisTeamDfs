"use client";

import { useEffect, useRef, useState } from "react";
import { engineerCopy } from "../_lib/copy";
import type { AttentionPoint } from "../_lib/types";

const INPUT_MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

function useNetworkVisibility(ref: React.RefObject<HTMLElement | null>): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setVisible(entry.isIntersecting);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return visible;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function LiveNetwork({
  lang,
  timeline = [],
}: {
  lang: "es" | "en";
  timeline?: AttentionPoint[];
}) {
  const copy = engineerCopy[lang];
  const sectionRef = useRef<HTMLElement | null>(null);
  const flowRef = useRef<SVGPathElement>(null);
  const visible = useNetworkVisibility(sectionRef);
  const reducedMotion = useReducedMotion();

  const weighted = timeline.filter(
    (item): item is AttentionPoint & { weight: number } =>
      typeof item.weight === "number" && Number.isFinite(item.weight),
  );
  const hasRealWeights = weighted.length > 0;
  const maxWeight = hasRealWeights ? Math.max(...weighted.map((w) => w.weight), 0.001) : 1;
  const topMonths = [...weighted]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3);

  useEffect(() => {
    if (!visible || reducedMotion || !flowRef.current) return;
    let frame = 0;
    let offset = 0;
    const animate = () => {
      offset = (offset + 0.5) % 14;
      flowRef.current?.setAttribute("stroke-dashoffset", String(-offset));
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [visible, reducedMotion]);

  return (
    <section ref={sectionRef} aria-labelledby="network-title">
      <h2 id="network-title">{copy.networkTitle}</h2>
      <p>{copy.networkDescription}</p>
      <svg
        role="img"
        aria-label={copy.networkAlt}
        viewBox="0 0 940 270"
        width="100%"
        height="270"
      >
        <title>{copy.networkDiagramTitle}</title>
        <path d="M72 115 H280 M440 115 H634" stroke="#a9c8ff" strokeWidth="4" />
        <path
          ref={flowRef}
          d="M72 115 H280 M440 115 H634"
          fill="none"
          stroke="#e9b824"
          strokeWidth="4"
          strokeDasharray="6 8"
        />
        {hasRealWeights
          ? weighted.slice(0, 36).map((point, index) => {
              const barWidth = Math.max(8, Math.round((point.weight / maxWeight) * 160));
              const y = 16 + index * 5.6;
              const isTop = topMonths.some((top) => top.month === point.month);
              return (
                <rect
                  key={point.month}
                  x="24"
                  y={y}
                  width={barWidth}
                  height="4"
                  fill={isTop ? "#e9b824" : "#a9c8ff"}
                />
              );
            })
          : INPUT_MONTHS.map((month, index) => {
              const y = 30 + index * 15.5;
              return (
                <g key={month}>
                  <circle cx="72" cy={y} r="5" fill="#a9c8ff" />
                </g>
              );
            })}
        <text x="20" y="242" fill="currentColor" fontSize="18">
          {copy.sequence}
        </text>
        <rect x="280" y="76" width="160" height="78" fill="none" stroke="currentColor" strokeWidth="2" />
        <text x="360" y="107" textAnchor="middle" fill="currentColor" fontSize="18">
          {copy.gru}
        </text>
        <text x="360" y="131" textAnchor="middle" fill="currentColor" fontSize="18">
          {copy.attention}
        </text>
        {copy.crops.map((label, index) => {
          const y = 60 + index * 36;
          return (
            <g key={label}>
              <circle cx="634" cy={y} r="6" fill="#a9c8ff" />
              <text x="650" y={y + 6} fill="currentColor" fontSize="18">
                {label}
              </text>
            </g>
          );
        })}
      </svg>
      {hasRealWeights ? (
        <div data-testid="attention-weights">
          <h3>{copy.attentionWeightsTitle}</h3>
          <ol>
            {topMonths.map((item) => (
              <li key={item.month}>
                <strong>{item.month}</strong>: {(item.weight * 100).toFixed(1)}%
                {item.cropLabel ? ` · ${lang === "en" ? item.cropLabel.en : item.cropLabel.es}` : ""}
              </li>
            ))}
          </ol>
          <details>
            <summary>{copy.attentionTableSummary}</summary>
            <div className="table-wrap" tabIndex={0} role="region" aria-label={copy.attentionWeightsTitle}>
              <table>
                <thead>
                  <tr>
                    <th scope="col">{copy.month}</th>
                    <th scope="col">{copy.attentionWeightCol}</th>
                    <th scope="col">{copy.cropLabelCol}</th>
                  </tr>
                </thead>
                <tbody>
                  {weighted.map((item) => (
                    <tr key={item.month}>
                      <th scope="row">{item.month}</th>
                      <td>{(item.weight * 100).toFixed(2)}%</td>
                      <td>{item.cropLabel ? (lang === "en" ? item.cropLabel.en : item.cropLabel.es) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      ) : (
        <p>{copy.architectureNote}</p>
      )}
    </section>
  );
}
