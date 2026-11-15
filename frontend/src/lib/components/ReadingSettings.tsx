"use client";
// Diálogo "Ajustes de lectura" (PLAN_DOMINGO §6.8). <dialog> nativo con
// showModal(): atrapa el foco, se cierra con Escape y deja el resto inerte,
// como pide el patrón de diálogo modal de la WAI-ARIA APG.
// Cada cambio se aplica al momento; "Listo" solo cierra.
// Se monta solo mientras está abierto (canSpeak() no existe en el servidor).
import { useEffect, useId, useRef, type RefObject } from "react";
import { useA11y, type A11yProfile, type TextSize } from "../a11y/profile";
import { useI18n } from "../i18n";
import { canSpeak } from "../speech";

export function ReadingSettingsDialog({
  open,
  onClose,
  returnFocus,
}: {
  open: boolean;
  onClose: () => void;
  /** Adónde vuelve el foco al cerrar (el botón del encabezado). */
  returnFocus: RefObject<HTMLElement | null>;
}) {
  const { t, units, setUnits } = useI18n();
  const { profile, update, reset } = useA11y();
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const a = t.a11y;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const toggles = [
    { key: "sun", label: a.sun.label, hint: a.sun.hint },
    { key: "plain", label: a.plain.label, hint: a.plain.hint },
    {
      key: "readAloud",
      label: a.readAloud.label,
      hint: canSpeak() ? a.readAloud.hint : `${a.readAloud.hint} ${a.readAloud.unsupported}`,
    },
    { key: "reduceMotion", label: a.reduceMotion.label, hint: a.reduceMotion.hint },
  ] as const;

  return (
    <dialog
      ref={ref}
      className="a11y-dialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-intro`}
      onClose={() => {
        onClose();
        returnFocus.current?.focus();
      }}
    >
      <h2 id={`${id}-title`}>{a.dialog.title}</h2>
      <p id={`${id}-intro`}>{a.dialog.intro}</p>

      <fieldset>
        <legend>{a.textSize.legend}</legend>
        {a.textSize.options.map((label, i) => (
          <label key={label} className="a11y-option">
            <input
              type="radio"
              name={`${id}-size`}
              checked={profile.textSize === i}
              onChange={() => update({ textSize: i as TextSize })}
            />
            <span>
              {label} ({[18, 22, 26][i]} px)
            </span>
          </label>
        ))}
      </fieldset>

      <ul className="a11y-toggles">
        {toggles.map(({ key, label, hint }) => (
          <li key={key}>
            <label className="a11y-option">
              <input
                type="checkbox"
                checked={profile[key]}
                aria-describedby={`${id}-${key}`}
                onChange={(event) =>
                  update({ [key]: event.target.checked } as Partial<A11yProfile>)
                }
              />
              <span>{label}</span>
            </label>
            <p id={`${id}-${key}`} className="a11y-hint">
              {hint}
            </p>
          </li>
        ))}
      </ul>

      <fieldset aria-describedby={`${id}-units`}>
        <legend>{a.units.label}</legend>
        {(["us", "metric"] as const).map((system) => (
          <label key={system} className="a11y-option">
            <input
              type="radio"
              name={`${id}-units`}
              checked={units === system}
              onChange={() => setUnits(system)}
            />
            <span>{system === "us" ? a.units.usLong : a.units.metricLong}</span>
          </label>
        ))}
        <p id={`${id}-units`} className="a11y-hint">
          {a.units.hint}
        </p>
      </fieldset>

      <div className="a11y-actions">
        <button type="button" onClick={reset}>
          {a.dialog.reset}
        </button>
        <button type="button" className="primary" onClick={() => ref.current?.close()}>
          {a.dialog.done}
        </button>
      </div>
    </dialog>
  );
}
