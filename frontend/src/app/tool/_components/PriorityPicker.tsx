"use client";
// "¿Qué te importa más?": dos grupos de opciones nativas (radio), grandes y
// usables con teclado, lector de pantalla y control por voz (la etiqueta
// visible es el nombre accesible).
import { useI18n } from "@/lib/i18n";
import { PRIORITY_KEYS, type Priorities, type PriorityKey } from "./priorities";

export function PriorityPicker({
  priorities,
  onChange,
}: {
  priorities: Priorities;
  onChange: (next: Priorities) => void;
}) {
  const { t } = useI18n();
  const r = t.tool.rotations;

  const option = (
    group: "first" | "second",
    key: PriorityKey | null,
    checked: boolean,
    onSelect: () => void,
  ) => {
    const id = `priority-${group}-${key ?? "none"}`;
    return (
      <li key={id}>
        <input
          type="radio"
          className="pick-input"
          id={id}
          name={`priority-${group}`}
          checked={checked}
          onChange={onSelect}
        />
        <label htmlFor={id} className="pick">
          <span className="pick-name">{key ? r.priorityNames[key] : r.noPriority}</span>
          {key && <span className="pick-help">{r.priorityHelp[key]}</span>}
        </label>
      </li>
    );
  };

  return (
    <section aria-labelledby="priorities-title" className="priorities" data-guide-id="rotations.priorities">
      <h2 id="priorities-title">{r.prioritiesTitle}</h2>
      <p>{r.prioritiesLead}</p>
      <fieldset>
        <legend>{r.firstPriority}</legend>
        <ul className="pick-list">
          {PRIORITY_KEYS.map((key) =>
            option("first", key, priorities.first === key, () =>
              onChange({ first: key, second: priorities.second }),
            ),
          )}
        </ul>
      </fieldset>
      {priorities.first && (
        <fieldset>
          <legend>{r.secondPriority}</legend>
          <ul className="pick-list">
            {PRIORITY_KEYS.filter((key) => key !== priorities.first).map((key) =>
              option("second", key, priorities.second === key, () =>
                onChange({ first: priorities.first, second: key }),
              ),
            )}
            {option("second", null, priorities.second === null, () =>
              onChange({ first: priorities.first, second: null }),
            )}
          </ul>
        </fieldset>
      )}
    </section>
  );
}
