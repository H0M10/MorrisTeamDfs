"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { EvaluationGate } from "@/lib/components/LoadGate";
import { SiteHeader } from "@/lib/components/SiteHeader";
import type { Evaluation } from "@/lib/contract";
import { useEvaluation, useParcelId } from "@/lib/evaluation";
import { useI18n } from "@/lib/i18n";
import { GestureButton } from "./_components/GestureButton";

// three no entra al paquete inicial: se descarga cuando este componente se monta.
const Scene = dynamic(() => import("./_components/Scene"), {
  ssr: false,
  loading: () => <CanvasLoading />,
});

function CanvasLoading() {
  const { t } = useI18n();
  return <p role="status">{t.showcase.canvasLoading}</p>;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

function Stage({ evaluation }: { evaluation: Evaluation }) {
  const { t, pick, month } = useI18n();
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const last = evaluation.timeline.length - 1;
  const current = evaluation.timeline[index] ?? evaluation.timeline[0];

  return (
    <>
      <section aria-labelledby="canvas-title">
        <h2 id="canvas-title">{t.showcase.canvasTitle}</h2>
        <div className="canvas-frame">
          <Scene color={current.hls_color_hex} reducedMotion={reducedMotion} label={t.showcase.canvasAlt} />
        </div>
        {/* Alternativa con teclado a los gestos: recorrer los meses. */}
        <p>
          <button type="button" onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0}>
            ← {t.showcase.previousMonth}
          </button>{" "}
          <button type="button" onClick={() => setIndex(Math.min(last, index + 1))} disabled={index === last}>
            {t.showcase.nextMonth} →
          </button>
        </p>
        <p role="status" aria-live="polite">
          {t.showcase.month}: {month(current.month)}. {pick(current.crop_label)}. {current.hls_color_hex}
        </p>
      </section>
      <GestureButton />
      <section aria-labelledby="raw-title">
        <h2 id="raw-title">{t.showcase.raw}</h2>
        <pre tabIndex={0}>{JSON.stringify({ parcel: evaluation.parcel, month: current }, null, 2)}</pre>
      </section>
    </>
  );
}

export default function ShowcasePage() {
  const { t } = useI18n();
  const [parcelId] = useParcelId();
  const state = useEvaluation(parcelId);
  return (
    <div className="judges">
      <title>{`${t.showcase.title} · Field Shift`}</title>
      <SiteHeader />
      <main id="contenido" tabIndex={-1} className="page">
        <h1>{t.showcase.title}</h1>
        <p>{t.showcase.lead}</p>
        <EvaluationGate state={state}>{(evaluation) => <Stage evaluation={evaluation} />}</EvaluationGate>
      </main>
    </div>
  );
}
