"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { MissionShell } from "./_components/MissionShell";
import { FieldFilm } from "./_components/PresentationLab";
import {
  ChallengeMap,
  Differentiators,
  ModelProof,
  PeopleTest,
  ProblemNote,
} from "./_components/LandingSections";
const HeroMap = dynamic(() => import("./_components/HeroMap"), { ssr: false });

export default function HomePage() {
  const { lang } = useI18n();
  const tr = (es: string, en: string) => (lang === "en" ? en : es);
  return (
    <MissionShell>
      <section className="mission-home" aria-labelledby="mission-title">
        <div className="mission-home-copy">
          <p className="mission-designation">The CSC / Field Shift / 2026</p>
          <h1 id="mission-title">
            {tr("Observar la Tierra.", "Observe Earth.")}
            <br />
            {tr("Decidir en el campo.", "Decide in the field.")}
          </h1>
          <p>
            {tr(
              "Datos de la NASA, modelos medidos y límites reales del agricultor. Una herramienta para explorar qué sembrar después.",
              "NASA data, measured models and real farming constraints. A tool to explore what to plant next.",
            )}
          </p>
          <ProblemNote />
          <div className="present-actions">
            <Link className="button primary" href="/tool" data-guide-id="home.start">
              {tr("Analiza un campo que tú elijas", "Analyze a field you choose")} ↗
            </Link>
            <Link className="button" href="/presentacion/campo">
              {tr("Ver el caso real", "See the live case")} →
            </Link>
          </div>
          <p className="landing-small">
            {tr(
              "Análisis en vivo para cualquier campo de riego de los 48 estados contiguos de EE. UU., en menos de un minuto.",
              "Live analysis for any irrigated field in the 48 contiguous US states, in under a minute.",
            )}
          </p>
        </div>
        <figure className="landing-hero-figure">
          <HeroMap
            label={tr(
              "Imagen de satélite real de Diamond Valley, Nevada: campos circulares de riego en un valle árido.",
              "Real satellite image of Diamond Valley, Nevada: circular irrigated fields in an arid valley.",
            )}
          />
          <figcaption>
            {tr(
              "Diamond Valley, Nevada. Imagen de satélite real. Imágenes © Esri, Maxar, Earthstar Geographics.",
              "Diamond Valley, Nevada. Real satellite imagery. Imagery © Esri, Maxar, Earthstar Geographics.",
            )}
          </figcaption>
        </figure>
      </section>
      <div className="landing-sections">
        <Differentiators />
        <ModelProof />
        <ChallengeMap />
        <PeopleTest />
      </div>
      <section
        className="mission-directory"
        aria-label={tr("Explorar la presentación", "Explore the presentation")}
      >
        {[
          [
            "01",
            "/presentacion/reto",
            "La misión",
            "The mission",
            "Qué pide Field Shift y qué construimos.",
            "What Field Shift asks and what we built.",
          ],
          [
            "02",
            "/presentacion/campo",
            "La decisión",
            "The decision",
            "Una parcela, tres rotaciones y un escenario de agua.",
            "One parcel, three rotations and a water scenario.",
          ],
          [
            "03",
            "/presentacion/modelos/3",
            "Los modelos",
            "The models",
            "Cinco métodos. Una visualización para cada uno.",
            "Five methods. A visualization for each.",
          ],
          [
            "04",
            "/presentacion/evidencia",
            "La evidencia",
            "The evidence",
            "Resultados, fuentes y preguntas abiertas.",
            "Results, sources and open questions.",
          ],
        ].map(([num, href, es, en, desc, eng]) => (
          <Link key={num} href={href!}>
            <span>{num}</span>
            <strong>{tr(es!, en!)}</strong>
            <p>{tr(desc!, eng!)}</p>
            <span aria-hidden="true">↗</span>
          </Link>
        ))}
      </section>
      <FieldFilm />
    </MissionShell>
  );
}
