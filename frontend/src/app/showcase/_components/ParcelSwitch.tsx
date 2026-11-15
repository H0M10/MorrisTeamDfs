"use client";
// Cambia la parcela evaluada con los pilotos que publica la API (los ids reales
// en DATA_MODE=real; la copia local del fixture si la API no responde).
// El estado vive en la página (useParcelId) y se pasa por props.
import { usePilots } from "@/lib/evaluation";
import { useI18n } from "@/lib/i18n";

export function ParcelSwitch({
  label,
  parcelId,
  onChange,
}: {
  label: string;
  parcelId: string;
  onChange: (id: string) => void;
}) {
  const { pick } = useI18n();
  const pilots = usePilots();
  if (pilots.status !== "ready" || pilots.data.pilots.length < 2) return null;
  return (
    <div role="group" aria-label={label} data-testid="parcel-switch">
      {pilots.data.pilots.map((pilot) => (
        <button
          key={pilot.id}
          type="button"
          aria-pressed={pilot.id === parcelId}
          onClick={() => onChange(pilot.id)}
        >
          {pick(pilot.name)} ({pilot.region_mode})
        </button>
      ))}
    </div>
  );
}
