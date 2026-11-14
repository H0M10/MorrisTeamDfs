"use client";
// Primer elemento enfocable de cada página. Cada página debe tener <main id="contenido">.
import { useI18n } from "../i18n";

export function SkipLink() {
  const { t } = useI18n();
  return (
    <a className="skip-link" href="#contenido">
      {t.common.skipToContent}
    </a>
  );
}
