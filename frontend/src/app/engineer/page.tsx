"use client";

import { SiteHeader } from "@/lib/components/SiteHeader";
import { useParcelId } from "@/lib/evaluation";
import { useI18n } from "@/lib/i18n";
import { CqrAnalysis } from "./_components/CqrAnalysis";
import { LiveNetwork } from "./_components/LiveNetwork";
import { engineerCopy } from "./_lib/copy";
import { isModelTrained, LIVE_NETWORK_MODEL } from "./_lib/types";
import type { ModelRecord } from "./_lib/types";
import { useModelsRegistry } from "./_lib/useModelsRegistry";

function localizedText(
  text: { es: string; en: string } | undefined,
  language: "es" | "en",
  pending: string,
) {
  if (!text) return pending;
  return language === "en" ? text.en : text.es;
}

function formatValue(value: number | null | undefined, pending: string): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : pending;
}

function ModelsTable({
  models,
  lang,
}: {
  models: Record<string, ModelRecord | null | undefined>;
  lang: "es" | "en";
}) {
  const copy = engineerCopy[lang];
  const rows = Object.entries(models).flatMap(([key, model]) => {
    if (!model) {
      return [{
        key,
        modelKey: key,
        status: copy.pending,
        metric: copy.metric,
        value: null,
        unit: "—",
        partition: copy.pending,
        description: copy.pending,
        limitations: copy.modelLimits[key as keyof typeof copy.modelLimits] ?? copy.pending,
      }];
    }

    const description = localizedText(model.active_mode_note, lang, copy.pending);
    const provenance = (metric: ModelRecord["metric"]) =>
      metric
        ? `${description} · ${metric.type} · ${metric.source} · ${metric.date} · ${metric.native_scale}`
        : description;
    const metricRows = [
      {
        key: `${key}-metric`,
        modelKey: key,
        status: model.status ?? "Pendiente",
        metric: localizedText(model.metric_name, lang, copy.pending),
        value: model.metric?.value,
        unit: model.metric?.unit ?? "—",
        partition: localizedText(model.partition_method, lang, copy.pending),
        description: provenance(model.metric),
        limitations: copy.modelLimits[key as keyof typeof copy.modelLimits] ?? description,
      },
      {
        key: `${key}-baseline`,
        modelKey: key,
        status: model.status ?? "Pendiente",
        metric: localizedText(model.baseline_name, lang, copy.pending),
        value: model.baseline_metric?.value,
        unit: model.baseline_metric?.unit ?? "—",
        partition: localizedText(model.partition_method, lang, copy.pending),
        description: provenance(model.baseline_metric),
        limitations: copy.modelLimits[key as keyof typeof copy.modelLimits] ?? description,
      },
    ];
    return metricRows;
  });

  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label={copy.metricsTitle}>
      <table>
        <caption>{copy.metricsCaption}</caption>
        <thead>
          <tr>
            <th scope="col">{copy.model}</th>
            <th scope="col">{copy.status}</th>
            <th scope="col">{copy.metric}</th>
            <th scope="col">{copy.value}</th>
            <th scope="col">{copy.unit}</th>
            <th scope="col">{copy.partition}</th>
            <th scope="col">{copy.description}</th>
            <th scope="col">{copy.limits}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const model = models[row.modelKey];
            const pending = row.value === null || row.value === undefined;
            return (
              <tr key={row.key}>
                <th scope="row">{model?.algorithm ?? row.modelKey}</th>
                <td>{row.status}</td>
                <td>{row.metric}</td>
                <td>{pending ? copy.pending : formatValue(row.value, copy.pending)}</td>
                <td>{row.unit}</td>
                <td>{row.partition}</td>
                <td>{row.description}</td>
                <td>{row.limitations}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function EngineerPage() {
  const { t, lang } = useI18n();
  const copy = engineerCopy[lang];
  const [parcelId] = useParcelId();
  const state = useModelsRegistry(parcelId);

  return (
    <div className="judges">
      <title>{`${t.engineer.title} · Field Shift`}</title>
      <SiteHeader />
      <main id="contenido" tabIndex={-1} className="page">
        <h1>{t.engineer.title}</h1>
        <p>{t.engineer.lead}</p>
        {state.status === "loading" && (
          <p role="status" aria-live="polite">
            {copy.loading}
          </p>
        )}
        {state.status === "error" && (
          <p role="alert">
            {copy.error}: {state.error.message}
          </p>
        )}
        {state.status === "ok" && (
          <>
            {(state.mockMode || state.data.dataStatus === "fixture") && (
              <p className="fixture-banner" role="status" data-testid="fixture-banner">
                <strong>Datos de ejemplo</strong>
                <span>
                  {lang === "es"
                    ? "El registro de demostración no contiene métricas ni observaciones reales."
                    : "The demo registry contains no real metrics or observations."}
                </span>
              </p>
            )}
            <section aria-labelledby="metrics-title">
              <h2 id="metrics-title">{copy.metricsTitle}</h2>
              {Object.keys(state.data.models).length === 0 ? (
                <p>{copy.noModels}</p>
              ) : (
                <ModelsTable models={state.data.models} lang={lang} />
              )}
            </section>
            <CqrAnalysis data={state.data.cqr} lang={lang} />
            {isModelTrained(state.data.models, LIVE_NETWORK_MODEL) && <LiveNetwork lang={lang} />}
          </>
        )}
      </main>
    </div>
  );
}
