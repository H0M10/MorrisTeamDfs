"use client";
// La Guía (PLAN_DOMINGO.md §3): presente desde la primera visita, explica la
// pantalla, responde por voz o texto y se puede minimizar o apagar.
//
// Capa 1 (sin red ni IA): recorrido por los elementos con data-guide-id,
// órdenes de voz fijas y glosario. Capa 2: POST /api/v1/guide, que con llave
// de IA redacta a partir de esta pantalla y descarta cualquier cifra que no
// venga de los datos o de lo que dijo la persona.
//
// Accesibilidad: es un <aside> en el flujo (no flota ni tapa la página), los
// mensajes se anuncian con aria-live, el recorrido mueve el foco al elemento
// explicado y todo lo hablado también queda escrito.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { api, type GuideResponse, type GuideStep } from "../api";
import { useA11y } from "../a11y/profile";
import type { ConstraintsInput } from "../contract";
import { useDeclaredConstraints, useEvaluation, useParcelId } from "../evaluation";
import { useI18n } from "../i18n";
import { canListen, canSpeak, listenOnce, speak, stopSpeaking } from "../speech";
import { useGuideMode } from "./mode";

const STEPS: { screen: GuideStep; path: string; key: "parcel" | "portrait" | "constraints" | "rotations" | "evidence" | "share" }[] = [
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

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[¿?¡!.,]/g, "")
    .trim();

