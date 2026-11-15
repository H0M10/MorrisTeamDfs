"use client";
// Voz con la Web Speech API. El soporte cambia según el navegador, así que
// todo lo que se dice o se escucha tiene siempre su equivalente en texto.
import type { Lang } from "./contract";

const VOICE_LANG: Record<Lang, string> = { es: "es-MX", en: "en-US" };

interface RecognitionResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;
export const canListen = () => recognitionCtor() !== null;

/** Lee un texto en voz alta. Corta lo que se estuviera leyendo. */
export function speak(text: string, lang: Lang, onEnd?: () => void): void {
  if (!canSpeak()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = VOICE_LANG[lang];
  utterance.rate = 0.95;
  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (canSpeak()) window.speechSynthesis.cancel();
}

/**
 * Escucha una frase y la devuelve como texto. Rechaza con el código de error
 * del navegador ("not-allowed", "no-speech", …) para que la interfaz lo explique.
 */
export function listenOnce(lang: Lang): { result: Promise<string>; stop: () => void } {
  const Ctor = recognitionCtor();
  if (!Ctor) return { result: Promise.reject(new Error("unsupported")), stop: () => {} };
  const recognition = new Ctor();
  recognition.lang = VOICE_LANG[lang];
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  const result = new Promise<string>((resolve, reject) => {
    let heard = "";
    recognition.onresult = (event) => {
      heard = event.results[0]?.[0]?.transcript ?? "";
    };
    recognition.onerror = (event) => reject(new Error(event.error));
    recognition.onend = () => (heard ? resolve(heard) : reject(new Error("no-speech")));
  });
  recognition.start();
  return { result, stop: () => recognition.stop() };
}

/**
 * Lee un texto largo (una pantalla entera) en trozos cortos: algunos
 * navegadores cortan una sola frase muy larga a los pocos segundos.
 * `onEnd` se llama al terminar el último trozo o si se detiene.
 */
export function speakLong(text: string, lang: Lang, onEnd?: () => void): void {
  if (!canSpeak()) return;
  window.speechSynthesis.cancel();
  const chunks = text
    .split(/\n+|(?<=[.!?…:;])\s+/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter((part) => part.length > 0);
  if (chunks.length === 0) {
    onEnd?.();
    return;
  }
  chunks.forEach((chunk, i) => {
    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.lang = VOICE_LANG[lang];
    utterance.rate = 0.95;
    if (i === chunks.length - 1 && onEnd) {
      utterance.onend = onEnd;
      utterance.onerror = onEnd;
    }
    window.speechSynthesis.speak(utterance);
  });
}
