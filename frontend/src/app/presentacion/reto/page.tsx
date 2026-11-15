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
            "Apoyar la decisión de agricultores de riego y técnicos en Estados Unidos. Aún no medimos ahorro real ni mejoras de cosecha en finca.",
            "Support irrigated farmers and advisers in the US. Actual farm water savings and yield improvements have not yet been measured.",
          ],
          [
            "Innovación",
            "Innovation",
            "Restricciones antes de ordenar opciones, trazabilidad por cifra, tutor con respuestas validadas y revisión del técnico.",
            "Constraints before ranking, provenance per figure, a tutor with validated answers and adviser review.",
          ],
          [
            "Viabilidad",
            "Feasibility",
            "Motor FAO-56, artefactos XGBoost y ONNX en CPU, métricas por valle no visto y aplicación funcional.",
            "FAO-56 engine, XGBoost and ONNX artifacts on CPU, metrics on an unseen valley and a working application.",
          ],
          [
            "Respuesta al reto",
            "Challenge alignment",
            "Observación terrestre + suelo + cultivos + prioridades → tres rotaciones y sus cinco apartados de evidencia.",
            "Earth observation + soil + crops + priorities → three rotations and five evidence sections each.",
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
