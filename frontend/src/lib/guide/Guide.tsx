"use client";
// La Guía es un tutor, no un chat (PLAN_DOMINGO.md §3). Explica sola cada
// pantalla, parte por parte: resalta, narra y avanza cuando termina de hablar.
// La persona la interrumpe con un toque: "Hablar" (voz) o "Escribir" (texto);
// también se pausa sola si la persona toca la página.
//
// Capa 1 (sin red ni IA): narración de los elementos con data-guide-id,
// órdenes de voz fijas y glosario. Capa 2: POST /api/v1/guide, que con llave
// de IA redacta a partir de esta pantalla y descarta cualquier cifra que no
// venga de los datos o de lo que dijo la persona.
//
// Accesibilidad (WCAG 2.2): el avance automático se puede pausar (2.2.2); en
// modo automático no se mueve el foco, solo se resalta y se anuncia por
// aria-live; paso a paso con los botones sí se mueve el foco. Todo lo hablado
// queda escrito. El personaje no se anima si se pidió menos movimiento.
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { api, type GuideResponse, type GuideStep } from "../api";
import { useA11y } from "../a11y/profile";
import type { ConstraintsInput } from "../contract";
import { useDeclaredConstraints, useEvaluation, useParcelId } from "../evaluation";
import { useI18n } from "../i18n";
import { canListen, canSpeak, listenOnce, speak, stopSpeaking } from "../speech";
import { useGuideMode } from "./mode";

type StepKey = "parcel" | "portrait" | "constraints" | "rotations" | "evidence" | "share";
const STEPS: { screen: GuideStep; path: string; key: StepKey }[] = [
  { screen: "parcela", path: "/tool", key: "parcel" },
  { screen: "retrato", path: "/tool/retrato", key: "portrait" },
  { screen: "restricciones", path: "/tool/restricciones", key: "constraints" },
  { screen: "rotaciones", path: "/tool/rotaciones", key: "rotations" },
  { screen: "evidencia", path: "/tool/evidencia", key: "evidence" },
  { screen: "compartir", path: "/tool/compartir", key: "share" },
];

/** Rutas donde aparece la Guía: lo que usa el agricultor. */
export function guideRoute(pathname: string): boolean {
  return pathname === "/" || pathname.startsWith("/tool") || pathname === "/accesibilidad";
}

function screenOf(pathname: string): GuideStep | null {
  if (pathname.startsWith("/tool/revision")) return "revision";
  return STEPS.find((step) => step.path === pathname)?.screen ?? null;
}

/** Paso que sigue a esta pantalla (la portada lleva al primero). */
function nextStepOf(pathname: string) {
  if (pathname === "/") return STEPS[0];
  const i = STEPS.findIndex((step) => step.path === pathname);
  return i >= 0 ? STEPS[i + 1] : undefined;
}

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[¿?¡!.,]/g, "")
    .trim();

type Command = "next" | "back" | "start" | "pause" | "read" | "repeat" | "stop" | "off";
const COMMANDS: [Command, RegExp][] = [
  ["next", /^(siguiente|adelante|next)$/],
  ["back", /^(atras|anterior|regresa|back|previous|go back)$/],
  ["start", /^(continua|continuar|sigue|sigue explicando|explicame|ensename|empieza|continue|go on|explain|start)( .*)?$/],
  ["pause", /^(pausa|espera|pause|wait)$/],
  ["read", /^(leeme|lee|leer|read|read this|read it)( esto| esta pantalla| the screen| this screen)?$/],
  ["repeat", /^(repite|otra vez|repeat|again|say it again)$/],
  ["stop", /^(para|alto|calla|callate|silencio|stop|quiet|be quiet)$/],
  ["off", /(apaga|apagar|quita).*(guia)|turn off( the)? guide/],
];

function commandOf(text: string): Command | null {
  const n = normalize(text);
  return COMMANDS.find(([, re]) => re.test(n))?.[0] ?? null;
}

