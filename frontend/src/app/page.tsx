"use client";

import Link from "next/link";
import { SiteHeader } from "@/lib/components/SiteHeader";
import { useI18n } from "@/lib/i18n";
import { PresentationLab, FieldFilm } from "./_components/PresentationLab";
import "./portada.css";
import "./presentation.css";

export default function HomePage() {
  const { lang } = useI18n();
  const en = lang === "en";
  const tr = (es: string, english: string) => en ? english : es;
  return <>
    <SiteHeader />
    <main id="contenido" tabIndex={-1} className="presentation">
      <section className="present-hero" aria-labelledby="present-title">
        <div className="present-shell">
          <p className="present-kicker">The CSC · NASA Space Apps Challenge 2026</p>
          <div className="present-hero-grid">
            <div>
              <p className="present-index">Field Shift / Adapting Farms with NASA Data</p>
              <h1 id="present-title">{tr("El agua cambia.", "Water changes.")}<br /><em>{tr("Tu decisión también.", "Your decision can, too.")}</em></h1>
              <p className="present-lead">{tr("De los datos de la NASA a tres rotaciones que puedes comparar, cuestionar y revisar con tu técnico.", "From NASA data to three crop rotations you can compare, question and review with a local adviser.")}</p>
              <div className="present-actions">
                <a className="button primary" href="#campo-real">{tr("Explorar un campo real", "Explore a real field")} ↓</a>
                <Link className="button" data-guide-id="home.start" href="/tool">{tr("Abrir la herramienta", "Open the farmer tool")} ↗</Link>
              </div>
            </div>
            <div className="present-orbit" aria-label={tr("Ilustración de un pivote de riego y sus órbitas de observación", "Illustration of an irrigation pivot and observation orbits")} role="img">
              <div className="orbit-ring orbit-a" /><div className="orbit-ring orbit-b" /><div className="orbit-field"><span /></div>
              <span className="orbit-caption">{tr("Observar → comprender → decidir", "Observe → understand → decide")}</span>
            </div>
          </div>
          <div className="present-brief">
            <p><strong>{tr("El desafío", "The challenge")}</strong>{tr("Combinar observación terrestre, suelo, cultivos y prioridades del agricultor para explorar rotaciones resilientes.", "Combine Earth observations, soil, crop traits and farmer priorities to explore resilient rotations.")}</p>
            <p><strong>{tr("Nuestra respuesta", "Our response")}</strong>{tr("Restricciones verificables, tres opciones y una ficha que dice qué sabemos y qué falta.", "Checkable constraints, three options and an evidence card that states what we know and what is missing.")}</p>
          </div>
        </div>
      </section>
      <nav className="present-nav" aria-label={tr("Recorrido de la presentación", "Presentation chapters")}>
        <div className="present-shell">{[
          ["campo-real", "01 / La decisión", "01 / The decision"],
          ["modelos", "02 / La ciencia", "02 / The science"],
          ["personas", "03 / Las personas", "03 / The people"],
          ["limites", "04 / La evidencia", "04 / The evidence"],
        ].map(([id, es, english]) => <a key={id} href={`#${id}`}>{tr(es!, english!)}</a>)}</div>
      </nav>
      <PresentationLab />
      <FieldFilm />
      <section id="personas" className="present-shell present-section" aria-labelledby="people-title">
        <p className="present-kicker">03 / {tr("Diseñada para quien decide", "Designed for the decision maker")}</p>
        <h2 id="people-title">{tr("La ciencia sirve cuando se puede usar.", "Science matters when people can use it.")}</h2>
        <p className="present-lead">{tr("El reto pide una herramienta comprensible para agricultores sin experiencia geoespacial. Ese es nuestro criterio de diseño.", "The challenge calls for a tool farmers can understand without geospatial expertise. That is our design criterion.")}</p>
        <ol className="present-journey" data-guide-id="home.steps">{[
          ["Marca tu campo", "Mark your field"], ["Declara tus límites", "Declare your limits"],
          ["Compara tres rotaciones", "Compare three rotations"], ["Revisa con tu técnico", "Review with your adviser"],
        ].map(([es, english], i) => <li key={es}><span>0{i + 1}</span>{tr(es!, english!)}</li>)}</ol>
        <div className="present-inclusion">
          <article><h3>{tr("Más formas de participar", "More ways to participate")}</h3><p>{tr("Teclado, tablas alternativas, español e inglés, letra ampliable, modo sol, menos movimiento y voz con alternativa escrita.", "Keyboard navigation, alternative tables, Spanish and English, larger text, sunlight mode, reduced motion and voice with text alternatives.")}</p><Link href="/accesibilidad">{tr("Qué probamos y qué falta", "What we tested and what remains")} ↗</Link></article>
          <article><h3>{tr("Un tutor para comprender", "A tutor for understanding")}</h3><p>{tr("La Guía explica la pantalla y los términos. Las reglas locales permiten navegar; la IA puede redactar y sus respuestas se validan. Las cifras vienen de los datos y del motor.", "The Guide explains screens and terms. Local rules support navigation; AI can phrase answers, which are validated. Figures come from data and the engine.")}</p><Link href="/tool">{tr("Probar la Guía en la herramienta", "Try the Guide in the tool")} ↗</Link></article>
        </div>
        <p className="present-note">{tr("Diseñamos compatibilidad para personas ciegas mediante teclado y contenido textual. La validación manual con lector de pantalla y usuarios sigue pendiente; la voz por sí sola no demuestra accesibilidad completa.", "We support blind users through keyboard access and textual content. Manual screen-reader and user validation remains pending; voice alone does not establish full accessibility.")}</p>
      </section>
      <section id="limites" className="present-evidence" aria-labelledby="limits-title"><div className="present-shell present-section">
        <p className="present-kicker">04 / {tr("Resultados con límites", "Evidence with limits")}</p>
        <h2 id="limits-title">{tr("También mostramos lo que no sabemos.", "We also show what we do not know.")}</h2>
        <div className="present-inclusion"><article><h3>{tr("Impacto que buscamos", "Our intended impact")}</h3><p>{tr("Ayudar al agricultor de riego y a su técnico a descartar opciones inviables y discutir alternativas con evidencia. Hoy el alcance son los Estados Unidos contiguos; no hemos demostrado ahorros de agua ni mejoras de rendimiento en fincas.", "Help irrigated farmers and advisers reject infeasible options and discuss evidence-backed alternatives. Current scope is the contiguous United States; farm-level water savings and yield improvements have not been demonstrated.")}</p></article>
        <article><h3>{tr("Validación y próximos pasos", "Validation and next steps")}</h3><p>{tr("Separamos por valle y mostramos la línea base, incluso cuando gana. En los modelos 1 y 3 el último año selecciona el modelo; en el 4 falta una prueba temporal independiente. Falta validar las decisiones con agricultores y técnicos.", "We split by valley and report baselines, even when they win. Models 1 and 3 use the last year for model selection; Model 4 still needs an independent temporal test. Decisions need validation with farmers and advisers.")}</p></article></div>
        <div className="present-sources"><h3>{tr("Datos con nombre y escala", "Named sources, explicit scales")}</h3><p>NASA HLS · 30 m / NASA POWER · ~50 km / NASA SMAP · 9 km / NASA SRTM · 30 m</p><p>OpenET · 30 m / USDA CDL · 30 m / SoilGrids · 250 m</p><p>{tr("POWER y SMAP describen el contexto regional. Google Dynamic World aparece como lectura externa y no cambia la evaluación.", "POWER and SMAP describe regional context. Google Dynamic World is an external reading and does not alter the evaluation.")}</p></div>
        <div className="present-actions"><a className="button primary" href="https://github.com/H0M10/MorrisTeamDfs">{tr("Código y fichas de modelos", "Code and model cards")} ↗</a><Link className="button" href="/engineer">{tr("Abrir modo ingeniero", "Open engineer view")} ↗</Link><a href="https://morristeamdfs-production.up.railway.app/docs">API ↗</a></div>
        <p>{tr("Equipo The CSC · Hanniel · Checo · Gicarrillo · Alexis", "Team The CSC · Hanniel · Checo · Gicarrillo · Alexis")}</p><p className="present-note">{tr("Uso de IA: asistencia para código y documentación, tutor con respuestas validadas e ilustración audiovisual opcional. Los modelos estadísticos y el motor producen las estimaciones; el modelo de lenguaje no genera cifras agronómicas. Registro en AI_USAGE.md.", "AI use: coding and documentation assistance, a tutor with validated answers, and optional audiovisual illustration. Statistical models and the engine produce estimates; the language model does not generate agronomic figures. Disclosure in AI_USAGE.md.")}</p>
      </div></section>
    </main>
  </>;
}
