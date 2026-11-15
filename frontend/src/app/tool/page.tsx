// // "use client";
// // import { DataStatusBanner } from "@/lib/components/DataStatusBanner";
// // import { useParcelId, usePilots } from "@/lib/evaluation";
// // import { useI18n } from "@/lib/i18n";
// // // import { Pending } from "./_components/Pending";
// // import dynamic from "next/dynamic";
// // import { EvaluationGate } from "@/lib/components/LoadGate";
// // import { useToolEvaluation } from "./_components/useToolEvaluation";
// // const ParcelMap = dynamic(() => import("./_components/ParcelMap").then((mod) => mod.ParcelMap), {
// //   ssr: false,
// //   loading: () => <p role="status">Cargando mapa...</p>
// // });

// // export default function ParcelPage() {
// //   const { t, pick, value } = useI18n();
// //   const pilots = usePilots();
// //   const [parcelId, setParcelId] = useParcelId();
// //   const evaluationState = useToolEvaluation();

// //   return (
// //     <>
// //       <title>{`${t.tool.steps.parcel.name} · Field Shift`}</title>
// //       <h1>{t.tool.steps.parcel.title}</h1>
// //       {pilots.status === "loading" && <p role="status">{t.common.loading}</p>}
// //       {pilots.status === "error" && <p role="alert">{t.common.loadError}</p>}
// //       {pilots.status === "ready" && (
// //         <>
// //           <DataStatusBanner status={pilots.data.data_status} origin={pilots.origin} />
// //           <fieldset>
// //             <legend>{t.tool.parcel.legend}</legend>
// //             <ul className="choice-list">
// //               {pilots.data.pilots.map((pilot) => (
// //                 <li key={pilot.id}>
// //                   <label className="choice">
// //                     <input
// //                       type="radio"
// //                       name="parcel"
// //                       value={pilot.id}
// //                       checked={pilot.id === parcelId}
// //                       onChange={() => setParcelId(pilot.id)}
// //                     />
// //                     <span>
// //                       <strong>{pick(pilot.name)}</strong>
// //                       <br />
// //                       {t.tool.parcel.area}: {value(pilot.area_ha)}.{" "}
// //                       {pilot.region_mode === "labeled" ? t.tool.parcel.labeled : t.tool.parcel.unlabeled}.
// //                     </span>
// //                   </label>
// //                 </li>
// //               ))}
// //             </ul>
// //           </fieldset>
// //           <p>{t.tool.parcel.saved}</p>
// //         </>
// //       )}
// //       <EvaluationGate state={evaluationState}>
// //         {({ parcel }) => (
// //           <>
// //             <ParcelMap parcel={parcel} />
// //           </>
// //         )}
// //       </EvaluationGate>
// //       {/* <Pending>{t.tool.parcel.mapPending}</Pending> */}
// //     </>
// //   );
// // }
// "use client";
// import { DataStatusBanner } from "@/lib/components/DataStatusBanner";
// import { useParcelId, usePilots } from "@/lib/evaluation";
// import { useI18n } from "@/lib/i18n";
// import dynamic from "next/dynamic";
// import { EvaluationGate } from "@/lib/components/LoadGate";
// import { useToolEvaluation } from "./_components/useToolEvaluation";

// const ParcelMap = dynamic(() => import("./_components/ParcelMap").then((mod) => mod.ParcelMap), {
//   ssr: false,
//   loading: () => <p role="status">Cargando mapa...</p>
// });

// export default function ParcelPage() {
//   const { t, pick, value } = useI18n();
//   const pilots = usePilots();
//   const [parcelId, setParcelId] = useParcelId();
//   const evaluationState = useToolEvaluation();

