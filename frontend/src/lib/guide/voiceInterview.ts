"use client";
// Modo de voz guiado: la Guía pregunta en voz alta, la persona contesta
// hablando y todo se llena sin tocar la pantalla. Cada respuesta se lee de
// vuelta y se aplica solo si la persona dice que sí. Las cifras salen de lo
// que dijo la persona (el servidor lo verifica) y el resultado final sale del
// contrato, nunca de un modelo de lenguaje.
import { api, type GuideResponse } from "../api";
import type { ConstraintsInput, Evaluation } from "../contract";
import {
  CONSTRAINTS_CHANGE_EVENT,
  loadEvaluation,
  loadSimulation,
  parseConstraints,
} from "../evaluation";
import { readConstraints, readLastParcelId, saveConstraints } from "../storage";
import { orderStrategies, savePriorities, type Priorities } from "@/app/tool/_components/priorities";
import { MAP_RESULT_EVENT, parseMapAction, sendMapAction, type MapAction } from "./actions";

export type SetConstraint = NonNullable<GuideResponse["set_constraint"]>;

export interface InterviewTexts {
  start: string;
  place: string;
  field: string;
  water: string;
  machinery: string;
  buyers: string;
  window: string;
  priority: string;
  notUnderstood: string;
  skipped: string;
  applied: string;
  stopped: string;
  noAnswer: string;
  buyersPrefix: string;
  windowPrefix: string;
  priorityPrefix: string;
  result: (name: string, why: string) => string;
  currentOut: (reason: string) => string;
  noneViable: string;
  end: string;
  /** Mensajes del mapa: análisis en curso y análisis terminado bien. */
  analyzing: string;
  analyzed: string;
  /** Lo que se entendió, dicho sin IA, terminado en «¿Es correcto?». */
  describe: (pending: SetConstraint) => string;
}

export interface InterviewContext {
  lang: "es" | "en";
  texts: InterviewTexts;
  /** Muestra y dice un texto; resuelve al terminar de hablar. */
  say: (text: string) => Promise<void>;
  /** Escucha una frase; resuelve con el texto o null si no hubo voz. */
  listen: () => Promise<string | null>;
  go: (path: string) => void;
  currentPath: () => string;
  cancelled: () => boolean;
  /** Frase que explica por qué va primera la rotación (mismas reglas que la pantalla). */
  explain: (evaluation: Evaluation, priorities: Priorities) => string;
  pickName: (strategy: Evaluation["strategies"][number]) => string;
  pickReason: (strategy: Evaluation["strategies"][number]) => string;
}

const norm = (t: string) =>
  t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[¿?¡!.,]/g, "").trim();
const YES = /^(si|sí|claro|correcto|aplica|aplicalo|dale|ok|okay|esta bien|asi es|yes|yeah|yep|correct|apply|sure|right)\b/;
const SKIP = /^(no|ninguno|ninguna|nada|no se|no tengo|paso|siguiente|skip|none|nothing|no one|i don.?t know|next)\b/;
const STOP = /\b(para|alto|detente|cancela|basta|stop|cancel|quit)\b/;
const READY = /\b(listo|ya|aqui|aqui esta|ese es|es ese|este es|si|done|ready|here|this one|yes)\b/;

const UNITS: Record<string, number> = {
  cero: 0, uno: 1, una: 1, un: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17,
  dieciocho: 18, diecinueve: 19, veinte: 20, veintiuno: 21, veintidos: 22, veintitres: 23, veinticuatro: 24,
  veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29, treinta: 30,
  cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100, ciento: 100,
  doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500, seiscientos: 600,
  setecientos: 700, ochocientos: 800, novecientos: 900, mil: 1000,
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90, hundred: 100, thousand: 1000,
};

