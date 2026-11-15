"use client";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
export function PeopleChapter() {
  const { lang } = useI18n();
  const tr = (es: string, en: string) => (lang === "en" ? en : es);
  return (
    <>
      {" "}
      <section
        id="personas"
        className="present-shell present-section"
        aria-labelledby="people-title"
      >
        <p className="present-kicker">
          05 /{" "}
          {tr("Diseñada para quien decide", "Designed for the decision maker")}
        </p>
        <h2 id="people-title">
          {tr(
            "La ciencia sirve cuando se puede usar.",
            "Science matters when people can use it.",
          )}
        </h2>
        <p className="present-lead">
          {tr(
            "El reto pide una herramienta comprensible para agricultores sin experiencia geoespacial. Ese es nuestro criterio de diseño.",
            "The challenge calls for a tool farmers can understand without geospatial expertise. That is our design criterion.",
          )}
        </p>
        <ol className="present-journey" data-guide-id="home.steps">
          {[
            ["Marca tu campo", "Mark your field"],
            ["Declara tus límites", "Declare your limits"],
            ["Compara tres rotaciones", "Compare three rotations"],
            ["Revisa con tu técnico", "Review with your adviser"],
          ].map(([es, english], i) => (
            <li key={es}>
              <span>0{i + 1}</span>
              {tr(es!, english!)}
            </li>
          ))}
        </ol>
        <div className="present-inclusion">
          <article>
            <h3>
              {tr("Más formas de participar", "More ways to participate")}
            </h3>
            <p>
              {tr(
                "Teclado, tablas alternativas, español e inglés, letra ampliable, modo sol, menos movimiento y voz con alternativa escrita.",
                "Keyboard navigation, alternative tables, Spanish and English, larger text, sunlight mode, reduced motion and voice with text alternatives.",
              )}
            </p>
            <Link href="/accesibilidad">
              {tr(
                "Qué probamos y qué falta",
                "What we tested and what remains",
              )}{" "}
              ↗
            </Link>
          </article>
          <article>
            <h3>
              {tr("Un tutor para comprender", "A tutor for understanding")}
            </h3>
            <p>
              {tr(
                "La Guía explica la pantalla y los términos. Las reglas locales permiten navegar; la IA puede redactar y sus respuestas se validan. Las cifras vienen de los datos y del motor.",
                "The Guide explains screens and terms. Local rules support navigation; AI can phrase answers, which are validated. Figures come from data and the engine.",
              )}
            </p>
            <Link href="/tool">
              {tr(
                "Probar la Guía en la herramienta",
                "Try the Guide in the tool",
              )}{" "}
              ↗
            </Link>
          </article>
        </div>
        <p className="present-note">
          {tr(
            "Pensada para todos: se usa solo con teclado, es compatible con lectores de pantalla como VoiceOver, TalkBack y NVDA, se maneja por voz, con letra grande, modo sol y menos movimiento. Cada cambio pasa pruebas automáticas de accesibilidad WCAG 2.2.",
            "Built for everyone: it works with keyboard only, is compatible with screen readers such as VoiceOver, TalkBack and NVDA, works by voice, with large text, sun mode and reduced motion. Every change passes automated WCAG 2.2 accessibility tests.",
          )}
        </p>
      </section>
    </>
  );
}
export function EvidenceChapter() {
  const { lang } = useI18n();
  const tr = (es: string, en: string) => (lang === "en" ? en : es);
  return (
    <>
      {" "}
      <section
        id="limites"
        className="present-evidence"
        aria-labelledby="limits-title"
      >
        <div className="present-shell present-section">
          <p className="present-kicker">
            06 / {tr("Resultados con límites", "Evidence with limits")}
          </p>
          <h2 id="limits-title">
            {tr(
              "Resultados medidos, con su fuente.",
              "Measured results, with their source.",
            )}
          </h2>
          <div className="present-inclusion">
            <article>
              <h3>{tr("Impacto que buscamos", "Our intended impact")}</h3>
              <p>
                {tr(
                  "Que cada regante y su técnico descarten a tiempo lo que no cabe en su agua y discutan alternativas con evidencia. Hoy funciona en cualquier campo de los 48 estados contiguos de Estados Unidos.",
                  "Every irrigator and adviser can rule out early what does not fit their water and discuss alternatives with evidence. It works today on any field in the 48 contiguous United States.",
                )}
              </p>
            </article>
            <article>
              <h3>
                {tr("Validación y próximos pasos", "Validation and next steps")}
              </h3>
              <p>
                {tr(
                  "Cada modelo se mide en un valle que nunca vio y frente a su línea base, para que la cifra sea honesta. El siguiente paso es una prueba en campo con regantes y técnicos de Diamond Valley.",
                  "Every model is measured on a valley it never saw and against its baseline, so the number is honest. The next step is a field trial with irrigators and advisers in Diamond Valley.",
                )}
              </p>
            </article>
          </div>
          <div className="present-sources">
            <h3>
              {tr(
                "Datos con nombre y escala",
                "Named sources, explicit scales",
              )}
            </h3>
            <p>
              NASA HLS · 30 m / NASA POWER · ~50 km / NASA SMAP · 9 km / NASA
              SRTM · 30 m
            </p>
            <p>OpenET · 30 m / USDA CDL · 30 m / SoilGrids · 250 m</p>
            <p>
              {tr(
                "POWER y SMAP describen el contexto regional. Google Dynamic World aparece como lectura externa y no cambia la evaluación.",
                "POWER and SMAP describe regional context. Google Dynamic World is an external reading and does not alter the evaluation.",
              )}
            </p>
          </div>
          <div className="present-actions">
            <a
              className="button primary"
              href="https://github.com/H0M10/MorrisTeamDfs"
            >
              {tr("Código y fichas de modelos", "Code and model cards")} ↗
            </a>
            <Link className="button" href="/engineer">
              {tr("Abrir modo ingeniero", "Open engineer view")} ↗
            </Link>
            <a href="https://morristeamdfs-production.up.railway.app/docs">
              API ↗
            </a>
          </div>
          <p>
            {tr(
              "Equipo The CSC · Hanniel · Checo · Gicarrillo · Alexis",
              "Team The CSC · Hanniel · Checo · Gicarrillo · Alexis",
            )}
          </p>
          <p className="present-note">
            {tr(
              "Uso de IA: asistencia para código y documentación, tutor con respuestas validadas e ilustración audiovisual opcional. Los modelos estadísticos y el motor producen las estimaciones; el modelo de lenguaje no genera cifras agronómicas. Registro en AI_USAGE.md.",
              "AI use: coding and documentation assistance, a tutor with validated answers, and optional audiovisual illustration. Statistical models and the engine produce estimates; the language model does not generate agronomic figures. Disclosure in AI_USAGE.md.",
            )}
          </p>
        </div>
      </section>
    </>
  );
}
