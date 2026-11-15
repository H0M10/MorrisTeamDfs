"use client";
// Envoltura accesible para la visualización 3D del Modelo 3 (GRU + atención temporal).
// Lee los datos reales del contrato (evaluation.timeline) y de GET /api/v1/predictions/{id}
// cuando la API y el modelo entrenado están disponibles; si no, muestra arquitectura sin inventar cifras.
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { api } from "@/lib/api";
import { prefersReducedMotion } from "@/lib/a11y/motion";
import { useA11y } from "@/lib/a11y/profile";
import { DataStatusBanner } from "@/lib/components/DataStatusBanner";
import type { Evaluation, PredictionsResponse, TimelineMonth } from "@/lib/contract";
import { useEvaluation, useParcelId } from "@/lib/evaluation";
import { useI18n } from "@/lib/i18n";
import type {
  DensityLevel,
  InputMonthDatum,
  MorphMode,
  OutputClassDatum,
} from "./NeuralNetCanvas";

const NeuralNetCanvas = dynamic(() => import("./NeuralNetCanvas"), {
  ssr: false,
  loading: () => <NeuralCanvasLoading />,
});

function NeuralCanvasLoading() {
  const { t } = useI18n();
  return (
    <div className="nn-canvas-frame nn-loading" role="status" aria-live="polite">
      <p>{t.landing.neural.loadingCanvas}</p>
    </div>
  );
}

const MORPH_ORDER: MorphMode[] = ["layers", "constellation", "helix"];
const OUTPUT_KEYS = ["alfalfa", "small_grain", "corn", "fallow"] as const;

