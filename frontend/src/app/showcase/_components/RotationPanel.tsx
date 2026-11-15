"use client";
// Las tres rotaciones del contrato (actual, menos agua, más suelo) para el mes
// elegido. Cada cifra muestra su ficha: tipo, fuente, fecha y escala nativa
// (AGENTS.md §1.4). Se cambia con botones, con la tecla R o con la mano abierta.
import type { Evaluation, MetricValue } from "@/lib/contract";
import { useI18n } from "@/lib/i18n";

const METRIC_KEYS = ["annual_water_mm", "soil_cover_months_36m"] as const;

function MetricLine({ label, metric }: { label: string; metric: MetricValue | undefined }) {
  const { value } = useI18n();
  if (!metric) return null;
  return (
    <li>
      <strong>{label}:</strong> {value(metric)}{" "}
      <small>
        ({metric.type} · {metric.source} · {metric.date} · {metric.native_scale})
      </small>
    </li>
  );
}

export function RotationPanel({
  evaluation,
  monthIndex,
  rotationIndex,
  onRotationChange,
}: {
  evaluation: Evaluation;
  monthIndex: number;
  rotationIndex: number;
  onRotationChange: (index: number) => void;
}) {
  const { t, pick, month } = useI18n();
  const strategies = evaluation.strategies;
  const selected = strategies[rotationIndex] ?? strategies[0];
  if (!selected) return null;
  const step = selected.sequence_36m[monthIndex] ?? selected.sequence_36m[0];
  const metricLabels: Record<(typeof METRIC_KEYS)[number], string> = {
    annual_water_mm: t.showcase.rotationWater,
    soil_cover_months_36m: t.showcase.rotationCover,
  };

  return (
    <section aria-labelledby="rotations-title" data-testid="rotation-panel">
      <h2 id="rotations-title">{t.showcase.rotationsTitle}</h2>
      <p>{t.showcase.rotationsNote}</p>
      {!evaluation.has_viable_options && <p role="note">{t.showcase.noViable}</p>}
      <div role="group" aria-label={t.showcase.rotationsTitle} aria-keyshortcuts="R">
        {strategies.map((strategy, index) => (
          <button
            key={strategy.id}
            type="button"
            aria-pressed={index === rotationIndex}
            onClick={() => onRotationChange(index)}
          >
            {pick(strategy.title)}
          </button>
        ))}
      </div>
      <div aria-live="polite" data-testid="active-rotation">
        <h3>{pick(selected.title)}</h3>
        <p>
          {step ? month(step.month) : "—"} ·{" "}
          <strong>{t.showcase.rotationCrop}:</strong> {step ? pick(step.crop_label) : "—"}
        </p>
        <p>
          <strong>{t.showcase.rotationViable}:</strong>{" "}
          {selected.viable ? t.showcase.yes : t.showcase.no}
          {!selected.viable && selected.rejection_reason
            ? ` — ${pick(selected.rejection_reason)}`
            : ""}
        </p>
        <ul>
          {METRIC_KEYS.map((key) => (
            <MetricLine key={key} label={metricLabels[key]} metric={selected.metrics[key]} />
          ))}
        </ul>
      </div>
    </section>
  );
}
