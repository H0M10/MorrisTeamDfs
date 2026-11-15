"use client";
// Portada de presentación de Field Shift (NASA Space Apps Challenge 2026).
// Integra el cerebro 3D interactivo del Modelo 3, espacios listos para clips reales
// de Higgsfield AI y la entrada directa a la herramienta del agricultor (/campo).
import Link from "next/link";
import { SiteHeader } from "@/lib/components/SiteHeader";
import { useI18n } from "@/lib/i18n";
import { HiggsfieldSlots } from "./_components/HiggsfieldSlots";
import { NeuralNetShowcase } from "./_components/NeuralNetShowcase";
import "./portada.css";

export default function HomePage() {
  const { t, lang } = useI18n();
  const h = t.home;
  const l = t.landing;

  return (
    <>
      <SiteHeader />
      <main id="contenido" tabIndex={-1} className="landing-main">
        {/* 1. Hero de presentación + acceso inmediato al flujo guiado */}
        <section className="landing-hero" aria-labelledby="hero-heading">
          <div className="landing-inner">
            <p className="landing-eyebrow">{l.eyebrow}</p>
            <h1 id="hero-heading" className="home-title">
              {h.tagline}
            </h1>
            <p className="home-lead not-plain">{h.lead}</p>
            <p className="home-lead only-plain">{h.leadPlain}</p>

            <div className="home-actions">
              <Link
                href="/tool"
                className="button primary home-cta"
                data-guide-id="home.start"
              >
                {h.cta}
              </Link>
              <a href="#red-neuronal" className="button landing-secondary">
                {l.exploreNeural}
              </a>
              <Link href="/showcase" className="button landing-secondary">
                {h.secondary}
              </Link>
            </div>

            <div className="landing-facts">
              <p>{h.coverage}</p>
              <p>{h.trust}</p>
            </div>

            <ul className="landing-pillars" aria-label={l.heroLeadAlt}>
              {l.pillars.map((pillar) => (
                <li key={pillar.title} className="landing-pillar">
                  <span className="landing-pillar-tag">{pillar.tag}</span>
                  <strong>{pillar.title}</strong>
                  <p>{pillar.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 2. Red neuronal 3D funcional conectada a los datos del Modelo 3 */}
        <div className="landing-band-dark">
          <div className="landing-inner">
            <NeuralNetShowcase />
          </div>
        </div>

        {/* 3. Storyboard / Slots cinematográficos para Higgsfield AI */}
        <div className="landing-band-clips">
          <div className="landing-inner">
            <HiggsfieldSlots />
          </div>
        </div>

        {/* 4. Flujo guiado en 4 pasos + Arquitectura transparente */}
        <section className="landing-band-light" aria-labelledby="how-heading">
          <div className="landing-inner">
            <h2 id="how-heading">{h.howTitle}</h2>
            <ol className="home-how" data-guide-id="home.steps">
              {h.how.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>

            <h2>{l.architecture.title}</h2>
            <div className="landing-arch-grid">
              {l.architecture.cards.map((card) => (
                <article key={card.title} className="landing-arch-card">
                  <span className="landing-arch-prov">{card.provenance}</span>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 5. Cierre con entrada directa + enlaces técnicos */}
        <section className="landing-entry" aria-labelledby="entry-heading">
          <div className="landing-inner landing-entry-row">
            <div>
              <h2 id="entry-heading">{l.enterBanner.title}</h2>
              <p>{l.enterBanner.lead}</p>
            </div>
            <div className="home-actions">
              <Link href="/tool" className="button primary home-cta">
                {l.enterBanner.primary}
              </Link>
              <Link href="/showcase" className="button">
                {l.enterBanner.secondary}
              </Link>
            </div>
          </div>
          <nav className="landing-inner home-more" aria-label={h.moreLabel}>
            <Link href="/accesibilidad">{h.accessibility}</Link>
            <Link href="/showcase">{h.secondary}</Link>
            <Link href="/engineer">{h.engineer}</Link>
            <Link href="/remote">
              {lang === "en" ? "Phone remote" : "Control QR"}
            </Link>
          </nav>
        </section>
      </main>
    </>
  );
}