function subscribeReducedMotion(onStoreChange: () => void) {
  if (typeof window === "undefined" || !("matchMedia" in window)) {
    return () => {};
  }
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getSystemReducedMotion(): boolean {
  return prefersReducedMotion();
}

function toInputDatum(
  item: TimelineMonth,
  index: number,
  topMonths: Set<string>,
  monthLabel: (ym: string) => string,
): InputMonthDatum {
  const w = item.attention_weight?.value;
  return {
    index,
    month: item.month,
    label: monthLabel(item.month),
    colorHex: item.hls_color_hex,
    weight: typeof w === "number" && Number.isFinite(w) ? w : 1 / 12,
    isTopAttention: topMonths.has(item.month),
    ndvi: typeof item.indices.ndvi.value === "number" ? item.indices.ndvi.value : null,
  };
}

function formatPct(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${Math.round(value * 100)} %`;
}

export function NeuralNetShowcase({ selectedParcelId }: { selectedParcelId?: string } = {}) {
  const { t, lang, pick, month } = useI18n();
  const n = t.landing.neural;
  const { profile } = useA11y();
  const [storedParcelId] = useParcelId();
  const parcelId = selectedParcelId ?? storedParcelId;
  const evalState = useEvaluation(parcelId);

  const systemReduced = useSyncExternalStore(
    subscribeReducedMotion,
    getSystemReducedMotion,
    () => false,
  );
  const reducedMotion = systemReduced || profile.reduceMotion;

  const [morphMode, setMorphMode] = useState<MorphMode>("constellation");
  const [frozen, setFrozen] = useState(false);
  const [density, setDensity] = useState<DensityLevel>("medium");
  const [selectedYear, setSelectedYear] = useState<number>(2);
  const [resetSignal, setResetSignal] = useState(0);

  const [predState, setPredState] = useState<{
    parcelId: string;
    data: PredictionsResponse | null;
    settled: boolean;
  }>({ parcelId: "", data: null, settled: false });

  useEffect(() => {
    let alive = true;
    api.predictions(parcelId).then(
      (data) => {
        if (alive) setPredState({ parcelId, data, settled: true });
      },
      () => {
        if (alive) setPredState({ parcelId, data: null, settled: true });
      },
    );
    return () => {
      alive = false;
    };
  }, [parcelId]);

  const predictions = predState.parcelId === parcelId ? predState.data : null;
  const evaluation: Evaluation | null =
    evalState.status === "ready" ? evalState.data : null;

  // Divide los 36 meses en bloques anuales de 12 meses.
  const yearBlocks = useMemo(() => {
    const timeline = evaluation?.timeline ?? [];
    if (timeline.length === 0) return [] as { year: string; items: TimelineMonth[] }[];
    const blocks: { year: string; items: TimelineMonth[] }[] = [];
    for (let i = 0; i < timeline.length; i += 12) {
      const items = timeline.slice(i, i + 12);
      const first = items[0];
      if (first) {
        blocks.push({ year: first.month.slice(0, 4), items });
      }
    }
    return blocks;
  }, [evaluation]);

  const clampedYearIndex =
    yearBlocks.length === 0 ? 0 : Math.min(selectedYear, yearBlocks.length - 1);
  const activeBlock = yearBlocks[clampedYearIndex] ?? null;

  const topAttentionMonths = useMemo(() => {
    const timeline = evaluation?.timeline ?? [];
    const weighted = timeline
      .filter(
        (m) =>
          typeof m.attention_weight?.value === "number" &&
          Number.isFinite(m.attention_weight.value),
      )
      .sort(
        (a, b) =>
          (b.attention_weight?.value ?? 0) - (a.attention_weight?.value ?? 0),
      );
    const scope =
      activeBlock && activeBlock.items.some((m) => typeof m.attention_weight?.value === "number")
        ? [...activeBlock.items]
            .filter((m) => typeof m.attention_weight?.value === "number")
            .sort(
              (a, b) =>
                (b.attention_weight?.value ?? 0) - (a.attention_weight?.value ?? 0),
            )
            .slice(0, 3)
        : weighted.slice(0, 3);
    return scope;
  }, [evaluation, activeBlock]);

  const topMonthSet = useMemo(
    () => new Set(topAttentionMonths.map((m) => m.month)),
    [topAttentionMonths],
  );

  const yearInputs = useMemo<InputMonthDatum[]>(() => {
    if (activeBlock) {
      return activeBlock.items.map((item, idx) =>
        toInputDatum(item, idx, topMonthSet, month),
      );
    }
    // Esqueleto arquitectónico si la evaluación aún está cargando o falló
    return Array.from({ length: 12 }, (_, idx) => ({
      index: idx,
      month: `M${idx + 1}`,
      label: t.common.months[idx] ?? `M${idx + 1}`,
      colorHex: "#7a6c56",
      weight: 1 / 12,
      isTopAttention: idx === 5 || idx === 6,
      ndvi: null,
    }));
  }, [activeBlock, topMonthSet, month, t.common.months]);

  const allInputs = useMemo<InputMonthDatum[]>(() => {
    const timeline = evaluation?.timeline ?? [];
    return timeline.map((item, idx) => toInputDatum(item, idx, topMonthSet, month));
  }, [evaluation, topMonthSet, month]);

  const cropReading = predictions?.crop_reading ?? null;
  const activeYearPred = useMemo(() => {
    if (!cropReading || !activeBlock) return null;
    return (
      cropReading.years.find((y) => y.year === activeBlock.year) ??
      cropReading.years[clampedYearIndex] ??
      null
    );
  }, [cropReading, activeBlock, clampedYearIndex]);

  const isTrainedLive = cropReading?.status === "trained";

  const outputs = useMemo<OutputClassDatum[]>(() => {
    return OUTPUT_KEYS.map((key) => {
      const probs = activeYearPred?.probabilities;
      const prob =
        isTrainedLive && probs && typeof probs[key] === "number" ? probs[key] : null;
      return {
        key,
        label: n.classes[key],
        probability: prob,
        isPredicted: Boolean(isTrainedLive && activeYearPred?.predicted === key),
        isTruth: Boolean(isTrainedLive && activeYearPred?.usda_cdl_group === key),
      };
    });
  }, [activeYearPred, isTrainedLive, n.classes]);

  const model3Report = evaluation?.models.model_3_crop_history_gru ?? null;
  const reportMetric =
    isTrainedLive && typeof cropReading?.metric_f1 === "number"
      ? cropReading.metric_f1
      : typeof model3Report?.metric.value === "number" &&
          model3Report.metric.type !== "fixture"
        ? model3Report.metric.value
        : null;
  const reportBaseline =
    isTrainedLive && typeof cropReading?.baseline_f1 === "number"
      ? cropReading.baseline_f1
      : typeof model3Report?.baseline_metric.value === "number" &&
          model3Report.baseline_metric.type !== "fixture"
        ? model3Report.baseline_metric.value
        : null;

  const handleMorph = () => {
    const idx = MORPH_ORDER.indexOf(morphMode);
    const next = MORPH_ORDER[(idx + 1) % MORPH_ORDER.length] ?? "layers";
    setMorphMode(next);
  };

  const handleReset = () => {
    setMorphMode("constellation");
    setFrozen(false);
    setDensity("medium");
    setSelectedYear(Math.max(0, yearBlocks.length - 1));
    setResetSignal((c) => c + 1);
  };

  const effectiveFrozen = frozen || reducedMotion;

  return (
    <section
      id="red-neuronal"
      className="nn-section"
      aria-labelledby="nn-heading"
    >
      <div className="nn-header">
        <div>
          <h2 id="nn-heading">{n.title}</h2>
          <p className="not-plain">{n.lead}</p>
          <p className="only-plain">{n.leadPlain}</p>
        </div>
        {evaluation && (
          <DataStatusBanner
            status={evaluation.data_status}
            origin={evalState.status === "ready" ? evalState.origin : undefined}
          />
        )}
      </div>

      <div className="nn-stage">
        {/* Barra superior de telemetría real */}
        <div className="nn-hud-top">
          <div className="nn-chip-group">
            <div className="nn-hud-chip">
              <span className="nn-hud-label">{n.parcelLabel}</span>
              <strong className="nn-hud-value">
                {evaluation ? pick(evaluation.parcel.name) : t.common.loading}
              </strong>
            </div>
            <div className="nn-hud-chip">
              <span className="nn-hud-label">{n.modelStatusLabel}</span>
              <strong className="nn-hud-value">
                {isTrainedLive ? n.statusTrained : n.statusArchitectural}
              </strong>
            </div>
            {reportMetric !== null && (
              <div className="nn-hud-chip">
                <span className="nn-hud-label">{n.metricF1Label}</span>
                <strong className="nn-hud-value">
                  {reportMetric}
                  {reportBaseline !== null ? ` (${n.baselineF1Label}: ${reportBaseline})` : ""}
                </strong>
              </div>
            )}
          </div>

          <div className="nn-hud-controls">
            {yearBlocks.length > 0 && (
              <div
                className="nn-pill-switch"
                role="group"
                aria-label={n.yearLabel}
              >
                {yearBlocks.map((b, idx) => (
                  <button
                    key={b.year}
                    type="button"
                    aria-pressed={clampedYearIndex === idx}
                    onClick={() => setSelectedYear(idx)}
                  >
                    {b.year}
                  </button>
                ))}
              </div>
            )}
            <div
              className="nn-pill-switch"
              role="group"
              aria-label={n.densityLabel}
            >
              {(["low", "medium", "high"] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  aria-pressed={density === level}
                  onClick={() => setDensity(level)}
                >
                  {n.densities[level]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Lienzo 3D + leyenda lateral + dock inferior MORPH / FREEZE / RESET */}
        <div className="nn-canvas-wrap">
          <NeuralNetCanvas
            morphMode={morphMode}
            frozen={effectiveFrozen}
            reducedMotion={reducedMotion}
            density={density}
            yearIndex={clampedYearIndex}
            resetSignal={resetSignal}
            yearInputs={yearInputs}
            allInputs={allInputs}
            outputs={outputs}
            canvasAlt={n.canvasAlt}
            webglFallback={n.webglFallback}
          />

          <div className="nn-overlay-meta">
            <p className="nn-mode-readout">
              <span>{n.modeLabel}:</span>{" "}
              <strong>{n.modes[morphMode]}</strong>
            </p>
            <ul className="nn-layer-legend" aria-label={n.controlsLabel}>
              <li>
                <span className="nn-dot nn-dot-input" aria-hidden="true" />
                {n.layerLabels.inputs}
              </li>
              <li>
                <span className="nn-dot nn-dot-gru" aria-hidden="true" />
                {n.layerLabels.gru}
              </li>
              <li>
                <span className="nn-dot nn-dot-attn" aria-hidden="true" />
                {n.layerLabels.attention}
              </li>
              <li>
                <span className="nn-dot nn-dot-out" aria-hidden="true" />
                {n.layerLabels.outputs}
              </li>
            </ul>
          </div>

          <div
            className="nn-dock"
            role="group"
            aria-label={n.controlsLabel}
          >
            <button
              type="button"
              className="nn-dock-btn nn-dock-morph"
              onClick={handleMorph}
              title={n.morphHint}
            >
              {n.morph} · {n.modes[morphMode]}
            </button>
            <button
              type="button"
              className="nn-dock-btn"
              aria-pressed={effectiveFrozen}
              disabled={reducedMotion}
              onClick={() => setFrozen((prev) => !prev)}
            >
              {effectiveFrozen ? n.resume : n.freeze}
            </button>
            <button
              type="button"
              className="nn-dock-btn"
              onClick={handleReset}
            >
              {n.reset}
            </button>
          </div>
        </div>

        {/* Salida numérica real del año elegido + meses que más pesaron */}
        <div className="nn-readout-grid">
          <div className="nn-readout-card">
            <h3>
              {n.predictedLabel} ({activeBlock?.year ?? "—"})
            </h3>
            {isTrainedLive && activeYearPred ? (
              <dl className="nn-kv">
                <dt>{n.predictedLabel}</dt>
                <dd>
                  {pick(activeYearPred.predicted_label)} (
                  {formatPct(activeYearPred.probability)})
                </dd>
                <dt>{n.cdlLabel}</dt>
                <dd>
                  {activeYearPred.usda_cdl_label
                    ? pick(activeYearPred.usda_cdl_label)
                    : t.common.noData}
                  {activeYearPred.agrees !== null &&
                    ` · ${activeYearPred.agrees ? n.agreesYes : n.agreesNo}`}
                </dd>
              </dl>
            ) : (
              <p className="nn-muted">{n.statusArchitectural}</p>
            )}
            <ul className="nn-class-bars">
              {outputs.map((out) => (
                <li
                  key={out.key}
                  className={out.isPredicted ? "is-predicted" : undefined}
                >
                  <span className="nn-bar-label">
                    {out.label}
                    {out.isTruth && " · CDL"}
                  </span>
                  <span className="nn-bar-val">
                    {out.probability !== null ? formatPct(out.probability) : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="nn-readout-card">
            <h3>{n.attentionTitle}</h3>
            {topAttentionMonths.length > 0 ? (
              <ul className="nn-attn-list">
                {topAttentionMonths.map((item) => (
                  <li key={item.month}>
                    <span
                      className="swatch"
                      style={{ backgroundColor: item.hls_color_hex }}
                      aria-hidden="true"
                    />
                    <strong>{month(item.month)}</strong>
                    <span>
                      {typeof item.attention_weight?.value === "number"
                        ? `${(item.attention_weight.value * 100).toFixed(1)} %`
                        : t.common.noData}
                    </span>
                    <span className="nn-attn-crop">
                      {pick(item.crop_label)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="nn-muted">{n.attentionPending}</p>
            )}
            <p className="nn-honesty">{n.honestyNote}</p>
          </div>
        </div>

        {/* Tabla accesible completa equivalente al lienzo WebGL */}
        <details className="nn-table-details">
          <summary>{n.detailsToggle}</summary>
          <div
            className="table-wrap"
            tabIndex={0}
            role="region"
            aria-label={n.detailsToggle}
          >
            <table>
              <caption>
                {n.title} — {activeBlock?.year ?? ""} (NASA/USGS HLS 30 m &amp;{" "}
                {lang === "es" ? "atención del Modelo 3" : "Model 3 attention"})
              </caption>
              <thead>
                <tr>
                  <th scope="col">{t.strip.month}</th>
                  <th scope="col">{t.strip.color}</th>
                  <th scope="col">{t.strip.crop}</th>
                  <th scope="col">{t.strip.vigor} (NDVI)</th>
                  <th scope="col">{t.engineer.weight}</th>
                </tr>
              </thead>
              <tbody>
                {yearInputs.map((item, idx) => {
                  const raw = activeBlock?.items[idx];
                  return (
                    <tr key={item.month}>
                      <th scope="row">{item.label}</th>
                      <td>
                        <span
                          className="swatch"
                          style={{ backgroundColor: item.colorHex }}
                          aria-hidden="true"
                        />
                        {item.colorHex}
                      </td>
                      <td>{raw ? pick(raw.crop_label) : "—"}</td>
                      <td>
                        {item.ndvi !== null ? item.ndvi.toFixed(2) : t.common.noData}
                      </td>
                      <td>
                        {typeof raw?.attention_weight?.value === "number"
                          ? `${(raw.attention_weight.value * 100).toFixed(1)} %`
                          : t.common.noData}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </section>
  );
}
