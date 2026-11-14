"use client";
// Idioma de la interfaz: español por omisión, inglés a un clic.
// La elección se guarda en el dispositivo y actualiza <html lang>.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Lang, LocalizedText, MetricValue } from "../contract";
import { readLang, saveLang } from "../storage";
import { en } from "./en";
import { es, type Dictionary } from "./es";

const DICTIONARIES: Record<Lang, Dictionary> = { es, en };
export const LANGS: { code: Lang; label: string }[] = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
];

interface I18n {
  lang: Lang;
  t: Dictionary;
  setLang: (lang: Lang) => void;
  /** Texto del contrato en el idioma activo. */
  pick: (text: LocalizedText) => string;
  /** "2023-04" -> "abr 2023". */
  month: (yearMonth: string) => string;
  /** Valor con unidad, o "sin dato". */
  value: (metric: MetricValue) => string;
}

const I18nContext = createContext<I18n | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es");

  useEffect(() => {
    const stored = readLang();
    // Lectura única de localStorage tras hidratar: no existe en el servidor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === "en" || stored === "es") setLangState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<I18n>(() => {
    const t = DICTIONARIES[lang];
    const number = new Intl.NumberFormat(lang === "es" ? "es-MX" : "en-US", {
      maximumFractionDigits: 2,
    });
    return {
      lang,
      t,
      setLang: (next) => {
        setLangState(next);
        saveLang(next);
      },
      pick: (text) => text[lang],
      month: (yearMonth) => {
        const [year, month] = yearMonth.split("-");
        return `${t.common.months[Number(month) - 1] ?? month} ${year}`;
      },
      value: (metric) =>
        metric.value === null ? t.common.noData : `${number.format(metric.value)} ${metric.unit}`,
    };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n necesita <LanguageProvider>");
  return context;
}
