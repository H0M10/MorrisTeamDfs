"use client";
// Flujo sencillo "respuesta primero" (tras la prueba con 10 personas):
//   1. ¿Dónde está tu campo?  2. Dos preguntas  3. La respuesta.
// El análisis del satélite corre mientras la persona contesta. Los detalles
// (comparación, evidencia, hoja para el técnico) quedan a un toque en /tool.
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ApiError, api } from "@/lib/api";
import { EvaluationGate } from "@/lib/components/LoadGate";
import { SiteHeader } from "@/lib/components/SiteHeader";
import type { Evaluation } from "@/lib/contract";
import { useDeclaredConstraints, useEvaluation, useParcelId, usePilots } from "@/lib/evaluation";
import { DEFAULT_PARCEL_ID } from "@/lib/fixtures";
import { useI18n } from "@/lib/i18n";
import { rememberLiveRequest, type Ring } from "@/lib/shapes";
import {
  orderStrategies,
  usePriorities,
  type RankableKey,
} from "../tool/_components/priorities";
import { useToolEvaluation } from "../tool/_components/useToolEvaluation";
import "./campo.css";
import { VoiceBar, type VoiceOption } from "./VoiceBar";

const FieldFinder = dynamic(() => import("./FieldFinder").then((m) => m.FieldFinder), {
  ssr: false,
  loading: () => <p role="status">…</p>,
});

type Step = "where" | "map" | "water" | "priority" | "result";
type Analysis =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done" }
  | { status: "error"; message: string };
/** Agua de este año frente a la de siempre. Lo declara la persona. */
const WATER = [
  { key: "same", factor: 1 },
  { key: "less", factor: 0.9 },
  { key: "muchLess", factor: 0.75 },
] as const;
type WaterKey = (typeof WATER)[number]["key"];
const PRIORITIES: RankableKey[] = ["water", "soil", "climate"];

