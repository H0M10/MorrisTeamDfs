"use client";
// Espacios listos para animaciones realistas generadas con Higgsfield AI.
// Al guardar los archivos .mp4 o .webm en frontend/public/clips/, se activan automáticamente
// respetando prefers-reduced-motion y declarando siempre que son ilustración visual.
import { useEffect, useState, useSyncExternalStore } from "react";
import { prefersReducedMotion } from "@/lib/a11y/motion";
import { useA11y } from "@/lib/a11y/profile";
import { useI18n } from "@/lib/i18n";

interface ResolvedMedia {
  mp4: boolean;
  webm: boolean;
  posterWebp: boolean;
  posterJpg: boolean;
}

const INITIAL_MEDIA: ResolvedMedia = {
  mp4: false,
  webm: false,
  posterWebp: false,
  posterJpg: false,
};

function subscribeReduced(cb: () => void) {
  if (typeof window === "undefined" || !("matchMedia" in window)) return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

async function probeClipFile(filename: string): Promise<boolean> {
  try {
    const res = await fetch(`/showcase/clip-status/${encodeURIComponent(filename)}`);
    if (!res.ok) return false;
    const body = (await res.json()) as { exists?: boolean };
    return Boolean(body.exists);
  } catch {
    return false;
  }
}

function StoryboardArtwork({ index }: { index: number }) {
  // Ilustración geométrica minimalista (sin cifras) mientras llega el render de Higgsfield.
  if (index === 0) {
    return (
      <svg
        className="hf-svg"
        viewBox="0 0 640 360"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <radialGradient id="hf-g0" cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#0f172a" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#050811" stopOpacity="1" />
          </radialGradient>
        </defs>
        <rect width="640" height="360" fill="url(#hf-g0)" />
        <ellipse
          cx="320"
          cy="195"
          rx="230"
          ry="72"
          fill="none"
          stroke="#93c5fd"
          strokeOpacity="0.45"
          strokeDasharray="6 6"
          strokeWidth="2"
        />
        <circle cx="320" cy="195" r="56" fill="none" stroke="#e9b824" strokeWidth="2.5" strokeOpacity="0.85" />
        <circle cx="320" cy="195" r="24" fill="#2f7d32" fillOpacity="0.7" />
        <circle cx="485" cy="138" r="7" fill="#fef08a" />
      </svg>
    );
  }
  if (index === 1) {
    return (
      <svg
        className="hf-svg"
        viewBox="0 0 640 360"
        aria-hidden="true"
        focusable="false"
      >
        <rect width="640" height="360" fill="#080d16" />
        <rect x="0" y="185" width="640" height="175" fill="#5a4632" fillOpacity="0.48" />
        <path
          d="M0 185 Q160 165 320 185 T640 185"
          fill="none"
          stroke="#2f7d32"
          strokeWidth="4"
        />
        <path
          d="M180 185 C180 235 140 265 130 315 M320 185 C320 245 305 280 295 335 M460 185 C460 235 495 270 505 320"
          fill="none"
          stroke="#93c5fd"
          strokeWidth="2.5"
          strokeOpacity="0.7"
        />
      </svg>
    );
  }
  return (
    <svg
      className="hf-svg"
      viewBox="0 0 640 360"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="640" height="360" fill="#0b1120" />
      <circle cx="515" cy="88" r="36" fill="#e9b824" fillOpacity="0.35" />
      <path d="M0 265 L640 235 L640 360 L0 360 Z" fill="#2f7d32" fillOpacity="0.35" />
      <rect x="240" y="130" width="160" height="110" rx="6" fill="#ffffff" fillOpacity="0.92" />
      <line x1="262" y1="160" x2="378" y2="160" stroke="#1247b8" strokeWidth="5" />
      <line x1="262" y1="184" x2="352" y2="184" stroke="#000000" strokeOpacity="0.7" strokeWidth="4" />
      <line x1="262" y1="206" x2="368" y2="206" stroke="#2f7d32" strokeWidth="4" />
    </svg>
  );
}

function HiggsfieldCard({
  stem,
  title,
  sceneNote,
  spec,
  index,
  reducedMotion,
}: {
  stem: string;
  title: string;
  sceneNote: string;
  spec: string;
  index: number;
  reducedMotion: boolean;
}) {
  const { t } = useI18n();
  const c = t.landing.clips;
  const [media, setMedia] = useState<ResolvedMedia>(INITIAL_MEDIA);

  useEffect(() => {
    let alive = true;
    Promise.all([
      probeClipFile(`${stem}.mp4`),
      probeClipFile(`${stem}.webm`),
      probeClipFile(`${stem}-poster.webp`),
      probeClipFile(`${stem}-poster.jpg`),
    ]).then(([mp4, webm, posterWebp, posterJpg]) => {
      if (alive) setMedia({ mp4, webm, posterWebp, posterJpg });
    });
    return () => {
      alive = false;
    };
  }, [stem]);

  const hasVideo = media.mp4 || media.webm;
  const poster = media.posterWebp
    ? `/clips/${stem}-poster.webp`
    : media.posterJpg
      ? `/clips/${stem}-poster.jpg`
      : undefined;

  return (
    <article className="hf-card">
      <div className="hf-stage">
        {hasVideo ? (
          <video
            className="hf-video"
            controls
            loop
            muted
            playsInline
            autoPlay={!reducedMotion}
            preload="metadata"
            poster={poster}
            aria-label={title}
          >
            {media.webm && <source src={`/clips/${stem}.webm`} type="video/webm" />}
            {media.mp4 && <source src={`/clips/${stem}.mp4`} type="video/mp4" />}
          </video>
        ) : (
          <div className="hf-placeholder">
            <StoryboardArtwork index={index} />
            <div className="hf-placeholder-label">
              <span className="hf-status-pill">{c.pendingLabel}</span>
              <code>frontend/public/clips/{stem}.mp4</code>
              <span className="hf-spec">{spec}</span>
            </div>
          </div>
        )}
      </div>

      <div className="hf-body">
        <p className="hf-honesty">{c.badge}</p>
        <h3>{title}</h3>
        <p>{sceneNote}</p>
        {hasVideo && <p className="hf-ready">{c.readyLabel}</p>}
      </div>
    </article>
  );
}

export function HiggsfieldSlots() {
  const { t } = useI18n();
  const c = t.landing.clips;
  const { profile } = useA11y();
  const sysReduced = useSyncExternalStore(
    subscribeReduced,
    () => prefersReducedMotion(),
    () => false,
  );
  const reducedMotion = sysReduced || profile.reduceMotion;

  return (
    <section
      id="animaciones"
      className="hf-section"
      aria-labelledby="hf-heading"
    >
      <div className="hf-head">
        <h2 id="hf-heading">{c.title}</h2>
        <p>{c.lead}</p>
      </div>
      <div className="hf-grid">
        {c.items.map((item, idx) => (
          <HiggsfieldCard
            key={item.stem}
            stem={item.stem}
            title={item.title}
            sceneNote={item.sceneNote}
            spec={item.spec}
            index={idx}
            reducedMotion={reducedMotion}
          />
        ))}
      </div>
    </section>
  );
}
