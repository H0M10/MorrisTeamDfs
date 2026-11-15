"use client";
// Para quien no ve o no lee: "Escuchar" lee la pregunta y las opciones;
// "Responder hablando" elige la opción que la persona dice. Todo lo que se
// oye está escrito en la pantalla, y lo que se dice se muestra (sordera).
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { canListen, canSpeak, listenOnce, speak, stopSpeaking } from "@/lib/speech";

export interface VoiceOption {
  label: string;
  /** Palabras que, si aparecen en lo dicho, eligen esta opción. */
  words: string[];
  onSelect: () => void;
}

const normalize = (text: string) =>
  text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ");

export function VoiceBar({ question, options }: { question: string; options: VoiceOption[] }) {
  const { t, lang } = useI18n();
  const v = t.simple.voice;
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState<string | null>(null);
  const [ready, setReady] = useState({ speak: false, listen: false });

  useEffect(() => {
    // Soporte del navegador: solo se sabe en el cliente.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady({ speak: canSpeak(), listen: canListen() });
    return () => stopSpeaking();
  }, []);

  const read = () =>
    speak(`${question} ${v.options} ${options.map((o, i) => `${i + 1}: ${o.label}.`).join(" ")}`, lang);

  const answer = () => {
    stopSpeaking();
    setListening(true);
    setHeard(null);
    listenOnce(lang).result.then(
      (text) => {
        setListening(false);
        setHeard(text);
        const said = ` ${normalize(text)} `;
        const numbers = ["uno", "dos", "tres", "one", "two", "three"];
        const byNumber = numbers.findIndex((n) => said.includes(` ${n} `)) % 3;
        const match =
          options.find((o) => o.words.some((w) => said.includes(` ${normalize(w).trim()} `))) ??
          (byNumber >= 0 ? options[byNumber] : undefined);
        if (match) {
          speak(v.chosen(match.label), lang);
          match.onSelect();
        } else {
          speak(v.notUnderstood, lang);
        }
      },
      () => {
        setListening(false);
        setHeard(v.micError);
      },
    );
  };

  if (!ready.speak && !ready.listen) return null;
  return (
    <div className="voice-bar">
      {ready.speak && (
        <button type="button" onClick={read}>
          <span aria-hidden="true">🔊 </span>
          {v.listen}
        </button>
      )}
      {ready.listen && (
        <button type="button" onClick={answer} aria-pressed={listening}>
          <span aria-hidden="true">🎤 </span>
          {listening ? v.listening : v.answer}
        </button>
      )}
      {heard && (
        <p className="voice-heard" role="status">
          {v.youSaid} «{heard}»
        </p>
      )}
    </div>
  );
}