export default function SimpleFlowPage() {
  const { t, pick } = useI18n();
  const s = t.simple;
  const [step, setStep] = useState<Step>("where");
  const [locate, setLocate] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis>({ status: "idle" });
  const [water, setWater] = useState<WaterKey>("same");
  const [parcelId, setParcelId] = useParcelId();
  const [, setPriorities] = usePriorities();
  const pilots = usePilots();
  const heading = useRef<HTMLHeadingElement>(null);

  // Al cambiar de paso, el foco va al título: lo lee el lector de pantalla.
  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  const useExample = () => {
    const list = pilots.status === "ready" ? pilots.data.pilots : [];
    const example = list.find((p) => !/^dv-f\d+$/.test(p.id)) ?? list[0];
    setParcelId(example?.id ?? DEFAULT_PARCEL_ID);
    setAnalysis({ status: "done" });
    setStep("water");
  };

  const analyze = (lat: number, lon: number, ring: Ring) => {
    setAnalysis({ status: "running" });
    setStep("water");
    api.analyze(lat, lon, ring).then(
      (evaluation) => {
        rememberLiveRequest(evaluation.parcel.id, { lat, lon, polygon: ring });
        setParcelId(evaluation.parcel.id);
        setAnalysis({ status: "done" });
      },
      (caught) =>
        setAnalysis({
          status: "error",
          message: caught instanceof ApiError ? pick(caught.localized) : s.analysisError,
        }),
    );
  };

  const goMap = (gps: boolean) => {
    setLocate(gps);
    setStep("map");
  };
  const whereOptions: VoiceOption[] = [
    { label: s.imThere, words: ["estoy", "aqui", "ubicacion", "i am", "here", "location"], onSelect: () => goMap(true) },
    { label: s.findOnMap, words: ["buscar", "mapa", "find", "map", "search"], onSelect: () => goMap(false) },
    { label: s.example, words: ["ejemplo", "example"], onSelect: useExample },
  ];
  const waterOptions: VoiceOption[] = WATER.map((option) => ({
    label: s.water[option.key],
    words: s.waterWords[option.key],
    onSelect: () => {
      setWater(option.key);
      setStep("priority");
    },
  }));
  const priorityOptions: VoiceOption[] = PRIORITIES.map((key) => ({
    label: t.tool.rotations.priorityNames[key],
    words: s.priorityWords[key],
    onSelect: () => {
      setPriorities({ first: key, second: null });
      setStep("result");
    },
  }));
  const options =
    step === "where" ? whereOptions : step === "water" ? waterOptions : step === "priority" ? priorityOptions : null;

  const stepNumber = step === "where" || step === "map" ? 1 : step === "result" ? 3 : 2;
  const title =
    step === "where" || step === "map"
      ? s.whereTitle
      : step === "water"
        ? s.waterTitle
        : step === "priority"
          ? s.priorityTitle
          : s.resultTitle;
  const back: Partial<Record<Step, Step>> = { map: "where", water: "where", priority: "water", result: "priority" };

  return (
    <>
      <SiteHeader />
      <main id="contenido" tabIndex={-1} className="page simple">
        <title>{`${title} · Field Shift`}</title>
        <p className="simple-progress">
          {s.stepOf(stepNumber)}
          <span aria-hidden="true" className="simple-dots">
            {[1, 2, 3].map((n) => (
              <i key={n} data-on={n <= stepNumber} />
            ))}
          </span>
        </p>
        <h1 ref={heading} tabIndex={-1}>
          {title}
        </h1>
        {options && <VoiceBar question={title} options={options} />}

        {step === "where" && (
          <div className="simple-choices" data-guide-id="campo.where">
            {whereOptions.map((option, n) => (
              <button
                key={option.label}
                type="button"
                className={n === 0 ? "primary big" : "big"}
                onClick={option.onSelect}
              >
                {option.label}
              </button>
            ))}
            <p className="small">{s.whereNote}</p>
          </div>
        )}

        {step === "map" && <FieldFinder locateOnStart={locate} onConfirm={analyze} />}

        {step === "water" && (
          <div className="simple-choices" data-guide-id="campo.water">
            {WATER.map((option) => (
              <button
                key={option.key}
                type="button"
                className="big"
                onClick={() => {
                  setWater(option.key);
                  setStep("priority");
                }}
              >
                {s.water[option.key]}
              </button>
            ))}
          </div>
        )}

        {step === "priority" && (
          <div className="simple-choices" data-guide-id="campo.priority">
            {PRIORITIES.map((key) => (
              <button
                key={key}
                type="button"
                className="big"
                onClick={() => {
                  setPriorities({ first: key, second: null });
                  setStep("result");
                }}
              >
                {t.tool.rotations.priorityNames[key]}
                <span className="big-help">{t.tool.rotations.priorityHelp[key]}</span>
              </button>
            ))}
          </div>
        )}

        {step === "result" && analysis.status === "running" && <Waiting />}
        {step === "result" && analysis.status === "error" && (
          <div className="simple-choices">
            <p role="alert">{analysis.message}</p>
            <button type="button" className="primary big" onClick={() => setStep("map")}>
              {s.tryAgain}
            </button>
            <button type="button" className="big" onClick={useExample}>
              {s.example}
            </button>
          </div>
        )}
        {step === "result" && analysis.status === "done" && (
          <Result
            parcelId={parcelId}
            factor={WATER.find((w) => w.key === water)?.factor ?? 1}
          />
        )}

        {analysis.status === "running" && step !== "result" && step !== "map" && (
          <p className="simple-working" role="status">
            {s.workingMeanwhile}
          </p>
        )}

        {back[step] && (
          <p>
            <button type="button" className="link-button" onClick={() => setStep(back[step]!)}>
              <span aria-hidden="true">← </span>
              {s.back}
            </button>
          </p>
        )}
      </main>
    </>
  );
}

function Waiting() {
  const { t } = useI18n();
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((v) => v + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <div className="simple-wait" role="status" aria-live="polite">
      <div className="simple-spinner" aria-hidden="true" />
      <p>
        <strong>{t.simple.waiting}</strong>
      </p>
      <p>{t.simple.waitingDetail(seconds)}</p>
    </div>
  );
}

