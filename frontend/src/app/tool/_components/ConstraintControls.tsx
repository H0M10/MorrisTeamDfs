"use client";
// Editor de restricciones. Usa los mismos códigos que el motor
// (backend/app/engine/crop_traits.py y el banco de cultivos de /api/v1/crops):
// un código que el motor no conoce descartaría todas las rotaciones.
import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import type { CropSummary, Evaluation } from "@/lib/contract";
import { useI18n } from "@/lib/i18n";

type ConstraintsData = Evaluation["constraints"];

/** Equipo que reconoce el motor. Cada requisito se cumple con cualquiera de su grupo. */
export const MACHINERY_CODES = [
  "pivote_central",
  "riego_aspersion",
  "riego_compuerta",
  "riego_goteo",
  "sembradora_grano",
  "sembradora_convencional",
  "sembradora_directa",
  "empacadora",
] as const;

const readable = (code: string) => code.replaceAll("_", " ");

export function ConstraintsEditor({
  initialConstraints,
  onSave,
  isSubmitting,
}: {
  initialConstraints: ConstraintsData;
  onSave: (updated: ConstraintsData) => void;
  isSubmitting?: boolean;
}) {
  const { t, pick } = useI18n();
  const c = t.tool.constraints;

  const [maxWater, setMaxWater] = useState<number>(initialConstraints.max_water_mm_year.value ?? 0);
  const [machinery, setMachinery] = useState<string[]>(initialConstraints.available_machinery ?? []);
  const [noBuyer, setNoBuyer] = useState<string[]>(initialConstraints.crops_without_buyer ?? []);
  const [start, setStart] = useState(initialConstraints.planting_window.start_month);
  const [end, setEnd] = useState(initialConstraints.planting_window.end_month);
  const [crops, setCrops] = useState<CropSummary[] | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    let alive = true;
    api.crops().then(
      (response) => alive && setCrops(response.crops.filter((crop) => crop.sold)),
      () => alive && setCrops([]),
    );
    return () => {
      alive = false;
    };
  }, []);

  // Sin conexión: se ofrecen al menos los cultivos que ya trae la evaluación.
  const cropOptions: { code: string; label: string }[] =
    crops && crops.length > 0
      ? crops.map((crop) => ({ code: crop.crop_code, label: pick(crop.name) }))
      : Array.from(new Set(initialConstraints.crops_without_buyer)).map((code) => ({
          code,
          label: readable(code),
        }));

  const toggle = (list: string[], item: string, setter: (value: string[]) => void) => {
    setSavedNotice(false);
    setter(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSave({
      ...initialConstraints,
      max_water_mm_year: { ...initialConstraints.max_water_mm_year, value: Number(maxWater) || 0 },
      available_machinery: machinery,
      crops_without_buyer: noBuyer,
      planting_window: { ...initialConstraints.planting_window, start_month: start, end_month: end },
    });
    setSavedNotice(true);
  };

  return (
    <form className="editor" onSubmit={handleSubmit} aria-labelledby="constraints-editor-heading">
      <h2 id="constraints-editor-heading">{c.editTitle}</h2>
      <p>{c.editIntro}</p>

      <p>
        <label htmlFor="max-water-input" className="field-label">
          {c.water} ({c.mmPerYear})
        </label>
        <input
          id="max-water-input"
          className="field"
          type="number"
          inputMode="numeric"
          min={0}
          max={5000}
          step={10}
          value={maxWater}
          onChange={(event) => {
            setSavedNotice(false);
            setMaxWater(Number(event.target.value));
          }}
        />
      </p>

      <fieldset>
        <legend>{c.machinery}</legend>
        <ul className="check-list">
          {MACHINERY_CODES.map((code) => (
            <li key={code}>
              <label className="choice">
                <input
                  type="checkbox"
                  checked={machinery.includes(code)}
                  onChange={() => toggle(machinery, code, setMachinery)}
                />
                <span>{c.machineryNames[code]}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset>
        <legend>{c.noBuyer}</legend>
        <p>{c.noBuyerHelp}</p>
        {crops === null ? (
          <p role="status">{t.common.loading}</p>
        ) : (
          <ul className="check-list">
            {cropOptions.map((crop) => (
              <li key={crop.code}>
                <label className="choice">
                  <input
                    type="checkbox"
                    checked={noBuyer.includes(crop.code)}
                    onChange={() => toggle(noBuyer, crop.code, setNoBuyer)}
                  />
                  <span>{crop.label}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      <fieldset>
        <legend>{c.window}</legend>
        <p className="inline-fields">
          <label>
            {c.from}{" "}
            <select
              className="field"
              value={start}
              onChange={(event) => {
                setSavedNotice(false);
                setStart(Number(event.target.value));
              }}
            >
              {t.common.monthsLong.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
          </label>{" "}
          <label>
            {c.to}{" "}
            <select
              className="field"
              value={end}
              onChange={(event) => {
                setSavedNotice(false);
                setEnd(Number(event.target.value));
              }}
            >
              {t.common.monthsLong.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </p>
      </fieldset>

      <button type="submit" className="primary" disabled={isSubmitting}>
        {isSubmitting ? c.applying : c.apply}
      </button>

      <p role="status" aria-live="polite">
        {savedNotice ? c.applied : ""}
      </p>
    </form>
  );
}
