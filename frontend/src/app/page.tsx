"use client";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { MissionShell } from "./_components/MissionShell";
import { FieldFilm } from "./_components/PresentationLab";
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
          <div className="present-actions">
            <Link className="button primary" href="/presentacion/campo">
              {tr("Explorar el caso real", "Explore the live case")} ↗
            </Link>
            <Link className="button" href="/presentacion/modelos/3">
              {tr("Entrar a los modelos", "Enter the models")} →
            </Link>
          </div>
          <Link
            data-guide-id="home.start"
            className="mission-text-link"
            href="/tool"
          >
            {tr("Abrir herramienta del agricultor", "Open the farmer tool")} ↗
          </Link>
        </div>
        <div
          className="mission-planet"
          role="img"
          aria-label={tr(
            "Ilustración orbital de la Tierra. No representa una medición.",
            "Orbital illustration of Earth. Not a measurement.",
          )}
        >
          <svg viewBox="0 0 700 700" aria-hidden="true">
            <defs>
              <radialGradient id="earth-limb" cx="72%" cy="24%">
                <stop offset="0" stopColor="#536372" />
                <stop offset=".5" stopColor="#17232e" />
                <stop offset="1" stopColor="#080b10" />
              </radialGradient>
              <clipPath id="earth-disc">
                <circle cx="350" cy="350" r="244" />
              </clipPath>
            </defs>
            <circle
              cx="350"
              cy="350"
              r="245"
              fill="url(#earth-limb)"
              stroke="#4b5965"
            />
            <g
              clipPath="url(#earth-disc)"
              fill="none"
              stroke="#8b9ba9"
              strokeOpacity=".25"
            >
              <ellipse cx="350" cy="350" rx="120" ry="244" />
              <ellipse cx="350" cy="350" rx="205" ry="244" />
              <ellipse cx="350" cy="350" rx="244" ry="85" />
              <ellipse cx="350" cy="350" rx="244" ry="185" />
              <path d="M106 350h488M350 106v488" />
            </g>
            <ellipse
              cx="350"
              cy="350"
              rx="322"
              ry="94"
              transform="rotate(-26 350 350)"
              fill="none"
              stroke="#b6c4cf"
              strokeWidth="1"
            />
            <circle cx="622" cy="215" r="4" fill="#e2e8ed" />
            <path
              d="M590 208h60m-30-30v60"
              stroke="#9aaab8"
              strokeOpacity=".45"
            />
          </svg>
          <span className="mission-planet-caption">
            {tr(
              "Observación terrestre / ilustración",
              "Earth observation / illustration",
            )}
          </span>
        </div>
      </section>
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
