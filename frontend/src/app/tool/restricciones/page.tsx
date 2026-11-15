"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { useParcelId } from "@/lib/evaluation";
import { EvaluationGate } from "@/lib/components/LoadGate";
import { MetricCard } from "@/lib/components/MetricCard";
import type { Evaluation, ConstraintsInput } from "@/lib/contract";
import { useI18n } from "@/lib/i18n";
import { ConstraintsEditor } from "../_components/ConstraintControls";
import { useToolEvaluation } from "../_components/useToolEvaluation";

const readable = (code: string) => code.replaceAll("_", " ");

export default function ConstraintsPage() {
  const { t, pick } = useI18n();
  const state = useToolEvaluation();
  const [parcelId] = useParcelId();
  
  const [overrideData, setOverrideData] = useState<Evaluation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AQUÍ ES DONDE SE CONECTA LA API
  const handleSaveConstraints = async (updatedConstraints: Evaluation["constraints"]) => {
    if (!parcelId) return;
    setIsSubmitting(true);
    try {
      // 1. Convertimos asegurando que el valor numérico no sea null (?? 0)
      const input: ConstraintsInput = {
        max_water_mm_year: updatedConstraints.max_water_mm_year.value ?? 0,
        available_machinery: updatedConstraints.available_machinery,
        crops_without_buyer: updatedConstraints.crops_without_buyer,
        planting_window: updatedConstraints.planting_window,
      };

      // 2. Llamada al motor de simulación con el ID de la parcela y los inputs
      const recalculated = await api.simulate(parcelId, input);
      
      // 3. Guardamos el resultado recalculado para refrescar la vista
      setOverrideData(recalculated);
    } catch (error) {
      console.error("Error al recalcular la simulación:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reutilizamos el estado original o inyectamos la data de la simulación manteniendo el tipado del hook
  const effectiveState = overrideData && state.status === "ready"
    ? { ...state, data: overrideData }
    : state;

  return (
    <>
      <title>{`${t.tool.steps.constraints.name} · Field Shift`}</title>
      <h1>{t.tool.steps.constraints.title}</h1>
      <p>{t.tool.constraints.intro}</p>
      
      <EvaluationGate state={effectiveState}>
        {(evaluation) => {
          const activeConstraints = evaluation.constraints;
          return (
            <>
              <MetricCard label={t.tool.constraints.water} metric={activeConstraints.max_water_mm_year} />
              <dl className="facts">
                <dt>{t.tool.constraints.machinery}</dt>
                <dd>{activeConstraints.available_machinery.map(readable).join(", ") || t.tool.constraints.none}</dd>
                <dt>{t.tool.constraints.noBuyer}</dt>
                <dd>{activeConstraints.crops_without_buyer.map(readable).join(", ") || t.tool.constraints.none}</dd>
                <dt>{t.tool.constraints.window}</dt>
                <dd>{pick(activeConstraints.planting_window.label)}</dd>
              </dl>

              {/* Componente del formulario donde se dispara onSave */}
              <ConstraintsEditor
                initialConstraints={activeConstraints}
                onSave={handleSaveConstraints}
                isSubmitting={isSubmitting}
              />
            </>
          );
        }}
      </EvaluationGate>
    </>
  );
}


// "use client";
// import Link from "next/link";
// import { useI18n } from "@/lib/i18n";
// import { useToolEvaluation } from "../_components/useToolEvaluation";
// import { ConstraintsEditor } from "../_components/ConstraintControls";
// import { EvaluationGate } from "@/lib/components/LoadGate";

// export default function RestriccionesPage() {
//   const { t } = useI18n();
//   const evaluationState = useToolEvaluation();

//   return (
//     <main className="max-w-4xl mx-auto px-4 py-8 bg-white text-black text-lg">
//       <Link href="/tool" className="text-[#1247B8] font-bold underline min-h-[44px] inline-block mb-6">
//         ← Volver a la herramienta principal
//       </Link>

//       <h1 className="text-3xl font-bold mb-2">Restricciones de la Parcela</h1>
//       <p className="text-gray-700 mb-6">
//         Modifica los límites de agua anuales, la maquinaria disponible y las restricciones de mercado para recalcular las opciones de cultivo viables.
//       </p>

//       <EvaluationGate state={evaluationState}>
//         {(evaluation, origin) => (
//           <ConstraintsEditor
//             initialConstraints={evaluation.constraints}
//             onSave={(updatedConstraints) => {
//               // Aquí disparas la actualización de restricciones hacia tu hook de evaluación
//             }}
//           />
//         )}
//       </EvaluationGate>
//     </main>
//   );
// }