"use client";
import { useDeclaredConstraints, useDeclaredEvaluation, useParcelId } from "@/lib/evaluation";

/**
 * La evaluación de la parcela elegida en este dispositivo, recalculada con
 * las restricciones que declaró el agricultor (si declaró alguna).
 */
export function useToolEvaluation(selectedParcelId?: string) {
  const [storedParcelId] = useParcelId();
  const parcelId = selectedParcelId ?? storedParcelId;
  const [constraints] = useDeclaredConstraints(parcelId);
  return useDeclaredEvaluation(parcelId, constraints);
}
