"use client";
// AGENTS.md regla 2: mientras data_status sea "fixture", toda interfaz muestra
// una etiqueta visible "Datos de ejemplo". También sale en la hoja impresa.
// Úsalo en cualquier página que pinte una evaluación.
import type { DataStatus } from "../contract";
import type { Origin } from "../evaluation";
import { useI18n } from "../i18n";

export function DataStatusBanner({ status, origin }: { status: DataStatus; origin?: Origin }) {
  const { t } = useI18n();
  if (status !== "fixture") return null;
  return (
    <aside className="fixture-banner" role="note" aria-label={t.common.fixtureTitle} data-testid="fixture-banner">
      <strong>{t.common.fixtureTitle}</strong>
      <span>{t.common.fixtureDetail}</span>
      {origin === "local" && <span>{t.common.localCopy}</span>}
    </aside>
  );
}
