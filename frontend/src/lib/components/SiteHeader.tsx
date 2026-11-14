"use client";
import Link from "next/link";
import { useI18n } from "../i18n";
import { LanguageSwitch } from "./LanguageSwitch";

export function SiteHeader() {
  const { t } = useI18n();
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        {t.common.appName}
      </Link>
      <LanguageSwitch />
    </header>
  );
}
