"use client";
import { useState } from "react";
import type { Evaluation } from "@/lib/contract";
import { useI18n } from "@/lib/i18n";

type ConstraintsData = Evaluation["constraints"];

const readable = (code: string) => code.replaceAll("_", " ");

const MACHINERY_OPTIONS = ["tractor", "seeder", "sprinkler_system", "drip_irrigation", "harvester"];
const CROP_OPTIONS = ["alfalfa", "forage_barley", "corn", "wheat", "beans"];

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

  const [maxWater, setMaxWater] = useState<number>(initialConstraints.max_water_mm_year.value ?? 0);
  const [machinery, setMachinery] = useState<string[]>(initialConstraints.available_machinery ?? []);
  const [noBuyer, setNoBuyer] = useState<string[]>(initialConstraints.crops_without_buyer ?? []);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  const toggleItem = (list: string[], item: string, setter: (val: string[]) => void) => {
    setSavedNotice(false);
    if (list.includes(item)) {
      setter(list.filter((i) => i !== item));
    } else {
      setter([...list, item]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: ConstraintsData = {
      ...initialConstraints,
      max_water_mm_year: {
        ...initialConstraints.max_water_mm_year,
        value: Number(maxWater) || 0,
      },
      available_machinery: machinery,
      crops_without_buyer: noBuyer,
    };
    onSave(updated);
    setSavedNotice(true);
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-labelledby="constraints-editor-heading"
      style={{
        marginTop: "2rem",
        padding: "1.25rem",
        border: "2px solid #000000",
        borderRadius: "4px",
        backgroundColor: "#FFFFFF",
      }}
    >
      <h2 id="constraints-editor-heading" style={{ marginTop: 0 }}>
        Ajustar restricciones de la parcela
      </h2>

      {/* Límite de agua anual */}
      <div style={{ marginBottom: "1.25rem" }}>
        <label htmlFor="max-water-input" style={{ display: "block", fontWeight: "bold", marginBottom: "0.5rem" }}>
          {t.tool.constraints.water} (mm/año)
        </label>
        <input
          id="max-water-input"
          type="number"
          min={0}
          max={5000}
          step={10}
          value={maxWater}
          onChange={(e) => {
            setSavedNotice(false);
            setMaxWater(Number(e.target.value));
          }}
          style={{
            minHeight: "44px",
            padding: "0.5rem 0.75rem",
            fontSize: "1rem",
            border: "2px solid #000000",
            borderRadius: "4px",
            width: "100%",
            maxWidth: "240px",
          }}
        />
      </div>

      {/* Maquinaria disponible */}
      <fieldset style={{ border: "1px solid #000000", padding: "1rem", marginBottom: "1.25rem" }}>
        <legend style={{ fontWeight: "bold", padding: "0 0.5rem" }}>{t.tool.constraints.machinery}</legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          {MACHINERY_OPTIONS.map((item) => {
            const checked = machinery.includes(item);
            return (
              <label
                key={item}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  minHeight: "44px",
                  padding: "0.25rem 0.75rem",
                  border: checked ? "2px solid #1247B8" : "1px solid #000000",
                  backgroundColor: checked ? "#e6f0fa" : "#FFFFFF",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleItem(machinery, item, setMachinery)}
                  style={{ width: "20px", height: "20px" }}
                />
                <span style={{ textTransform: "capitalize" }}>{readable(item)}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Cultivos sin comprador */}
      <fieldset style={{ border: "1px solid #000000", padding: "1rem", marginBottom: "1.25rem" }}>
        <legend style={{ fontWeight: "bold", padding: "0 0.5rem" }}>{t.tool.constraints.noBuyer}</legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          {CROP_OPTIONS.map((crop) => {
            const checked = noBuyer.includes(crop);
            return (
              <label
                key={crop}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  minHeight: "44px",
                  padding: "0.25rem 0.75rem",
                  border: checked ? "2px solid #1247B8" : "1px solid #000000",
                  backgroundColor: checked ? "#e6f0fa" : "#FFFFFF",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleItem(noBuyer, crop, setNoBuyer)}
                  style={{ width: "20px", height: "20px" }}
                />
                <span style={{ textTransform: "capitalize" }}>{readable(crop)}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Ventana de siembra */}
      <div style={{ marginBottom: "1.25rem" }}>
        <p style={{ margin: 0 }}>
          <strong>{t.tool.constraints.window}:</strong> {pick(initialConstraints.planting_window.label)}
        </p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          minHeight: "44px",
          padding: "0.65rem 1.5rem",
          backgroundColor: "#1247B8",
          color: "#FFFFFF",
          fontWeight: "bold",
          fontSize: "1rem",
          border: "2px solid #000000",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        {isSubmitting ? "Simulando..." : "Aplicar restricciones"}
      </button>

      {savedNotice && (
        <p role="status" aria-live="polite" style={{ marginTop: "0.75rem", fontWeight: "bold", color: "#2F7D32" }}>
          Restricciones actualizadas para la evaluación.
        </p>
      )}
    </form>
  );
}