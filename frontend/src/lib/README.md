# /frontend/src/lib

Dueño: Hanniel (Motor y API).
Entrega: cliente tipado de la API, tipos TypeScript generados desde
`/contracts/schema.json` y respaldo local con los fixtures.

| Archivo | Qué da |
| --- | --- |
| `contract/types.ts` | **Generado** (`npm run gen:types`). No se edita a mano |
| `contract/index.ts` | `Evaluation`, `Strategy`, `MetricValue`… y los tipos de las rutas |
| `contract/schema.json`, `contract/fixtures/` | Copia de `/contracts` (la mantiene `python contracts/sync.py`) |
| `api.ts` | `api.pilots()`, `evaluate()`, `simulate()`, `ask()`, `share()`, `shared()` y `ApiError` |
| `fixtures.ts` | Copia local de los fixtures, cargada solo si se pide |
| `evaluation.ts` | `useEvaluation(parcelId)`, `usePilots()`, `useParcelId()`: API primero, copia local si falla |
| `storage.ts` | Última parcela e idioma en el dispositivo |
| `supabase.ts` | `getSupabase()` con carga diferida; `null` si no está configurado |
| `i18n/es.ts`, `i18n/en.ts` | Textos. `useI18n()` da `t`, `pick()`, `month()`, `value()` |
| `components/DataStatusBanner.tsx` | La etiqueta "Datos de ejemplo" |
| `components/LoadGate.tsx` | `<EvaluationGate>`: carga, error y etiqueta en un solo lugar |
| `components/MetricCard.tsx` | Una cifra con su ficha: tipo, fuente, fecha y escala |

Uso mínimo en una página:

```tsx
"use client";
import { EvaluationGate } from "@/lib/components/LoadGate";
import { useEvaluation, useParcelId } from "@/lib/evaluation";

export default function Page() {
  const [parcelId] = useParcelId();
  const state = useEvaluation(parcelId);
  return <EvaluationGate state={state}>{(evaluation) => <p>{evaluation.parcel.id}</p>}</EvaluationGate>;
}
```

Para recalcular con restricciones: `api.simulate(parcelId, constraints)`.
`/simulate` solo vuelve a evaluar la viabilidad; no cambia las demás cifras.
