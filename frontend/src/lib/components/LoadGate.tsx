"use client";
// Envoltura común: estado de carga, error y la etiqueta "Datos de ejemplo".
import type { ReactNode } from "react";
import type { Evaluation } from "../contract";
import type { LoadState, Origin } from "../evaluation";
import { useI18n } from "../i18n";
import { DataStatusBanner } from "./DataStatusBanner";

export function EvaluationGate({
  state,
  children,
}: {
  state: LoadState<Evaluation>;
  children: (evaluation: Evaluation, origin: Origin) => ReactNode;
}) {
  const { t, pick } = useI18n();
  if (state.status === "loading") {
    return (
      <p role="status" aria-live="polite">
        {t.common.loading}
      </p>
    );
  }
  if (state.status === "error") {
    return (
      <p role="alert">
        {t.common.loadError} {pick(state.error.localized)}
      </p>
    );
  }
  return (
    <>
      <DataStatusBanner status={state.data.data_status} origin={state.origin} />
      {children(state.data, state.origin)}
    </>
  );
}
