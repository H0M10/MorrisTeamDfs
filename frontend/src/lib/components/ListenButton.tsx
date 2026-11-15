"use client";
// "Escuchar esta pantalla" (PLAN_DOMINGO §6.8). Aparece con el ajuste "Leer en
// voz alta" y solo si el navegador puede hablar. Lee el texto visible de
// <main id="contenido">; todo lo que se oye ya está escrito en la página.
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useA11y } from "../a11y/profile";
import { useI18n } from "../i18n";
import { canSpeak, speakLong, stopSpeaking } from "../speech";

export function ListenButton() {
  const { t, lang } = useI18n();
  const { profile } = useA11y();
  const pathname = usePathname();
  const [speaking, setSpeaking] = useState(false);

  // Al cambiar de pantalla o de idioma, se calla.
  useEffect(() => {
    stopSpeaking();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSpeaking(false);
  }, [pathname, lang]);

  useEffect(() => () => stopSpeaking(), []);

  if (!profile.readAloud || !canSpeak()) return null;

  const toggle = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    const main = document.getElementById("contenido");
    if (!main) return;
    setSpeaking(true);
    speakLong(main.innerText, lang, () => setSpeaking(false));
  };

  return (
    <button type="button" onClick={toggle}>
      {speaking ? t.a11y.stopListening : t.a11y.listen}
    </button>
  );
}
