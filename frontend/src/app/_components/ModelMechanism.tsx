"use client";
import { useState, useSyncExternalStore } from "react";
import type { Evaluation } from "@/lib/contract";
import { useA11y } from "@/lib/a11y/profile";
import { useI18n } from "@/lib/i18n";

function subscribeMotion(notify: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
}

export function ModelMechanism({
  model,
  data,
}: {
  model: string;
  data: Evaluation | null;
}) {
  const { lang, pick } = useI18n();
  const tr = (es: string, en: string) => (lang === "en" ? en : es);
  const { profile } = useA11y();
  const [paused, setPaused] = useState(false);
  const systemReduced = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  const stopped = paused || profile.reduceMotion || systemReduced;
  const months = data?.timeline.slice(-12) ?? [];
  const series =
    model === "4"
      ? months.map((m) => m.soil_moisture.value)
      : months.map((m) => m.et_mm.value);
  const extents =
    model === "4"
      ? months.flatMap((m) =>
          m.soil_moisture.interval
            ? [m.soil_moisture.interval.lower, m.soil_moisture.interval.upper]
            : [],
        )
      : [];
  const values = [...series, ...extents].filter(
    (v): v is number => v !== null && Number.isFinite(v),
  );
  const lo = values.length ? Math.min(...values) : 0;
  const hi = values.length ? Math.max(...values) : 1;
  const x = (i: number) => 65 + i * 55;
  const y = (v: number) => 245 - ((v - lo) / Math.max(hi - lo, 0.00001)) * 170;
  const line = series
    .map((v, i) =>
      v === null
        ? ""
        : `${i === 0 || series[i - 1] === null ? "M" : "L"}${x(i)},${y(v)}`,
    )
    .join(" ");
  const nodes = model === "5" && data ? data.strategies[1].sequence_36m : [];
  const groups = Array.from({ length: 3 }, (_, i) =>
    Array.from(
      new Set(nodes.slice(i * 12, i * 12 + 12).map((m) => pick(m.crop_label))),
    ).join(" / "),
  );
  return (
    <figure
      className="mission-mechanism"
      data-model={model}
      data-paused={stopped}
    >
      <div className="mission-animation-heading">
        <figcaption>
          {tr("Visualización del método", "Method visualization")} /{" "}
          {model === "physics" ? "FAO-56" : `M${model}`}
        </figcaption>
        <button
          type="button"
          aria-pressed={stopped}
          disabled={profile.reduceMotion || systemReduced}
          onClick={() => setPaused((v) => !v)}
        >
          {stopped ? tr("Reanudar", "Resume") : tr("Pausar", "Pause")}
        </button>
      </div>
      <svg
        viewBox="0 0 760 320"
        role="img"
        aria-label={tr(
          model === "4"
            ? "Intervalos y humedad regional del último año"
            : model === "5"
              ? "Recorrido entre los tres años de la alternativa de menor agua"
              : model === "physics"
                ? "Evapotranspiración mensual de la parcela"
                : "Esquema animado del flujo del modelo",
          model === "4"
            ? "Intervals and regional moisture for the last year"
            : model === "5"
              ? "Path through the three years of the lower-water alternative"
              : model === "physics"
                ? "Monthly field evapotranspiration"
                : "Animated schematic of the model workflow",
        )}
      >
        <defs>
          <marker
            id={`arrow-${model}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path d="M0 0L10 5L0 10" fill="none" stroke="currentColor" />
          </marker>
        </defs>
        {(model === "1" || model === "2") && (
          <>
            <g className="mechanism-grid">
              {[80, 160, 240].map((n) => (
                <path key={n} d={`M35 ${n}H725`} />
              ))}
            </g>
            {model === "1" ? (
              <>
                <text x="35" y="35">
                  {tr("Cultivo · clima · suelo", "Crop · climate · soil")}
                </text>
                {[0, 1, 2].map((n) => (
                  <g key={n} transform={`translate(${70 + n * 235},60)`}>
                    <path
                      className="mechanism-path"
                      style={{ animationDelay: `${n * 0.6}s` }}
                      d="M65 0V45L15 90M65 45L115 90M15 90V135M115 90V135"
                    />
                    <circle cx="65" cy="0" r="5" />
                    <circle cx="15" cy="90" r="4" />
                    <circle cx="115" cy="90" r="4" />
                    <text x="65" y="170" textAnchor="middle">
                      {tr("Árbol", "Tree")}
                    </text>
                  </g>
                ))}
                <path className="mechanism-path" d="M135 245H605" />
                <text x="380" y="290" textAnchor="middle">
                  {tr(
                    "Ensamble → ET mensual → riego neto",
                    "Ensemble → monthly ET → net irrigation",
                  )}
                </text>
              </>
            ) : (
              <>
                <text x="35" y="38">
                  {tr(
                    "Una comparación, dos variantes",
                    "One comparison, two variants",
                  )}
                </text>
                <path
                  className="mechanism-path"
                  d="M65 155H240M240 155L340 85H620M240 155L340 235H620"
                />
                <circle cx="65" cy="155" r="8" />
                <rect x="350" y="55" width="255" height="58" />
                <rect x="350" y="205" width="255" height="58" />
                <text x="477" y="90" textAnchor="middle">
                  {tr("Sin cultivo anterior", "Without prior crop")}
                </text>
                <text x="477" y="240" textAnchor="middle">
                  {tr("Con cultivo anterior", "With prior crop")}
                </text>
                <text x="35" y="290">
                  {tr(
                    "La línea base decide si aporta evidencia.",
                    "The baseline determines whether it adds evidence.",
                  )}
                </text>
              </>
            )}
          </>
        )}
        {(model === "4" || model === "physics") && (
          <>
            <g className="mechanism-grid">
              {[75, 160, 245].map((n) => (
                <path key={n} d={`M65 ${n}H670`} />
              ))}
            </g>
            <text x="65" y="28">
              {model === "4"
                ? tr("SMAP regional · m³/m³", "Regional SMAP · m³/m³")
                : tr("ET mensual · mm", "Monthly ET · mm")}
            </text>
            {values.length > 0 ? (
              <>
                {model === "4" &&
                  months.map((m, i) => {
                    const interval = m.soil_moisture.interval;
                    return interval ? (
                      <g
                        key={m.month}
                        className="mechanism-interval"
                        style={{ animationDelay: `${i * 0.1}s` }}
                      >
                        <path
                          d={`M${x(i)} ${y(interval.lower)}V${y(interval.upper)}M${x(i) - 6} ${y(interval.lower)}h12M${x(i) - 6} ${y(interval.upper)}h12`}
                        />
                      </g>
                    ) : null;
                  })}
                <path className="mechanism-series" d={line} />
                {series.map((v, i) =>
                  v !== null ? (
                    <circle key={i} cx={x(i)} cy={y(v)} r="4" />
                  ) : null,
                )}
                <text x="16" y="80">
                  {hi.toFixed(model === "4" ? 2 : 0)}
                </text>
                <text x="16" y="250">
                  {lo.toFixed(model === "4" ? 2 : 0)}
                </text>
                <text x="65" y="285">
                  {months[0]?.month}
                </text>
                <text x="670" y="285" textAnchor="end">
                  {months[11]?.month}
                </text>
                <path className="mechanism-scan" d="M65 50V255" />
              </>
            ) : (
              <text x="380" y="165" textAnchor="middle">
                {tr("Esperando datos de la parcela", "Waiting for field data")}
              </text>
            )}
          </>
        )}
        {model === "5" && (
          <>
            <text x="35" y="35">
              {tr(
                "Secuencia final de la alternativa de menor agua",
                "Final sequence of the lower-water alternative",
              )}
            </text>
            <path
              className="mechanism-path"
              d="M145 145H615"
              markerEnd={`url(#arrow-${model})`}
            />
            {[145, 380, 615].map((n, i) => (
              <g key={n}>
                <circle cx={n} cy="145" r="48" />
                <text x={n} y="152" textAnchor="middle">
                  {tr("Año", "Year")} {i + 1}
                </text>
              </g>
            ))}
            <circle className="mechanism-traveler" cx="145" cy="145" r="7" />
            <text x="380" y="265" textAnchor="middle">
              {tr(
                "Transiciones observadas → candidatas → restricciones",
                "Observed transitions → candidates → constraints",
              )}
            </text>
          </>
        )}
      </svg>
      {model === "5" && data && (
        <ol className="mechanism-sequence-text">
          {groups.map((g, i) => (
            <li key={i}>
              {tr("Año", "Year")} {i + 1}: {g}
            </li>
          ))}
        </ol>
      )}
      <p>
        {model === "4"
          ? tr(
              "Los puntos son valores regionales de SMAP; las líneas verticales son intervalos del modelo cuando están disponibles. El recorrido del cursor solo ayuda a leer el tiempo.",
              "Points are regional SMAP values; vertical lines are model intervals when available. The moving cursor only helps read time.",
            )
          : model === "physics"
            ? tr(
                "Los valores y el periodo vienen de la evaluación. La animación recorre la serie; no simula lluvia ni calcula datos nuevos.",
                "Values and period come from the evaluation. Animation scans the series; it does not simulate rainfall or generate new data.",
              )
            : tr(
                "Recorrido ilustrativo del método. Las cifras medidas se muestran en validación; las conexiones no representan pesos reales.",
                "Illustrative method walkthrough. Measured figures appear in validation; connections do not represent actual weights.",
              )}
      </p>
    </figure>
  );
}