/** Vibración corta de confirmación. Solo Android; el iPhone no la permite en la web. */
function buzz(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // sin vibración: el mensaje escrito y hablado ya avisa
  }
}

function sessionId(): string {
  try {
    const key = "fieldshift:guide-session";
    const found = window.sessionStorage.getItem(key);
    if (found) return found;
    const id = crypto.randomUUID();
    window.sessionStorage.setItem(key, id);
    return id;
  } catch {
    return "anonymous";
  }
}

// Preferencias del tutor en este dispositivo.
const AUTO_KEY = "fieldshift:guide-auto"; // ya pidió la explicación: sigue en cada pantalla
const VOICE_KEY = "fieldshift:guide-voice"; // narrar en voz alta
function readFlag(key: string, storage: "local" | "session"): boolean | null {
  try {
    const value = (storage === "local" ? window.localStorage : window.sessionStorage).getItem(key);
    return value === null ? null : value === "1";
  } catch {
    return null;
  }
}
function writeFlag(key: string, storage: "local" | "session", on: boolean) {
  try {
    (storage === "local" ? window.localStorage : window.sessionStorage).setItem(key, on ? "1" : "0");
  } catch {
    // sin almacenamiento: vale solo en esta visita
  }
}

function guideElements(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>("[data-guide-id]")].filter(
    (el) => !el.closest(".guide") && (el.offsetParent !== null || el.getClientRects().length > 0),
  );
}

/** Tiempo de lectura cuando no se narra en voz alta. */
const readMs = (text: string) =>
  Math.min(15000, Math.max(4000, text.split(/\s+/).length * 330 + 1500));

/** El personaje: decorativo (aria-hidden); mueve la boca mientras habla. */
function TutorFace({ speaking }: { speaking: boolean }) {
  return (
    <svg
      className={speaking ? "tutor-face is-speaking" : "tutor-face"}
      viewBox="0 0 64 64"
      width="56"
      height="56"
      aria-hidden="true"
      focusable="false"
    >
      <line x1="32" y1="10" x2="32" y2="3" stroke="#000" strokeWidth="2.5" />
      <circle cx="32" cy="4" r="3.5" fill="#E9B824" stroke="#000" strokeWidth="1.5" />
      <circle cx="32" cy="36" r="25" fill="#1247B8" stroke="#000" strokeWidth="2" />
      <path d="M44 14 q10 -2 12 8 q-10 2 -12 -8z" fill="#2F7D32" stroke="#000" strokeWidth="1.2" />
      <g className="tutor-eyes">
        <circle cx="23" cy="32" r="4.5" fill="#fff" />
        <circle cx="41" cy="32" r="4.5" fill="#fff" />
        <circle cx="24" cy="33" r="2" fill="#000" />
        <circle cx="42" cy="33" r="2" fill="#000" />
      </g>
      <rect className="tutor-mouth" x="24" y="44" width="16" height="4" rx="2" fill="#fff" />
    </svg>
  );
}

