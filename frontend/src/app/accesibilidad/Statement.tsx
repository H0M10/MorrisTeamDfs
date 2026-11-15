"use client";
// Declaración de accesibilidad (PLAN_DOMINGO P1-4 y §6). Dice lo que se probó
// y lo que falta: "parcialmente conforme" hasta que pasen las pruebas manuales.
import Link from "next/link";
import { SiteHeader } from "@/lib/components/SiteHeader";
import { useI18n } from "@/lib/i18n";

const REPORT_URL = "https://github.com/H0M10/MorrisTeamDfs/issues/new";

function List({ items }: { items: readonly string[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function Statement() {
  const { t } = useI18n();
  const s = t.a11y.statement;
  return (
    <>
      <SiteHeader />
      <main id="contenido" tabIndex={-1} className="page">
        <h1>{s.title}</h1>
        <p className="not-plain">{s.lead}</p>
        <p className="only-plain">{s.leadPlain}</p>

        <h2>{s.statusTitle}</h2>
        <p className="not-plain">{s.status}</p>
        <p className="only-plain">{s.statusPlain}</p>
        <p>{s.scope}</p>
        <p>{s.date}</p>

        <h2>{s.doneTitle}</h2>
        <List items={s.done} />

        <h2>{s.profileTitle}</h2>
        <p>{s.profile}</p>

        <h2>{s.testedTitle}</h2>
        <List items={s.tested} />
        <h3>{s.pendingTitle}</h3>
        <List items={s.pending} />

        <h2>{s.atTitle}</h2>
        <List items={s.at} />

        <h2>{s.limitsTitle}</h2>
        <List items={s.limits} />

        <h2>{s.reportTitle}</h2>
        <p>{s.report}</p>
        <p>
          <a href={REPORT_URL} rel="noopener noreferrer">
            {s.reportLink}
          </a>
        </p>
        <p>{s.reportNote}</p>

        <h2>{s.techTitle}</h2>
        <p>{s.tech}</p>

        <p>
          <Link href="/">← {t.common.appName}</Link>
        </p>
      </main>
    </>
  );
}
