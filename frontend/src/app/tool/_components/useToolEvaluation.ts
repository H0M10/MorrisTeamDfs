"use client";
import { useEvaluation, useParcelId } from "@/lib/evaluation";

/** La evaluación de la parcela elegida en este dispositivo. */
export function useToolEvaluation(selectedParcelId?: string) {
  const [storedParcelId] = useParcelId();
  return useEvaluation(selectedParcelId ?? storedParcelId);
}