export function Guide({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { t, lang } = useI18n();
  const g = t.guide;
  const pathname = usePathname().replace(/\/$/, "") || "/";
  const router = useRouter();
  const { profile, update: updateProfile } = useA11y();
  const [mode, setMode, modeLoaded, firstVisit] = useGuideMode();
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const screen = screenOf(pathname);
  const intro =
    pathname === "/" ? g.screens.home : screen ? g.screens[screen] : g.screens.other;
  const nextStep = nextStepOf(pathname);

  const [message, setMessage] = useState<string>("");
  const [heard, setHeard] = useState<string | null>(null);
  const [terms, setTerms] = useState<string[]>([]);
  const [goTo, setGoTo] = useState<GuideStep | null>(null);
  const [pending, setPending] = useState<GuideResponse["set_constraint"]>(null);
  const [fromAi, setFromAi] = useState(false);
  const [tour, setTour] = useState<{ index: number; total: number } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [atEnd, setAtEnd] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [writing, setWriting] = useState(false);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const [pos, setPos] = useState<ReturnType<typeof placeBubble> | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLButtonElement>(null);

  const stopListenRef = useRef<() => void>(() => {});
  const spotRef = useRef<HTMLElement | null>(null);
  const runId = useRef(0); // invalida avances pendientes al pausar o cambiar de pantalla
  const timer = useRef<number | null>(null);
  const welcomed = useRef(false);
  const playRef = useRef<(index: number, auto: boolean, retries?: number) => void>(() => {});

  useEffect(() => {
    // Preferencia de voz guardada; si no hay, la del perfil o encendida.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVoiceOn(readFlag(VOICE_KEY, "local") ?? true);
  }, []);

  const clearSpot = useCallback(() => {
    spotRef.current?.classList.remove("guide-spot");
    spotRef.current = null;
  }, []);

  const cancelAdvance = useCallback(() => {
    runId.current += 1;
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  }, []);

  /** Muestra (y narra) un texto; `then` corre al terminar si nada lo canceló. */
  const narrate = useCallback(
    (text: string, then?: () => void, forceVoice = false) => {
      setMessage(text);
      const id = runId.current;
      const done = () => {
        setSpeaking(false);
        if (id === runId.current) then?.();
      };
      setSpeaking(true);
      if ((voiceOn || forceVoice) && canSpeak()) {
        speak(text, lang, done);
      } else {
        timer.current = window.setTimeout(done, then ? readMs(text) : 1800);
      }
    },
    [lang, voiceOn],
  );

  const spotlight = useCallback(
    (el: HTMLElement, moveFocus: boolean) => {
      clearSpot();
      el.classList.add("guide-spot");
      spotRef.current = el;
      const reduce =
        profile.reduceMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
      if (moveFocus) {
        if (el.tabIndex < 0 && !el.matches("a, button, input, select, textarea, summary")) {
          el.setAttribute("tabindex", "-1");
        }
        el.focus({ preventScroll: true });
      }
    },
    [clearSpot, profile.reduceMotion],
  );

  const itemText = useCallback(
    (id: string) => g.items[id] ?? g.items[`${id.split(".")[0]}.*`] ?? "",
    [g.items],
  );

  const tourElements = useCallback(
    () => guideElements().filter((el) => itemText(el.dataset.guideId ?? "")),
    [itemText],
  );

  const endOfScreen = useCallback(() => {
    setTour(null);
    setPlaying(false);
    setAtEnd(true);
    clearSpot();
    narrate(nextStep ? g.endScreen(t.tool.steps[nextStep.key].name) : g.endAll);
  }, [clearSpot, g, narrate, nextStep, t.tool.steps]);

  /** Explica el elemento `index`; en automático, al terminar pasa al siguiente. */
  const play = useCallback(
    (index: number, auto: boolean, retries = 3) => {
      cancelAdvance();
      const elements = tourElements();
      if (elements.length === 0) {
        // Los datos pueden seguir cargando: se reintenta antes de rendirse.
        if (auto && retries > 0) {
          const id = runId.current;
          timer.current = window.setTimeout(() => {
            if (id === runId.current) playRef.current(index, auto, retries - 1);
          }, 1500);
          return;
        }
        setPlaying(false);
        narrate(g.nothingHere);
        return;
      }
      if (index >= elements.length) {
        endOfScreen();
        return;
      }
      const i = Math.max(0, index);
      const el = elements[i]!;
      setAtEnd(false);
      setTour({ index: i, total: elements.length });
      spotlight(el, !auto);
      narrate(itemText(el.dataset.guideId ?? ""), auto ? () => playRef.current(i + 1, true) : undefined);
    },
    [cancelAdvance, endOfScreen, g.nothingHere, itemText, narrate, spotlight, tourElements],
  );
  useEffect(() => {
    playRef.current = play;
  }, [play]);

  const start = useCallback(() => {
    cancelAdvance();
    if (!profile.seen) updateProfile({ seen: true });
    writeFlag(AUTO_KEY, "session", true);
    setBubbleOpen(true);
    setPlaying(true);
    setAtEnd(false);
    setWriting(false);
    if (tour) {
      play(tour.index, true);
    } else {
      narrate(intro, () => play(0, true));
    }
  }, [cancelAdvance, intro, narrate, play, profile.seen, tour, updateProfile]);

  const pause = useCallback(() => {
    cancelAdvance();
    stopSpeaking();
    setSpeaking(false);
    setPlaying(false);
  }, [cancelAdvance]);

  // Al cambiar de pantalla: presentación, y si ya pidió la explicación, sigue sola.
  useEffect(() => {
    if (!modeLoaded) return;
    cancelAdvance();
    clearSpot();
    stopSpeaking();
    const welcome = firstVisit && !welcomed.current;
    if (welcome) {
      welcomed.current = true;
      try {
        window.localStorage.setItem("fieldshift:guide", "open");
      } catch {
        // sin almacenamiento: saludará otra vez en la próxima visita
      }
    }
    // Estado inicial derivado de la ruta (no hay otra fuente externa).
    setMessage(welcome ? `${g.welcome} ${intro}` : intro);
    setTerms([]);
    setGoTo(null);
    setPending(null);
    setTour(null);
    setHeard(null);
    setFromAi(false);
    setAtEnd(false);
    setSpeaking(false);
    const auto = !welcome && mode !== "off" && readFlag(AUTO_KEY, "session") === true;
    setPlaying(auto);
    setBubbleOpen(auto); // nunca se abre sola: estorbaba en las pruebas con personas
    if (auto) {
      const id = runId.current;
      timer.current = window.setTimeout(() => {
        if (id === runId.current) narrate(intro, () => playRef.current(0, true));
      }, 700);
    }
    return () => cancelAdvance();
    // Solo al cambiar de pantalla o de idioma, o al terminar de leer el dispositivo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, lang, modeLoaded, firstVisit]);

  // Si la persona toca o teclea en la página mientras el tutor explica, se pausa.
  useEffect(() => {
    if (!playing) return;
    const onUser = (event: Event) => {
      const target = event.target as Element | null;
      if (target?.closest(".guide")) return;
      pause();
    };
    window.addEventListener("pointerdown", onUser, true);
    window.addEventListener("keydown", onUser, true);
    return () => {
      window.removeEventListener("pointerdown", onUser, true);
      window.removeEventListener("keydown", onUser, true);
    };
  }, [pause, playing]);

  // Encendida desde el botón "Guía" del encabezado: se presenta abierta.
  const wasOff = useRef(false);
  useEffect(() => {
    if (mode !== "off" && wasOff.current) {
      setBubbleOpen(true);
    }
    wasOff.current = mode === "off";
  }, [mode]);

  // Mientras explica, el globo (con el personaje) viaja junto al elemento.
  useEffect(() => {
    if (!tour) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = spotRef.current;
        const bubble = bubbleRef.current;
        if (el && bubble) setPos(placeBubble(el, bubble));
      });
    };
    update();
    const settle = window.setTimeout(update, 600);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [tour]);

  useEffect(() => {
    document.body.classList.toggle("guide-touring", tour !== null);
    return () => document.body.classList.remove("guide-touring");
  }, [tour]);

  useEffect(
    () => () => {
      cancelAdvance();
      clearSpot();
      stopSpeaking();
    },
    [cancelAdvance, clearSpot],
  );

  const goStep = useCallback(
    (delta: number) => {
      const i = STEPS.findIndex((step) => step.path === pathname);
      const next = i < 0 ? (delta > 0 ? STEPS[0] : undefined) : STEPS[i + delta];
      if (next) router.push(next.path);
    },
    [pathname, router],
  );

  const runCommand = useCallback(
    (command: Command) => {
      switch (command) {
        case "next":
          if (tour) play(tour.index + 1, false);
          else goStep(1);
          return;
        case "back":
          if (tour) play(tour.index - 1, false);
          else goStep(-1);
          return;
        case "start":
          start();
          return;
        case "pause":
        case "stop":
          pause();
          return;
        case "read": {
          const main = document.querySelector("main");
          if (main) narrate(main.innerText.slice(0, 4000), undefined, true);
          return;
        }
        case "repeat":
          narrate(message, undefined, true);
          return;
        case "off":
          pause();
          clearSpot();
          setMode("off");
          return;
      }
    },
    [clearSpot, goStep, message, narrate, pause, play, setMode, start, tour],
  );

  const askGuide = useCallback(
    async (text: string, transcript: string | null, byVoice: boolean) => {
      setTerms([]);
      setGoTo(null);
      setPending(null);
      setFromAi(false);
      const command = commandOf(text);
      if (command) {
        runCommand(command);
        return;
      }
      if (!screen) {
        narrate(g.homeAsk, undefined, byVoice);
        return;
      }
      const elements = guideElements();
      const ids = elements.map((el) => el.dataset.guideId ?? "").filter(Boolean);
      setBusy(true);
      try {
        const response = await api.guide({
          screen,
          question: text,
          lang,
          visible_guide_ids: ids,
          guide_items: ids.map((id) => ({ id, text: itemText(id) })).filter((item) => item.text),
          transcript,
          profile: { plain_language: profile.plain },
          session_id: sessionId(),
        });
        narrate(response.answer, undefined, byVoice);
        setFromAi(response.source === "llm");
        setTerms(response.terms.filter((term) => g.glossary[term]));
        if (response.go_to_step && response.go_to_step !== screen) setGoTo(response.go_to_step);
        if (response.set_constraint) setPending(response.set_constraint);
        const target = response.highlight
          .map((id) => elements.find((el) => el.dataset.guideId === id))
          .find(Boolean);
        if (target) spotlight(target, true);
      } catch {
        narrate(g.offline, undefined, byVoice);
      } finally {
        setBusy(false);
      }
    },
    [g.glossary, g.homeAsk, g.offline, itemText, lang, narrate, profile.plain, runCommand, screen, spotlight],
  );

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const text = question.trim();
    if (!text) return;
    setHeard(null);
    setQuestion("");
    void askGuide(text, null, false);
  };

  const talk = () => {
    if (listening) {
      stopListenRef.current();
      return;
    }
    pause();
    setWriting(false);
    setListening(true);
    const session = listenOnce(lang);
    stopListenRef.current = session.stop;
    session.result.then(
      (text) => {
        setListening(false);
        setHeard(text);
        buzz(30);
        void askGuide(text, text, true);
      },
      () => {
        setListening(false);
        narrate(g.micError);
      },
    );
  };

  const write = () => {
    pause();
    setWriting(true);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  if (!modeLoaded || mode === "off" || !guideRoute(pathname)) return null;

  const stepName = (step: GuideStep) => {
    const found = STEPS.find((s) => s.screen === step);
    return found ? t.tool.steps[found.key].name : step;
  };
  const anchored = tour !== null && pos !== null;
  const open = bubbleOpen || tour !== null;
  const playButton = playing ? (
    <button type="button" onClick={pause}>
      {g.pause}
    </button>
  ) : (
    <button type="button" className="primary" onClick={start}>
      {tour ? g.resume : g.start}
    </button>
  );
  const talkButton = canListen() && (
    <button
      type="button"
      className={listening ? "guide-mic is-listening" : "guide-mic"}
      aria-pressed={listening}
      onClick={talk}
    >
      {listening ? g.stopListening : g.talk}
    </button>
  );
  const close = () => {
    pause();
    clearSpot();
    setTour(null);
    setWriting(false);
    setBubbleOpen(false);
    window.setTimeout(() => dockRef.current?.focus(), 0);
  };

  return (
    <aside className="guide no-print" aria-label={g.name}>
      {open ? (
        <div
          ref={bubbleRef}
          className={anchored ? "guide-bubble is-anchored" : "guide-bubble is-docked"}
          data-arrow={anchored ? pos.arrow : "dock"}
          style={
            anchored
              ? ({
                  top: pos.top,
                  left: pos.left,
                  width: pos.width,
                  "--arrow-x": `${pos.arrowX}px`,
                } as CSSProperties)
              : undefined
          }
          onKeyDown={(event) => {
            if (event.key === "Escape") close();
          }}
        >
          <div className="guide-head">
            <TutorFace speaking={speaking && !busy} />
            <div className="guide-head-text">
              <h2 className="guide-name">{g.name}</h2>
              {!tour && <p className="guide-tagline">{g.tagline}</p>}
            </div>
            <button type="button" className="guide-close" aria-label={g.minimize} onClick={close}>
              <span aria-hidden="true">✕</span>
            </button>
          </div>

          {heard && (
            <p className="guide-heard">
              <strong>{g.youSaid}:</strong> «{heard}»
            </p>
          )}
          <div className="guide-message" role="status" aria-live="polite" aria-busy={busy}>
            <p>{busy ? "…" : message}</p>
            {fromAi && !busy && <p className="guide-note">{g.fromAi}</p>}
          </div>

          {terms.length > 0 && (
            <dl className="guide-terms">
              {terms.map((term) => (
                <div key={term}>
                  <dt>{g.termTitle}</dt>
                  <dd>{g.glossary[term]}</dd>
                </div>
              ))}
            </dl>
          )}

          {pending && (
            <ConfirmConstraint
              pending={pending}
              onDone={(applied) => {
                setPending(null);
                buzz(applied ? [40, 60, 40] : 80);
                narrate(applied ? g.applied : g.notApplied);
              }}
              onNeedField={() => {
                setPending(null);
                narrate(g.needField);
              }}
            />
          )}

          {goTo && (
            <p>
              <button
                type="button"
                className="primary"
                onClick={() => router.push(STEPS.find((s) => s.screen === goTo)?.path ?? "/tool")}
              >
                {g.goTo(stepName(goTo))}
              </button>
            </p>
          )}

          {atEnd && nextStep && (
            <p>
              <button type="button" className="primary" onClick={() => router.push(nextStep.path)}>
                {g.nextStep(t.tool.steps[nextStep.key].name)}
              </button>
            </p>
          )}

          {tour ? (
            <div className="guide-actions">
              <button
                type="button"
                onClick={() => play(tour.index - 1, false)}
                disabled={tour.index === 0}
              >
                {g.previous}
              </button>
              {playButton}
              <button type="button" onClick={() => play(tour.index + 1, false)}>
                {tour.index + 1 < tour.total ? g.next(tour.index + 2, tour.total) : g.finish}
              </button>
            </div>
          ) : (
            !atEnd && <div className="guide-actions">{playButton}</div>
          )}
          <div className="guide-actions">
            {talkButton}
            <button
              type="button"
              aria-expanded={writing}
              onClick={writing ? () => setWriting(false) : write}
            >
              {g.write}
            </button>
          </div>
          {listening && <p className="guide-listening">{g.listening}</p>}

          {writing && (
            <form className="guide-ask" onSubmit={onSubmit}>
              <label htmlFor={`${titleId}-q`}>{g.ask}</label>
              <div className="guide-ask-row">
                <input
                  ref={inputRef}
                  id={`${titleId}-q`}
                  type="text"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  autoComplete="off"
                />
                <button type="submit" disabled={busy}>
                  {g.send}
                </button>
              </div>
            </form>
          )}

          {!tour && (
            <div className="guide-foot">
              {canSpeak() && (
                <label className="guide-check">
                  <input
                    type="checkbox"
                    checked={voiceOn}
                    onChange={(event) => {
                      setVoiceOn(event.target.checked);
                      writeFlag(VOICE_KEY, "local", event.target.checked);
                      if (!event.target.checked) stopSpeaking();
                    }}
                  />
                  {g.narrate}
                </label>
              )}
              {!profile.seen && (
                <button
                  type="button"
                  onClick={() => {
                    updateProfile({ seen: true });
                    onOpenSettings();
                  }}
                >
                  {g.settings}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  pause();
                  clearSpot();
                  writeFlag(AUTO_KEY, "session", false);
                  setMode("off");
                }}
              >
                {g.off}
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          ref={dockRef}
          type="button"
          className="guide-dock"
          aria-expanded={false}
          onClick={() => setBubbleOpen(true)}
        >
          <TutorFace speaking={false} />
          <span>{g.name}</span>
        </button>
      )}
    </aside>
  );
}

/** Dónde poner el globo junto al elemento explicado (coordenadas de la ventana). */
function placeBubble(el: HTMLElement, bubble: HTMLElement) {
  const r = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = 12;
  const width = Math.min(400, vw - margin * 2);
  const height = bubble.offsetHeight || 240;
  const left = Math.min(Math.max(r.left, margin), vw - width - margin);
  let top: number;
  let arrow: "up" | "down" | "none";
  if (r.bottom + 14 + height < vh) {
    top = r.bottom + 14;
    arrow = "up";
  } else if (r.top - 14 - height > 0) {
    top = r.top - 14 - height;
    arrow = "down";
  } else {
    // El elemento es más alto que la pantalla: el globo va abajo, sin tapar su título.
    top = Math.max(Math.min(r.top + 72, vh - height - margin), margin);
    top = Math.max(top, vh - height - margin);
    arrow = "none";
  }
  const arrowX = Math.min(Math.max(r.left + 28 - left, 20), width - 36);
  return { top, left, width, arrow, arrowX };
}

/**
 * Confirmación de un límite dicho por voz. La cifra viene de lo que dijo la
 * persona (el backend lo verifica contra la transcripción); aquí solo se
 * aplica si la persona dice que sí.
 */
function ConfirmConstraint({
  pending,
  onDone,
  onNeedField,
}: {
  pending: NonNullable<GuideResponse["set_constraint"]>;
  onDone: (applied: boolean) => void;
  onNeedField: () => void;
}) {
  const { t } = useI18n();
  const g = t.guide;
  const [parcelId] = useParcelId();
  const [declared, setDeclared] = useDeclaredConstraints(parcelId);
  const state = useEvaluation(parcelId);

  const apply = () => {
    const base: ConstraintsInput | null =
      declared ??
      (state.status === "ready"
        ? {
            max_water_mm_year: state.data.constraints.max_water_mm_year.value ?? 0,
            available_machinery: state.data.constraints.available_machinery,
            crops_without_buyer: state.data.constraints.crops_without_buyer,
            planting_window: {
              start_month: state.data.constraints.planting_window.start_month,
              end_month: state.data.constraints.planting_window.end_month,
            },
          }
        : null);
    if (!parcelId || !base) {
      onNeedField();
      return;
    }
    setDeclared({
      ...base,
      max_water_mm_year: pending.max_water_mm_year?.value_mm ?? base.max_water_mm_year,
      crops_without_buyer: [...new Set([...base.crops_without_buyer, ...pending.crops_without_buyer])],
    });
    onDone(true);
  };

  return (
    <div className="guide-confirm" role="group" aria-label={g.confirmTitle}>
      <p>
        <strong>{g.confirmTitle}</strong>
      </p>
      <div className="guide-actions">
        <button type="button" className="primary" onClick={apply}>
          {g.confirmYes}
        </button>
        <button type="button" onClick={() => onDone(false)}>
          {g.confirmNo}
        </button>
      </div>
    </div>
  );
}
