"use client";

import { useEffect, useRef, useState } from "react";
import type { ShowcaseClip } from "../_lib/showcaseConfig";

type ClipState = "idle" | "pending" | "ready";

function clipPath(fileName: string): string | null {
  if (!/^[\w.-]+$/.test(fileName) || fileName.startsWith(".")) return null;
  return `/clips/${encodeURIComponent(fileName)}`;
}

async function exists(fileName: string, signal: AbortSignal): Promise<boolean> {
  const response = await fetch(
    `/showcase/clip-status/${encodeURIComponent(fileName)}`,
    { signal },
  );
  if (!response.ok) {
    throw new Error(`Could not check clip availability (${response.status}).`);
  }
  const result = (await response.json()) as { exists?: unknown };
  if (typeof result.exists !== "boolean") {
    throw new Error("The clip availability response is invalid.");
  }
  return result.exists;
}

export function ClipLoop({ clip }: { clip: ShowcaseClip }) {
  const figureRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<ClipState>("idle");
  const [checkError, setCheckError] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const titleId = `${clip.id}-title`;
  const descriptionId = `${clip.id}-description`;
  const src = clipPath(clip.fileName);
  const poster = clipPath(clip.posterFileName);

  useEffect(() => {
    const target = figureRef.current;
    if (!target || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { threshold: 0.1 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!visible || !src || !poster) return;
    const controller = new AbortController();
    void Promise.all([
      exists(clip.fileName, controller.signal),
      exists(clip.posterFileName, controller.signal),
    ]).then(
      ([clipExists, posterExists]) => {
        if (!controller.signal.aborted) {
          setState(clipExists && posterExists ? "ready" : "pending");
        }
      },
      () => {
        if (controller.signal.aborted) return;
        setState("pending");
        setCheckError("No se pudo comprobar si el clip está disponible.");
      },
    );
    return () => controller.abort();
  }, [clip.fileName, clip.posterFileName, poster, src, visible]);

  return (
    <figure ref={figureRef} aria-labelledby={titleId}>
      <figcaption>
        <h3 id={titleId}>{clip.title}</h3>
        <p id={descriptionId}>{clip.description}</p>
      </figcaption>
      {state === "ready" && src && poster ? (
        <video
          aria-describedby={descriptionId}
          autoPlay={!reducedMotion}
          loop
          muted
          playsInline
          preload="none"
          poster={poster}
          src={src}
        />
      ) : (
        <>
          <p role="status" data-testid={`clip-status-${clip.id}`}>
            {state === "pending" ? "Clip pendiente" : "Comprobando clip…"}
          </p>
          {checkError && <p role="alert">{checkError}</p>}
        </>
      )}
    </figure>
  );
}
