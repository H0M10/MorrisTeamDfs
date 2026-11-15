"use client";
// Lo que leen los modelos de la parcela, año por año, al lado del registro oficial.
// No cambia ninguna cifra de la evaluación: se muestra para que se vea qué predicen
// y cuándo aciertan o fallan.
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { PredictionsResponse } from "@/lib/contract";
import { useI18n } from "@/lib/i18n";

const pct = (value: number | null | undefined) =>
  value === null || value === undefined ? null : `${Math.round(value * 100)} %`;

export function ModelReadings({
  parcelId,
  labeled,
}: {
  parcelId: string;
  labeled: boolean;
}) {
  const { t, pick } = useI18n();
  const r = t.tool.readings;
  const [data, setData] = useState<PredictionsResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    api.predictions(parcelId).then(
      (response) => {
        if (!alive) return;
        setData(response);
        setFailed(false);
      },
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, [parcelId]);

  if (failed) return null; // sin servidor o en modo de ejemplo: la pantalla sigue sin esta parte
  if (!data) {
    return (
      <p role="status" className="no-print">
        {r.loading}
      </p>
    );
  }
  const reading = data.crop_reading;
  const world = data.dynamic_world;
  const byYear = new Map(world.years.map((y) => [y.year, y]));
  if (reading.years.length === 0 && world.years.length === 0) return null;

  return (
    <section aria-labelledby="readings-heading" data-guide-id="portrait.models">
      <h2 id="readings-heading">{r.title}</h2>
      <p>{r.intro}</p>
      {!labeled && <p className="note-pending">{r.experimental}</p>}
      <div className="table-wrap">
        <table>
          <caption>{r.caption}</caption>
          <thead>
            <tr>
              <th scope="col">{r.year}</th>
              <th scope="col">{r.model3}</th>
              {labeled && <th scope="col">{r.official}</th>}
              <th scope="col">{r.world}</th>
            </tr>
          </thead>
          <tbody>
            {reading.years.map((year) => {
              const dw = byYear.get(year.year);
              return (
                <tr key={year.year}>
                  <th scope="row">{year.year}</th>
                  <td>
                    {pick(year.predicted_label)} ({pct(year.probability)})
                  </td>
                  {labeled && (
                    <td>
                      {year.usda_cdl_label
                        ? pick(year.usda_cdl_label)
                        : t.common.noData}
                      {year.agrees !== null && (
                        <>
                          {" "}
                          <span
                            className={
                              year.agrees ? "status-viable" : "status-out"
                            }
                          >
                            {year.agrees ? r.agrees : r.disagrees}
                          </span>
                        </>
                      )}
                    </td>
                  )}
                  <td>
                    {dw && dw.crop_probability !== null
                      ? r.worldValue(
                          pct(dw.crop_probability) ?? "",
                          dw.top_label ? pick(dw.top_label) : "",
                        )
                      : t.common.noData}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="small">
        {r.model3Metric(
          reading.metric_f1 === null ? "—" : reading.metric_f1.toFixed(2),
          reading.baseline_f1 === null ? "—" : reading.baseline_f1.toFixed(2),
        )}
      </p>
      <p className="small">{world.available ? r.worldNote : r.worldOff}</p>
    </section>
  );
}
