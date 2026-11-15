"use client";
// Interruptor "Unidades: EE. UU. / métricas" (P1-5). Solo cambia cómo se
// muestran las cifras; el contrato sigue en mm y ha (lib/a11y/units.ts).
import { useI18n } from "../i18n";

export function UnitsSwitch() {
  const { t, units, setUnits } = useI18n();
  const u = t.a11y.units;
  return (
    <div role="group" aria-label={u.label} className="units-switch">
      <button type="button" aria-pressed={units === "us"} onClick={() => setUnits("us")}>
        {u.us}
      </button>
      <button type="button" aria-pressed={units === "metric"} onClick={() => setUnits("metric")}>
        {u.metric}
      </button>
    </div>
  );
}
