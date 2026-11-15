"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { MissionShell } from "./_components/MissionShell";
import { FieldFilm } from "./_components/PresentationLab";
import { ImpactScale, ProblemNote } from "./_components/LandingSections";
const HeroMap = dynamic(() => import("./_components/HeroMap"), { ssr: false });

export default function HomePage() {
  const { lang } = useI18n();
  const tr = (es: string, en: string) => (lang === "en" ? en : es);
  return (
    <MissionShell>
      <section className="mission-home" aria-labelledby="mission-title">
        <div className="mission-home-copy">
          <p className="mission-designation">
            {tr(
              "NASA Space Apps Challenge 2026 · Equipo The CSC",
              "NASA Space Apps Challenge 2026 · Team The CSC",
            )}
          </p>
          <h1 id="mission-title">Field Shift</h1>
          <p className="landing-tagline">
            {tr(
              "Una herramienta de apoyo a la decisión para elegir la siguiente rotación de cultivos con datos de la NASA, el suelo del campo y lo que el agricultor puede y quiere hacer.",
              "A decision-support tool to choose the next crop rotation with NASA data, the field's soil and what the farmer can and wants to do.",
            )}
          </p>
          <p className="landing-small">
            {tr(
              "Reto: «Field Shift: Adapting Farms with NASA Data». Caso de prueba: Diamond Valley, Nevada.",
              "Challenge: “Field Shift: Adapting Farms with NASA Data”. Test case: Diamond Valley, Nevada.",
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
      <ImpactScale compact />
      <section
        className="mission-directory"
        aria-label={tr("Explorar la presentación", "Explore the presentation")}
      >
        {[
          ["01", "/presentacion/reto", "El reto", "The challenge", "Lo que pide la NASA y dónde verlo en la herramienta.", "What NASA asks and where to see it in the tool."],
          ["02", "/presentacion/campo", "El caso real", "The live case", "El valle que se queda sin agua, un campo y tres rotaciones.", "The valley running out of water, one field and three rotations."],
          ["03", "/presentacion/metodo", "El método", "The method", "Los datos de la NASA y la matemática de cada paso.", "The NASA data and the mathematics of each step."],
          ["04", "/presentacion/modelos/3", "Los modelos", "The models", "Cinco modelos. Una visualización para cada uno.", "Five models. A visualization for each."],
          ["05", "/presentacion/personas", "Las personas", "The people", "Por qué fallan las herramientas agrícolas y cómo la hicimos usable.", "Why farm tools fail and how we made it usable."],
          ["06", "/presentacion/evidencia", "La evidencia", "The evidence", "Resultados medidos contra su línea base, y sus límites.", "Results measured against their baseline, and their limits."],
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