function Result({ parcelId, factor }: { parcelId: string; factor: number }) {
  const base = useEvaluation(parcelId);
  const [, setDeclared] = useDeclaredConstraints(parcelId);
  const applied = useRef<string | null>(null);

  // El agua que dijo la persona se aplica una vez sobre los límites del campo.
  useEffect(() => {
    if (base.status !== "ready") return;
    const key = `${parcelId}:${factor}`;
    if (applied.current === key) return;
    applied.current = key;
    const c = base.data.constraints;
    const limit = c.max_water_mm_year.value;
    if (factor === 1 || limit === null) {
      setDeclared(null);
      return;
    }
    setDeclared({
      max_water_mm_year: Math.round(limit * factor),
      available_machinery: c.available_machinery,
      crops_without_buyer: c.crops_without_buyer,
      planting_window: {
        start_month: c.planting_window.start_month,
        end_month: c.planting_window.end_month,
      },
    });
    // setDeclared cambia en cada render; la llave evita repetir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, parcelId, factor]);

  const state = useToolEvaluation(parcelId);
  return <EvaluationGate state={state}>{(evaluation) => <Answer evaluation={evaluation} />}</EvaluationGate>;
}

function Answer({ evaluation }: { evaluation: Evaluation }) {
  const { t, pick, value } = useI18n();
  const s = t.simple;
  const r = t.tool.rotations;
  const [priorities] = usePriorities();
  const ordered = orderStrategies(evaluation.strategies, priorities);
  const top = ordered[0];
  const key: RankableKey =
    priorities.first && priorities.first !== "market" ? priorities.first : "water";

  if (!top || !top.viable || !evaluation.has_viable_options) {
    return (
      <div className="simple-choices">
        <p className="answer-none">
          <strong>{r.noneViable}</strong>
        </p>
        <ul>
          {evaluation.strategies.map((strategy) => (
            <li key={strategy.id}>
              <strong>{pick(strategy.title)}:</strong>{" "}
              {strategy.rejection_reason ? pick(strategy.rejection_reason) : r.ruledOut}
            </li>
          ))}
        </ul>
        <Link className="button big" href="/tool/restricciones">
          {s.changeLimits}
        </Link>
      </div>
    );
  }

  const m = top.metrics;
  const detail =
    key === "water"
      ? r.detail.water(value(m.annual_water_mm))
      : key === "soil"
        ? r.detail.soil(String(m.soil_cover_months_36m.value))
        : r.detail.climate(String(m.frost_risk_days_year.value), String(m.heat_risk_days_year.value));
  const others = ordered.slice(1);
  const fact = (label: string, metric: typeof m.annual_water_mm) => (
    <div>
      <dt>{label}</dt>
      <dd>
        {value(metric)} <span className="metric-kind">{t.common.kinds[metric.type]}</span>
      </dd>
    </div>
  );

  return (
    <>
      <p className="answer-field">
        {s.forField} <strong>{pick(evaluation.parcel.name)}</strong>
      </p>
      <section className="answer-card" aria-labelledby="answer-title" data-guide-id="campo.answer">
        <p className="answer-kicker">{s.bestFor(r.priorityNames[key])}</p>
        <h2 id="answer-title">{pick(top.title)}</h2>
        <p className="answer-why">{s.because(detail)}</p>
        <dl className="answer-facts">
          {fact(r.rowNames.annual_water_mm, m.annual_water_mm)}
          {fact(r.rowNames.soil_cover_months_36m, m.soil_cover_months_36m)}
          {fact(r.rowNames.frost_risk_days_year, m.frost_risk_days_year)}
        </dl>
        {top.id === "current" && <p>{s.isCurrent}</p>}
      </section>

      <div className="simple-choices" data-guide-id="campo.next">
        <Link className="button primary big" href="/tool/evidencia">
          {s.seeWhy}
        </Link>
        <Link className="button big" href="/tool/compartir">
          {s.share}
        </Link>
      </div>

      <h2>{s.others}</h2>
      <ul className="answer-others">
        {others.map((strategy) => (
          <li key={strategy.id}>
            <strong>{pick(strategy.title)}</strong>
            <span>
              {strategy.viable
                ? `${r.rowNames.annual_water_mm}: ${value(strategy.metrics.annual_water_mm)}`
                : `${r.ruledOut}. ${strategy.rejection_reason ? pick(strategy.rejection_reason) : ""}`}
            </span>
          </li>
        ))}
      </ul>
      <p>
        <Link href="/tool/rotaciones">{s.compareAll}</Link>
      </p>
      <p className="small">{s.disclaimer}</p>
    </>
  );
}
