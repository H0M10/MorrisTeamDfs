"use client";
import { useEffect, useRef } from "react";
import { useA11y } from "@/lib/a11y/profile";
import { useI18n } from "@/lib/i18n";
export function ReferenceNetwork() {
  const frame = useRef<HTMLIFrameElement>(null);
  const { profile } = useA11y();
  const { lang } = useI18n();
  function sync() {
    frame.current?.contentWindow?.postMessage(
      {
        type: "fieldshift:motion",
        paused:
          profile.reduceMotion ||
          window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      },
      location.origin,
    );
  }
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const send = () =>
      frame.current?.contentWindow?.postMessage(
        {
          type: "fieldshift:motion",
          paused: profile.reduceMotion || media.matches,
        },
        location.origin,
      );
    send();
    media.addEventListener("change", send);
    return () => media.removeEventListener("change", send);
  }, [profile.reduceMotion]);
  return (
    <div className="mission-reference">
      <iframe
        ref={frame}
        onLoad={sync}
        src="/visuals/neural-reference.html?reduced=1"
        title={
          lang === "en"
            ? "Interactive network from the supplied reference: illustrative geometry"
            : "Red interactiva del archivo de referencia: geometría ilustrativa"
        }
        loading="lazy"
        sandbox="allow-scripts allow-same-origin"
      />
      <p>
        {lang === "en"
          ? "Exploratory network visualization. Reference: CodeTap. Morph, freeze, rotate and send pulses. These nodes and connections are illustrative; the measured model outputs are below."
          : "Visualización exploratoria de una red. Referencia: CodeTap. Cambia la formación, pausa, gira y envía pulsos. Los nodos y conexiones son ilustrativos; las salidas medidas del modelo aparecen abajo."}
      </p>
    </div>
  );
}
