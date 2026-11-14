"use client";
import Link from "next/link";
import { SiteHeader } from "@/lib/components/SiteHeader";
import { useI18n } from "@/lib/i18n";

export default function HomePage() {
  const { t } = useI18n();
  const links = [
    { href: "/tool", title: t.home.toolTitle, text: t.home.toolText },
    { href: "/showcase", title: t.home.showcaseTitle, text: t.home.showcaseText },
    { href: "/engineer", title: t.home.engineerTitle, text: t.home.engineerText },
    { href: "/remote", title: t.home.remoteTitle, text: t.home.remoteText },
  ];
  return (
    <>
      <SiteHeader />
      <main id="contenido" tabIndex={-1} className="page">
        <h1>{t.home.title}</h1>
        <p>{t.home.lead}</p>
        <ul>
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href}>{link.title}</Link>. {link.text}
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
