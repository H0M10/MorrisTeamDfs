"use client";
// "¿Cómo prefieres usar Field Shift?" en la primera visita (P1-1).
// Es un aviso, no un diálogo modal: no roba el foco ni tapa la página, el
// enlace para saltar al contenido sigue siendo lo primero, y se puede saltar.
import { useId } from "react";
import { useA11y } from "../a11y/profile";
import { useI18n } from "../i18n";

export function FirstVisitPrompt({
  onChoose,
  onSkip,
}: {
  onChoose: () => void;
  onSkip: () => void;
}) {
  const { t } = useI18n();
  const { profile, loaded, update } = useA11y();
  const id = useId();
  if (!loaded || profile.seen) return null;
  const f = t.a11y.firstVisit;
  return (
    <section className="first-visit" aria-labelledby={`${id}-title`}>
      <div className="first-visit-inner">
        <h2 id={`${id}-title`}>{f.title}</h2>
        <p>{f.text}</p>
        <p>{f.later}</p>
        <div className="a11y-actions">
          <button
            type="button"
            className="primary"
            onClick={() => {
              update({ seen: true });
              onChoose();
            }}
          >
            {f.choose}
          </button>
          <button
            type="button"
            onClick={() => {
              update({ seen: true });
              onSkip();
            }}
          >
            {f.skip}
          </button>
        </div>
      </div>
    </section>
  );
}
