"use client";
// AGENTS.md regla 4: cada cifra lleva su ficha (fuente, fecha, escala y tipo).
import type { MetricValue } from "../contract";
import { useI18n } from "../i18n";

export function MetricCard({ label, metric }: { label: string; metric: MetricValue }) {
  const { t, value } = useI18n();
  return (
    <div>
      <p>
        <strong>{label}:</strong> {value(metric)}
        {metric.interval && ` (${metric.interval.lower} – ${metric.interval.upper})`}
      </p>
      <dl className="facts">
        <dt>{t.common.kind}</dt>
        <dd>{t.common.kinds[metric.type]}</dd>
        <dt>{t.common.source}</dt>
        <dd>{metric.source}</dd>
        <dt>{t.common.date}</dt>
        <dd>{metric.date}</dd>
        <dt>{t.common.scale}</dt>
        <dd>{metric.native_scale}</dd>
      </dl>
    </div>
  );
}
