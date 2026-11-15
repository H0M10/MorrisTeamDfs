"use client";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { ChallengeMap, NasaChallenge, OptionalCoverage } from "../../_components/LandingSections";
export default function Page() {
  const { lang } = useI18n();
  const tr = (es: string, en: string) => (lang === "en" ? en : es);
  return (
    <>
    <div className="mission-chapter present-shell present-section">
      <p className="mission-designation">
        01 / Field Shift: Adapting Farms with NASA Data
      </p>
      <h1>
        {tr(
          "Una decisión agrícola, respaldada por observaciones.",
          "A farming decision, backed by observations.",
        )}
      </h1>
      <p className="mission-chapter-lead">
        {tr(
          "El reto propone combinar datos de la NASA, suelo local, rasgos de cultivo y prioridades del agricultor para explorar rotaciones que cuiden el suelo y se adapten al agua y al clima.",
          "The challenge proposes combining NASA data, local soil, crop traits and farmer priorities to explore rotations that protect soil and adapt to water and climate conditions.",
        )}
      </p>
    </div>
      <NasaChallenge />
      <ChallengeMap />
      <OptionalCoverage />
    <div className="mission-chapter present-shell present-section">
      <h2>
        {tr(
          "Cómo responde nuestro proyecto a la rúbrica",
          "How the project addresses the rubric",
        )}
      </h2>
      <div className="mission-rubric">
        {[
          [
            "Impacto",
            "Impact",
            "Pensada para todos los que deciden en el campo: los 212 714 regantes de Estados Unidos y sus técnicos, en un teléfono, gratis, en español e inglés, por voz y con lector de pantalla. Funciona hoy en cualquier campo de los 48 estados contiguos.",
            "Built for everyone who decides in the field: the 212,714 irrigators in the United States and their advisers, on a phone, free, in English and Spanish, by voice and with screen readers. It already works on any field in the 48 contiguous states.",
          ],
          [
            "Innovación",
            "Innovation",
            "Una herramienta que dice de dónde sale cada cifra y publica incluso el modelo que pierde. Las restricciones del agricultor van antes que cualquier recomendación, y un tutor animado explica cada pantalla y deja llenar todo hablando.",
            "A tool that shows where every number comes from and publishes even the model that loses. The farmer's constraints come before any recommendation, and an animated tutor explains each screen and lets you fill everything in by voice.",
          ],
          [
            "Viabilidad",
            "Feasibility",
            "Aplicación funcionando en vivo: motor físico FAO-56 y cinco modelos entrenados con 1 138 campos de seis valles, medidos en un valle que nunca vieron y comparados con su línea base. Corre en CPU, sin servidores costosos.",
            "A live, working application: an FAO-56 physical engine and five models trained on 1,138 fields in six valleys, measured on a valley they never saw and compared with their baseline. Runs on CPU, without costly servers.",
          ],
          [
            "Respuesta al reto",
            "Challenge alignment",
            "Responde a cada punto del reto: observaciones de la NASA, suelo, rasgos de cultivo y prioridades del agricultor se convierten en tres rotaciones comparadas, incluida la actual, cada una con por qué se sugiere, evidencia, beneficios, información que falta y riesgos para revisión local. Además señala cuándo queda el suelo sin cubrir y qué meses son más vulnerables.",
            "Answers every point of the challenge: NASA observations, soil, crop traits and farmer priorities become three compared rotations, including the current one, each with why it is suggested, evidence, benefits, missing information and risks for local review. It also shows when the soil is left uncovered and which months are most vulnerable.",
          ],
        ].map(([a, b, c, d]) => (
          <article key={a}>
            <h3>{tr(a!, b!)}</h3>
            <p>{tr(c!, d!)}</p>
          </article>
        ))}
      </div>
      <p className="present-note">
        {tr(
          "El diseño centrado en el agricultor aparece explícitamente en las consideraciones del reto. Una visualización es útil cuando permite interpretar la evidencia y sus límites; la herramienta apoya el juicio local.",
          "Farmer-centered design appears explicitly in the challenge considerations. A visualization is useful when it helps people interpret evidence and its limits; the tool supports local judgment.",
        )}
      </p>
      <Link className="button primary" href="/presentacion/campo">
        {tr("Ver una decisión real", "Explore a real decision")} →
      </Link>
    </div>
    </>
  );
}