type Command = "next" | "back" | "tour" | "read" | "repeat" | "stop" | "off";
const COMMANDS: [Command, RegExp][] = [
  ["next", /^(siguiente|sigue|adelante|next|continue)$/],
  ["back", /^(atras|anterior|regresa|back|previous|go back)$/],
  ["tour", /(ensename|explicame|muestrame).*(pantalla)?$|^(show me|tour|show me this screen)/],
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

function guideElements(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>("[data-guide-id]")].filter(
    (el) => el.offsetParent !== null || el.getClientRects().length > 0,
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

  const screen = screenOf(pathname);
  const intro =
    pathname === "/"
      ? g.screens.home
      : screen
        ? g.screens[screen]
        : g.screens.other;

  const [message, setMessage] = useState<string>("");
  const [heard, setHeard] = useState<string | null>(null);
  const [terms, setTerms] = useState<string[]>([]);
  const [goTo, setGoTo] = useState<GuideStep | null>(null);
  const [pending, setPending] = useState<GuideResponse["set_constraint"]>(null);
  const [fromAi, setFromAi] = useState(false);
  const [tour, setTour] = useState<{ index: number; total: number } | null>(null);
  const [listening, setListening] = useState(false);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [speakAnswers, setSpeakAnswers] = useState(false);
  const stopRef = useRef<() => void>(() => {});
  const spotRef = useRef<HTMLElement | null>(null);
  const voiceTurn = useRef(false);

  const clearSpot = useCallback(() => {
    spotRef.current?.classList.remove("guide-spot");
    spotRef.current = null;
  }, []);

  // El saludo completo sale una sola vez; después, solo la presentación.
  const welcomed = useRef(false);

  // Al cambiar de pantalla: mensaje de presentación y nada resaltado.
  useEffect(() => {
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
    // Mensaje inicial derivado de la ruta (no hay otra fuente externa).
    setMessage(welcome ? `${g.welcome} ${intro}` : intro);
    setTerms([]);
    setGoTo(null);
    setPending(null);
    setTour(null);
    setHeard(null);
    setFromAi(false);
  }, [pathname, intro, firstVisit, g.welcome, clearSpot]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSpeakAnswers(profile.readAloud);
  }, [profile.readAloud]);

  const say = useCallback(
    (text: string, options?: { voice?: boolean }) => {
      setMessage(text);
      if ((options?.voice || speakAnswers || voiceTurn.current) && canSpeak()) speak(text, lang);
    },
    [lang, speakAnswers],
  );

  const spotlight = useCallback(
    (el: HTMLElement) => {
      clearSpot();
      el.classList.add("guide-spot");
      spotRef.current = el;
      const reduce =
        profile.reduceMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
      if (el.tabIndex < 0 && !el.matches("a, button, input, select, textarea, summary")) {
        el.setAttribute("tabindex", "-1");
      }
      el.focus({ preventScroll: true });
    },
    [clearSpot, profile.reduceMotion],
  );

  const itemText = useCallback(
    (id: string) => g.items[id] ?? g.items[`${id.split(".")[0]}.*`] ?? "",
    [g.items],
  );

  const showTourStep = useCallback(
    (index: number) => {
      const elements = guideElements().filter((el) => itemText(el.dataset.guideId ?? ""));
      if (elements.length === 0) {
        setTour(null);
        say(g.nothingHere);
        return;
      }
      if (index >= elements.length) {
        setTour(null);
        clearSpot();
        say(g.tourDone);
        return;
      }
      const el = elements[Math.max(0, index)]!;
      setTour({ index: Math.max(0, index), total: elements.length });
      spotlight(el);
      say(itemText(el.dataset.guideId ?? ""));
    },
    [clearSpot, g.nothingHere, g.tourDone, itemText, say, spotlight],
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
          if (tour) showTourStep(tour.index + 1);
          else goStep(1);
          return;
        case "back":
          if (tour) showTourStep(tour.index - 1);
          else goStep(-1);
          return;
        case "tour":
          showTourStep(0);
          return;
        case "read": {
          const main = document.querySelector("main");
          if (main) say(main.innerText.slice(0, 4000), { voice: true });
          return;
        }
        case "repeat":
          say(message, { voice: true });
          return;
        case "stop":
          stopSpeaking();
          return;
        case "off":
          stopSpeaking();
          clearSpot();
          setMode("off");
          return;
      }
    },
    [clearSpot, goStep, message, say, setMode, showTourStep, tour],
  );

  const askGuide = useCallback(
    async (text: string, transcript: string | null) => {
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
        say(g.homeAsk);
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
          guide_items: ids
            .map((id) => ({ id, text: itemText(id) }))
            .filter((item) => item.text),
          transcript,
          profile: { plain_language: profile.plain },
          session_id: sessionId(),
        });
        say(response.answer);
        setFromAi(response.source === "llm");
        setTerms(response.terms.filter((term) => g.glossary[term]));
        if (response.go_to_step && response.go_to_step !== screen) setGoTo(response.go_to_step);
        if (response.set_constraint) setPending(response.set_constraint);
        const target = response.highlight
          .map((id) => elements.find((el) => el.dataset.guideId === id))
          .find(Boolean);
        if (target) spotlight(target);
      } catch {
        say(g.offline);
      } finally {
        setBusy(false);
      }
    },
    [g.glossary, g.homeAsk, g.offline, itemText, lang, profile.plain, runCommand, say, screen, spotlight],
  );

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const text = question.trim();
    if (!text) return;
    voiceTurn.current = false;
    setHeard(null);
    setQuestion("");
    void askGuide(text, null);
  };

  const toggleListening = () => {
    if (listening) {
      stopRef.current();
      return;
    }
    stopSpeaking();
    setListening(true);
    const session = listenOnce(lang);
    stopRef.current = session.stop;
    session.result.then(
      (text) => {
        setListening(false);
        voiceTurn.current = true; // pregunta con voz: se responde con voz
        setHeard(text);
        buzz(30);
        void askGuide(text, text);
      },
      () => {
        setListening(false);
        say(g.micError);
      },
    );
  };

  useEffect(() => {
    document.body.classList.toggle("guide-touring", tour !== null);
    return () => document.body.classList.remove("guide-touring");
  }, [tour]);

  // Quita el resaltado al desmontar.
  useEffect(() => () => clearSpot(), [clearSpot]);

  if (!modeLoaded || mode === "off" || !guideRoute(pathname)) return null;

  const markSeen = () => {
    if (!profile.seen) updateProfile({ seen: true });
  };

  if (mode === "min") {
    return (
      <aside className="guide guide-min" aria-labelledby={titleId}>
        <h2 id={titleId} className="guide-name">
          {g.name}
        </h2>
        <button type="button" onClick={() => setMode("open")}>
          {g.open}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("open");
            showTourStep(0);
          }}
        >
          {g.show}
        </button>
      </aside>
    );
  }

  const stepName = (step: GuideStep) => {
    const found = STEPS.find((s) => s.screen === step);
    return found ? t.tool.steps[found.key].name : step;
  };

  return (
    <aside className="guide no-print" aria-labelledby={titleId}>
      <div className="guide-head">
        <h2 id={titleId} className="guide-name">
          {g.name}
        </h2>
        <p className="guide-tagline">{g.tagline}</p>
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
            say(applied ? g.applied : g.notApplied);
          }}
          onNeedField={() => {
            setPending(null);
            say(g.needField);
          }}
        />
      )}

      {goTo && (
        <p>
          <Link className="button primary" href={STEPS.find((s) => s.screen === goTo)?.path ?? "/tool"}>
            {g.goTo(stepName(goTo))}
          </Link>
        </p>
      )}

      {!tour && (
        <div className="guide-actions">
          <button
            type="button"
            className="primary"
            onClick={() => {
              markSeen();
              showTourStep(0);
            }}
          >
            {g.show}
          </button>
          {canListen() && (
            <button
              type="button"
              className={listening ? "guide-mic is-listening" : "guide-mic"}
              aria-pressed={listening}
              onClick={() => {
                markSeen();
                toggleListening();
              }}
            >
              {listening ? g.stopListening : g.talk}
            </button>
          )}
          {!profile.seen && (
            <button
              type="button"
              onClick={() => {
                markSeen();
                onOpenSettings();
              }}
            >
              {g.settings}
            </button>
          )}
        </div>
      )}
      {listening && <p className="guide-listening">{g.listening}</p>}

      <form className="guide-ask" onSubmit={onSubmit}>
        <label htmlFor={`${titleId}-q`}>{g.ask}</label>
        <div className="guide-ask-row">
          <input
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

      {tour && (
        // Durante el recorrido el panel queda arriba, fuera de la vista: esta
        // barra fija repite el texto (el lector de pantalla ya lo oyó por
        // aria-live) y lleva los botones al alcance del pulgar.
        <div className="guide-tourbar" role="group" aria-label={g.name}>
          <p aria-hidden="true">{message}</p>
          <div className="guide-actions">
            <button type="button" onClick={() => showTourStep(tour.index - 1)} disabled={tour.index === 0}>
              {g.previous}
            </button>
            {tour.index + 1 < tour.total ? (
              <button type="button" className="primary" onClick={() => showTourStep(tour.index + 1)}>
                {g.next(tour.index + 2, tour.total)}
              </button>
            ) : (
              <button type="button" className="primary" onClick={() => showTourStep(tour.total)}>
                {g.finish}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="guide-foot">
        {canSpeak() && (
          <label className="guide-check">
            <input
              type="checkbox"
              checked={speakAnswers}
              onChange={(event) => {
                setSpeakAnswers(event.target.checked);
                if (!event.target.checked) stopSpeaking();
              }}
            />
            {g.speakAnswers}
          </label>
        )}
        <button
          type="button"
          onClick={() => {
            markSeen();
            clearSpot();
            setTour(null);
            setMode("min");
          }}
        >
          {g.minimize}
        </button>
        <button
          type="button"
          onClick={() => {
            markSeen();
            stopSpeaking();
            clearSpot();
            setMode("off");
          }}
        >
          {g.off}
        </button>
      </div>
    </aside>
  );
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