/** "veinte pulgadas" -> "20 pulgadas"; "treinta y dos" -> "32"; "two hundred" -> "200". */
export function wordsToDigits(text: string): string {
  const tokens = norm(text).split(/\s+/);
  const out: string[] = [];
  let total: number | null = null;
  const flush = () => {
    if (total !== null) out.push(String(total));
    total = null;
  };
  for (let i = 0; i < tokens.length; i++) {
    const w = tokens[i]!;
    const n = UNITS[w];
    if (n !== undefined && !(w === "un" || w === "una" || w === "one") ) {
      if (total === null) total = n;
      else if (n === 100 || n === 1000) total = (total || 1) * n;
      else total += n;
      continue;
    }
    if ((w === "y" || w === "and") && total !== null && UNITS[tokens[i + 1] ?? ""] !== undefined) continue;
    flush();
    out.push(w);
  }
  flush();
  return out.join(" ");
}

function waitMapResult(timeoutMs: number): Promise<string | null> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener(MAP_RESULT_EVENT, onResult);
      resolve(null);
    }, timeoutMs);
    const onResult = (event: Event) => {
      window.clearTimeout(timer);
      window.removeEventListener(MAP_RESULT_EVENT, onResult);
      resolve((event as CustomEvent<string>).detail);
    };
    window.addEventListener(MAP_RESULT_EVENT, onResult);
  });
}

async function mapDo(ctx: InterviewContext, action: MapAction, timeoutMs = 20000): Promise<string | null> {
  const onMap = ctx.currentPath() === "/tool";
  const result = waitMapResult(timeoutMs);
  sendMapAction(action, onMap);
  if (!onMap) ctx.go("/tool");
  return result;
}

/** Aplica lo dicho a las restricciones guardadas del campo. */
async function applyHeard(pending: SetConstraint): Promise<void> {
  if (pending.priority) savePriorities({ first: pending.priority, second: null });
  const parcelId = readLastParcelId();
  if (!parcelId) return;
  let base: ConstraintsInput | null = parseConstraints(readConstraints(parcelId));
  if (!base) {
    const c = (await loadEvaluation(parcelId)).data.constraints;
    base = {
      max_water_mm_year: c.max_water_mm_year.value ?? 0,
      available_machinery: c.available_machinery,
      crops_without_buyer: c.crops_without_buyer,
      planting_window: { start_month: c.planting_window.start_month, end_month: c.planting_window.end_month },
    };
  }
  const missing = new Set(pending.machinery_missing ?? []);
  const next: ConstraintsInput = {
    ...base,
    max_water_mm_year: pending.max_water_mm_year?.value_mm ?? base.max_water_mm_year,
    crops_without_buyer: [...new Set([...base.crops_without_buyer, ...pending.crops_without_buyer])],
    available_machinery: [...new Set([...base.available_machinery, ...(pending.machinery_have ?? [])])].filter(
      (code) => !missing.has(code),
    ),
    planting_window: pending.planting_window ?? base.planting_window,
  };
  const json = JSON.stringify(next);
  saveConstraints(parcelId, json);
  window.dispatchEvent(new CustomEvent(CONSTRAINTS_CHANGE_EVENT, { detail: { parcelId, json } }));
}

/** Pregunta, escucha y reintenta una vez si no hubo voz. */
async function ask(ctx: InterviewContext, question: string): Promise<string | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (ctx.cancelled()) return null;
    await ctx.say(attempt === 0 ? question : `${ctx.texts.noAnswer} ${question}`);
    if (ctx.cancelled()) return null;
    const heard = await ctx.listen();
    if (heard) {
      if (STOP.test(norm(heard))) throw new Error("stop");
      return heard;
    }
  }
  return null;
}

