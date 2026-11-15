"use client";
// Un solo botón que cambia al otro idioma, escrito en ese idioma ("English" /
// "Español"): ocupa la mitad y no se toca por error el idioma ya activo.
import { LANGS, useI18n } from "../i18n";

export function LanguageSwitch() {
  const { lang, setLang, t } = useI18n();
  const other = LANGS.find(({ code }) => code !== lang) ?? LANGS[0];
  if (!other) return null;
  return (
    <div className="lang-switch">
      <button
        type="button"
        lang={other.code}
        aria-label={`${other.label} (${t.common.language})`}
        onClick={() => setLang(other.code)}
      >
        {other.label}
      </button>
    </div>
  );
}
