"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteHeader } from "@/lib/components/SiteHeader";
import { useI18n } from "@/lib/i18n";
import { STEPS } from "./_components/steps";

export default function ToolLayout({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname().replace(/\/$/, "") || "/tool";
  const index = Math.max(
    0,
    STEPS.findIndex((step) => step.href === pathname),
  );
  const previous = STEPS[index - 1];
  const next = STEPS[index + 1];

  return (
    <>
      <SiteHeader />
      <nav className="step-nav" aria-label={t.tool.stepsLabel}>
        <ol>
          {STEPS.map((step, i) => (
            <li key={step.key}>
              <Link href={step.href} aria-current={i === index ? "step" : undefined}>
                <span aria-hidden="true">{i + 1}.</span>
                {t.tool.steps[step.key].name}
              </Link>
            </li>
          ))}
        </ol>
      </nav>
      <main id="contenido" tabIndex={-1} className="page">
        <p>{t.tool.stepOf(index + 1, STEPS.length)}</p>
        {children}
        <nav className="pager" aria-label={`${t.tool.previous} / ${t.tool.next}`}>
          {previous ? (
            <Link className="button" href={previous.href} rel="prev">
              ← {t.tool.previous}: {t.tool.steps[previous.key].name}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link className="button primary" href={next.href} rel="next">
              {t.tool.next}: {t.tool.steps[next.key].name} →
            </Link>
          )}
        </nav>
      </main>
    </>
  );
}
