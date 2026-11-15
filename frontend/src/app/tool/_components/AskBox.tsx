"use client";
// Preguntas en lenguaje llano, por texto o por voz. La API responde con reglas
// y solo con campos del contrato (/api/v1/ask); si no sabe, lo dice.
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, api } from "@/lib/api";
import type { AskResponse, ConstraintsInput } from "@/lib/contract";
import { useI18n } from "@/lib/i18n";
import { canListen, canSpeak, listenOnce, speak, stopSpeaking } from "@/lib/speech";

export function AskBox({
  parcelId,
  constraints,
}: {
  parcelId: string;
  constraints: ConstraintsInput | null;
}) {
  const { t, lang, pick } = useI18n();
  const a = t.tool.ask;
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voice, setVoice] = useState({ speak: false, listen: false });
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // El soporte de voz solo se conoce en el navegador.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVoice({ speak: canSpeak(), listen: canListen() });
    return () => stopSpeaking();
  }, []);

  const ask = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      setAnswer(await api.ask(parcelId, trimmed, lang, constraints ?? undefined));
    } catch (caught) {
      setAnswer(null);
      setError(caught instanceof ApiError ? pick(caught.localized) : a.error);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void ask(question);
  };

  const dictate = async () => {
    if (listening) {
      stopRef.current?.();
      return;
    }
    setError(null);
    setListening(true);
    const { result, stop } = listenOnce(lang);
    stopRef.current = stop;
    try {
      const heard = await result;
      setQuestion(heard);
      await ask(heard);
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "";
      setError(code === "not-allowed" ? a.micDenied : a.micNothing);
    } finally {
      setListening(false);
      stopRef.current = null;
    }
  };

  return (
    <section aria-labelledby="ask-heading" className="no-print" data-guide-id="evidence.ask">
      <h2 id="ask-heading">{a.title}</h2>
      <p>{a.intro}</p>
      <form onSubmit={onSubmit}>
        <label htmlFor="ask-input" className="field-label">
          {a.label}
        </label>
        <p className="inline-fields">
          <input
            id="ask-input"
            className="field field-wide"
            type="text"
            maxLength={500}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={a.placeholder}
          />
          <button type="submit" className="primary" disabled={busy}>
            {busy ? t.common.loading : a.submit}
          </button>
          {voice.listen && (
            <button type="button" onClick={dictate} aria-pressed={listening}>
              {listening ? a.stopListening : a.dictate}
            </button>
          )}
        </p>
      </form>
      <p>{a.examplesLabel}</p>
      <ul className="chip-list">
        {a.examples.map((example) => (
          <li key={example}>
            <button
              type="button"
              onClick={() => {
                setQuestion(example);
                void ask(example);
              }}
            >
              {example}
            </button>
          </li>
        ))}
      </ul>
      <div role="status" aria-live="polite">
        {error && <p>{error}</p>}
        {answer && (
          <div className="answer">
            <h3>{answer.answered ? a.answer : a.notAnswered}</h3>
            {answer.answer.split("\n").map((line) => (
              <p key={line}>{line}</p>
            ))}
            {answer.sources.length > 0 && (
              <p className="small">
                {a.sources}: {answer.sources.map((source) => source.metric?.source ?? source.path).join(" · ")}
              </p>
            )}
          </div>
        )}
      </div>
      {answer && voice.speak && (
        <p>
          <button type="button" onClick={() => speak(answer.answer, lang)}>
            {a.listen}
          </button>
        </p>
      )}
    </section>
  );
}
