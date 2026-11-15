"use client";
// AGENTS.md regla 4: cada cifra lleva su ficha (fuente, fecha, escala y tipo).
import type { MetricValue } from "../contract";
import { convert } from "../a11y/units";
import { useI18n } from "../i18n";

export function MetricCard({ label, metric }: { label: string; metric: MetricValue }) {
  const { t, value, amount, units } = useI18n();
  const converted = convert(0, metric.unit, units).convertedFrom !== null;
  return (
    <div>
      <p>
        <strong>{label}:</strong> {value(metric)}
        {metric.interval &&
          ` (${amount(metric.interval.lower, metric.unit)} – ${amount(metric.interval.upper, metric.unit)})`}
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
        {converted && (
          <>
            <dt>{t.a11y.units.label}</dt>
            <dd>{t.a11y.units.convertedFrom(metric.unit)}</dd>
          </>
        )}
      </dl>
    </div>
  );
}
