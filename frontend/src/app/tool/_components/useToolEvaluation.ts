"use client";
import { useEvaluation, useParcelId } from "@/lib/evaluation";

/** La evaluación de la parcela elegida en este dispositivo. */
export function useToolEvaluation() {
  const [parcelId] = useParcelId();
  return useEvaluation(parcelId);
}
