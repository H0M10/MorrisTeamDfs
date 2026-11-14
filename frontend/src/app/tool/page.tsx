"use client";
import { DataStatusBanner } from "@/lib/components/DataStatusBanner";
import { useParcelId, usePilots } from "@/lib/evaluation";
import { useI18n } from "@/lib/i18n";
import { Pending } from "./_components/Pending";

export default function ParcelPage() {
  const { t, pick, value } = useI18n();
  const pilots = usePilots();
  const [parcelId, setParcelId] = useParcelId();

  return (
    <>
      <title>{`${t.tool.steps.parcel.name} · Field Shift`}</title>
      <h1>{t.tool.steps.parcel.title}</h1>
      {pilots.status === "loading" && <p role="status">{t.common.loading}</p>}
      {pilots.status === "error" && <p role="alert">{t.common.loadError}</p>}
      {pilots.status === "ready" && (
        <>
          <DataStatusBanner status={pilots.data.data_status} origin={pilots.origin} />
          <fieldset>
            <legend>{t.tool.parcel.legend}</legend>
            <ul className="choice-list">
              {pilots.data.pilots.map((pilot) => (
                <li key={pilot.id}>
                  <label className="choice">
                    <input
                      type="radio"
                      name="parcel"
                      value={pilot.id}
                      checked={pilot.id === parcelId}
                      onChange={() => setParcelId(pilot.id)}
                    />
                    <span>
                      <strong>{pick(pilot.name)}</strong>
                      <br />
                      {t.tool.parcel.area}: {value(pilot.area_ha)}.{" "}
                      {pilot.region_mode === "labeled" ? t.tool.parcel.labeled : t.tool.parcel.unlabeled}.
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          <p>{t.tool.parcel.saved}</p>
        </>
      )}
      <Pending>{t.tool.parcel.mapPending}</Pending>
    </>
  );
}
