"use client";
// Portada (PLAN_DOMINGO P1-4): la frase, "Analiza tu campo" y "Ver presentación".
// Sin cifras: la portada no muestra datos, solo lleva a la herramienta.
import Link from "next/link";
import { SiteHeader } from "@/lib/components/SiteHeader";
import { useI18n } from "@/lib/i18n";
import "./portada.css";

export default function HomePage() {
  const { t } = useI18n();
  const h = t.home;
  return (
    <>
      <SiteHeader />
      <main id="contenido" tabIndex={-1} className="page home">
        <h1 className="home-title">{h.tagline}</h1>
        <p className="home-lead not-plain">{h.lead}</p>
        <p className="home-lead only-plain">{h.leadPlain}</p>
        <div className="home-actions">
          <Link href="/campo" className="button primary home-cta" data-guide-id="home.start">
            {h.cta}
          </Link>
          <Link href="/showcase" className="button">
            {h.secondary}
          </Link>
        </div>
        <p className="home-coverage">{h.coverage}</p>

        <h2>{h.howTitle}</h2>
        <ol className="home-how" data-guide-id="home.steps">
          {h.how.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="home-trust">{h.trust}</p>
      </main>
      <footer className="home-footer">
        <nav aria-label={h.moreLabel}>
          <ul>
            <li>
              <Link href="/accesibilidad">{h.accessibility}</Link>
            </li>
            <li>
              <Link href="/engineer">{h.engineer}</Link>
            </li>
          </ul>
        </nav>
      </footer>
    </>
  );
}