//   return (
//     <>
//       <title>{`${t.tool.steps.parcel.name} · Field Shift`}</title>
//       <h1>{t.tool.steps.parcel.title}</h1>
//       {pilots.status === "loading" && <p role="status">{t.common.loading}</p>}
//       {pilots.status === "error" && <p role="alert">{t.common.loadError}</p>}
//       {pilots.status === "ready" && (
//         <>
//           <DataStatusBanner status={pilots.data.data_status} origin={pilots.origin} />
//           <fieldset>
//             <legend>{t.tool.parcel.legend}</legend>
//             <ul className="choice-list">
//               {pilots.data.pilots.map((pilot) => (
//                 <li key={pilot.id}>
//                   <label className="choice">
//                     <input
//                       type="radio"
//                       name="parcel"
//                       value={pilot.id}
//                       checked={pilot.id === parcelId}
//                       onChange={() => setParcelId(pilot.id)}
//                     />
//                     <span>
//                       <strong>{pick(pilot.name)}</strong>
//                       <br />
//                       {t.tool.parcel.area}: {value(pilot.area_ha)}.{" "}
//                       {pilot.region_mode === "labeled" ? t.tool.parcel.labeled : t.tool.parcel.unlabeled}.
//                     </span>
//                   </label>
//                 </li>
//               ))}
//             </ul>
//           </fieldset>
//           <p>{t.tool.parcel.saved}</p>
//         </>
//       )}
//       <EvaluationGate state={evaluationState}>
//         {({ parcel }) => (
//           <>
//             <ParcelMap parcel={parcel} />
//           </>
//         )}
//       </EvaluationGate>
//     </>
//   );
// }


"use client";
import { useParcelId, usePilots } from "@/lib/evaluation";
import { useI18n } from "@/lib/i18n";
import dynamic from "next/dynamic";
import { EvaluationGate } from "@/lib/components/LoadGate";
import { useToolEvaluation } from "./_components/useToolEvaluation";

const ParcelMap = dynamic(() => import("./_components/ParcelMap").then((mod) => mod.ParcelMap), {
  ssr: false,
  loading: () => <p role="status">Cargando mapa...</p>,
});

export default function ParcelPage() {
  const { t, pick, value } = useI18n();
  const pilots = usePilots();
  const [parcelId, setParcelId] = useParcelId();
  const evaluationState = useToolEvaluation();

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 bg-white text-black">
      <title>{`${t.tool.steps.parcel.name} · Field Shift`}</title>
      <h1 className="text-3xl font-bold mb-4">{t.tool.steps.parcel.title}</h1>

      {pilots.status === "loading" && <p role="status">{t.common.loading}</p>}
      {pilots.status === "error" && <p role="alert">{t.common.loadError}</p>}
      
      {pilots.status === "ready" && (
        <fieldset className="border-2 border-black p-4 rounded mb-6">
          <legend className="font-bold px-2">{t.tool.parcel.legend}</legend>
          <ul className="space-y-3 mt-2">
            {pilots.data.pilots.map((pilot) => {
              const isSelected = pilot.id === parcelId;
              return (
                <li key={pilot.id}>
                  <label className={`flex items-start gap-3 p-3 rounded border cursor-pointer ${isSelected ? 'border-[#1247B8] bg-blue-50' : 'border-gray-300'}`}>
                    <input
                      type="radio"
                      name="parcel"
                      value={pilot.id}
                      checked={isSelected}
                      onChange={() => setParcelId(pilot.id)}
                      className="mt-1 w-5 h-5 accent-[#1247B8]"
                    />
                    <span>
                      <strong className="block text-lg">{pick(pilot.name)}</strong>
                      <span className="text-sm text-gray-700">
                        {t.tool.parcel.area}: {value(pilot.area_ha)}.{" "}
                        {pilot.region_mode === "labeled" ? t.tool.parcel.labeled : t.tool.parcel.unlabeled}.
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      {/* EvaluationGate ya maneja internamente el DataStatusBanner con el origin correcto */}
      {/* EvaluationGate ya maneja internamente el DataStatusBanner con el origin correcto */}
      <EvaluationGate state={evaluationState}>
        {(evaluation) => (
          <ParcelMap key={evaluation.parcel.id} parcel={evaluation.parcel} />
        )}
      </EvaluationGate>
    </main>
  );
}
// ```[cite: 1, 2, 5]