/** Una pregunta de límites: se manda al servidor, se lee de vuelta y se aplica si dice que sí. */
async function askConstraint(ctx: InterviewContext, question: string, prefix: string): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const answer = await ask(ctx, question);
    if (!answer || SKIP.test(norm(answer))) {
      await ctx.say(ctx.texts.skipped);
      return;
    }
    const said = wordsToDigits(`${prefix}${answer}`);
    let response: GuideResponse | null = null;
    try {
      response = await api.guide({
        screen: "restricciones",
        question: said,
        transcript: said,
        lang: ctx.lang,
        visible_guide_ids: [],
        guide_items: [],
      });
    } catch {
      response = null;
    }
    const pending = response?.set_constraint;
    if (!pending) {
      await ctx.say(ctx.texts.notUnderstood);
      continue;
    }
    const confirm = await ask(ctx, ctx.texts.describe(pending));
    if (confirm && YES.test(norm(confirm))) {
      await applyHeard(pending);
      await ctx.say(ctx.texts.applied);
    } else {
      await ctx.say(ctx.texts.skipped);
    }
    return;
  }
}

export async function runVoiceInterview(ctx: InterviewContext): Promise<void> {
  const t = ctx.texts;
  try {
    await ctx.say(t.start);

    // 1. Dónde está el campo.
    for (let attempt = 0; attempt < 3 && !ctx.cancelled(); attempt++) {
      const answer = await ask(ctx, t.place);
      if (!answer) break;
      const parsed = parseMapAction(answer);
      const action: MapAction =
        parsed?.type === "go" || parsed?.type === "locate" ? parsed : { type: "go", place: answer };
      const result = await mapDo(ctx, action);
      if (result) await ctx.say(result);
      if (result && !/no encontr|could not find|est[aá] en|is in /i.test(result)) break;
    }

    // 2. Confirmar el campo y analizar.
    for (let attempt = 0; attempt < 3 && !ctx.cancelled(); attempt++) {
      const answer = await ask(ctx, t.field);
      if (!answer) break;
      const parsed = parseMapAction(answer);
      if (parsed?.type === "locate" || parsed?.type === "go") {
        const moved = await mapDo(ctx, parsed);
        if (moved) await ctx.say(moved);
        continue;
      }
      if (READY.test(norm(answer)) || parsed?.type === "mark") {
        const marked = await mapDo(ctx, { type: "mark" });
        if (marked) await ctx.say(marked);
        const started = await mapDo(ctx, { type: "analyze" }, 10000);
        if (started) await ctx.say(started);
        if (started === ctx.texts.analyzing) {
          const finished = await waitMapResult(150000);
          if (finished) await ctx.say(finished);
          if (finished === ctx.texts.analyzed) break;
        }
      }
    }

    // 3 a 7. Límites y prioridad.
    await askConstraint(ctx, t.water, "");
    await askConstraint(ctx, t.machinery, "");
    await askConstraint(ctx, t.buyers, t.buyersPrefix);
    await askConstraint(ctx, t.window, t.windowPrefix);
    await askConstraint(ctx, t.priority, t.priorityPrefix);
    if (ctx.cancelled()) return;

    // 8. El resultado, dicho en voz alta.
    const parcelId = readLastParcelId();
    if (parcelId) {
      const declared = parseConstraints(readConstraints(parcelId));
      const loaded = declared ? await loadSimulation(parcelId, declared) : await loadEvaluation(parcelId);
      const evaluation = loaded.data;
      let priorities: Priorities = { first: null, second: null };
      try {
        priorities = JSON.parse(window.localStorage.getItem("fieldshift:priorities") ?? "null") ?? priorities;
      } catch {
        // sin prioridad guardada: orden normal
      }
      const ordered = orderStrategies(evaluation.strategies, priorities);
      const top = ordered[0];
      ctx.go("/tool/rotaciones");
      if (!top || !top.viable) {
        await ctx.say(t.noneViable);
      } else {
        await ctx.say(t.result(ctx.pickName(top), ctx.explain(evaluation, priorities)));
      }
      const current = evaluation.strategies.find((s) => s.id === "current");
      if (current && !current.viable && current.rejection_reason) {
        await ctx.say(t.currentOut(ctx.pickReason(current)));
      }
    }
    await ctx.say(t.end);
  } catch (error) {
    if ((error as Error).message === "stop") await ctx.say(t.stopped);
  }
}
