"use client";
import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { EvaluationGate } from "@/lib/components/LoadGate";
import { SiteHeader } from "@/lib/components/SiteHeader";
import type { Evaluation } from "@/lib/contract";
import { useEvaluation, useParcelId } from "@/lib/evaluation";
import { useI18n } from "@/lib/i18n";
import { ClipLoop } from "./_components/ClipLoop";
import { GestureButton } from "./_components/GestureButton";
import { LayeredZoom } from "./_components/LayeredZoom";
import { SHOWCASE_CONFIG } from "./_lib/showcaseConfig";

// three no entra al paquete inicial: se descarga cuando este componente se monta.
const Scene = dynamic(() => import("./_components/Scene"), {
  ssr: false,
  loading: () => <CanvasLoading />,
});
const INITIAL_CAMERA_DISTANCE =
  SHOWCASE_CONFIG.layers[0]?.cameraDistance ?? 5;

function CanvasLoading() {
  const { t } = useI18n();
  return <p role="status">{t.showcase.canvasLoading}</p>;
}

function useReducedMotion(): boolean | null {
  const [reduced, setReduced] = useState<boolean | null>(null);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

function Stage({
  evaluation,
  index,
  setIndex,
}: {
  evaluation: Evaluation;
  index: number;
  setIndex: Dispatch<SetStateAction<number>>;
}) {
  const { t, pick, month } = useI18n();
  const reducedMotion = useReducedMotion();
  const [zoomIndex, setZoomIndex] = useState(0);
  const [cameraState, setCameraState] = useState({
    animating: false,
    distance: INITIAL_CAMERA_DISTANCE,
  });
  const cameraDistance =
    SHOWCASE_CONFIG.layers[zoomIndex]?.cameraDistance ??
    INITIAL_CAMERA_DISTANCE;
  const last = evaluation.timeline.length - 1;
  const current = evaluation.timeline[index] ?? evaluation.timeline[0];
  const updateCameraState = useCallback((animating: boolean, distance: number) => {
    setCameraState((currentState) =>
      currentState.animating === animating &&
      Math.abs(currentState.distance - distance) < 0.01
        ? currentState
        : { animating, distance },
    );
  }, []);

  if (reducedMotion === null) {
    return <p role="status">{t.showcase.canvasLoading}</p>;
  }

  return (
    <>
      <section aria-labelledby="canvas-title">
        <h2 id="canvas-title">
          {t.showcase.canvasTitle} · {pick(evaluation.parcel.name)}
        </h2>
        <div className="canvas-frame">
          <Scene
            color={current.hls_color_hex}
            reducedMotion={reducedMotion}
            label={t.showcase.canvasAlt}
            cameraDistance={cameraDistance}
            onCameraStateChange={updateCameraState}
          />
        </div>
        {/* Alternativa con teclado a los gestos: recorrer los meses. */}
        <p>
          <button type="button" onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0} aria-keyshortcuts="ArrowLeft">
            ← {t.showcase.previousMonth}
          </button>{" "}
          <button type="button" onClick={() => setIndex(Math.min(last, index + 1))} disabled={index === last} aria-keyshortcuts="ArrowRight">
            {t.showcase.nextMonth} →
          </button>
        </p>
        <p role="status" aria-live="polite">
          {t.showcase.month}: {month(current.month)}. {pick(current.crop_label)}. {current.hls_color_hex}
        </p>
      </section>
      <LayeredZoom
        activeIndex={zoomIndex}
        onChange={setZoomIndex}
        cameraAnimating={cameraState.animating}
        cameraDistance={cameraState.distance}
      />
      <GestureButton onPinch={() => setIndex((value) => Math.min(last, value + 1))} />
      <section aria-labelledby="clips-title">
        <h2 id="clips-title">Clips animados de apoyo</h2>
        <p>Los clips son ilustrativos y no sustituyen observaciones geográficas.</p>
        {SHOWCASE_CONFIG.clips.map((clip) => (
          <ClipLoop key={clip.id} clip={clip} />
        ))}
      </section>
      <section aria-labelledby="raw-title">
        <h2 id="raw-title">{t.showcase.raw}</h2>
        <pre tabIndex={0}>{JSON.stringify({ parcel: evaluation.parcel, month: current }, null, 2)}</pre>
      </section>
    </>
  );
}

function DeferredStage({ evaluation }: { evaluation: Evaluation }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const last = evaluation.timeline.length - 1;

  useEffect(() => {
    function handleArrowKeys(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      ) {
        return;
      }
      if (target instanceof HTMLElement && target.closest("[data-zoom-controls]")) {
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setIndex((value) => Math.max(0, value - 1));
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setIndex((value) => Math.min(last, value + 1));
      }
    }
    window.addEventListener("keydown", handleArrowKeys);
    return () => window.removeEventListener("keydown", handleArrowKeys);
  }, [last]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { threshold: 0.01 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} aria-label="Experiencia del globo">
      {visible ? (
        <Stage evaluation={evaluation} index={index} setIndex={setIndex} />
      ) : (
        <p role="status">El lienzo y los clips se cargarán al llegar a esta sección.</p>
      )}
    </section>
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
        <EvaluationGate state={state}>
          {(evaluation) => <DeferredStage evaluation={evaluation} />}
        </EvaluationGate>
      </main>
    </div>
  );
}
