"use client";
// Idioma de la interfaz: español por omisión, inglés a un clic.
// La elección se guarda en el dispositivo y actualiza <html lang>.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useA11y } from "../a11y/profile";
import { convert, type UnitSystem } from "../a11y/units";
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
  /**
   * Valor con unidad, o "sin dato". Con unidades de EE. UU. convierte mm, ha,
   * m y mm/m y deja el valor original entre paréntesis: "9.4 pulgadas al año (240 mm al año)".
   */
  value: (metric: MetricValue) => string;
  /** Número del contrato en el sistema elegido, con su unidad en palabras ("9.4 pulgadas al año"). */
  amount: (value: number, unit: string) => string;
  /** Sistema de unidades activo (P1-5). Por omisión: EE. UU. en inglés, métricas en español. */
  units: UnitSystem;
  setUnits: (units: UnitSystem) => void;
}

const I18nContext = createContext<I18n | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es");
  const { profile, update } = useA11y();
  const units: UnitSystem =
    profile.units === "auto" ? (lang === "en" ? "us" : "metric") : profile.units;

  useEffect(() => {
    const stored = readLang();
    // Lectura única de localStorage tras hidratar: no existe en el servidor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === "en" || stored === "es") setLangState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    document.documentElement.setAttribute("data-units", units);
  }, [units]);

  const value = useMemo<I18n>(() => {
    const t = DICTIONARIES[lang];
    const number = new Intl.NumberFormat(lang === "es" ? "es-MX" : "en-US", {
      maximumFractionDigits: 2,
    });
    const unitName = (unit: string) =>
      t.a11y.units.names[unit] ?? t.common.units[unit] ?? unit;
    const amount = (raw: number, unit: string) => {
      const c = convert(raw, unit, units);
      const text = c.digits === null
        ? number.format(c.value)
        : new Intl.NumberFormat(lang === "es" ? "es-MX" : "en-US", {
            maximumFractionDigits: c.digits,
          }).format(c.value);
      return `${text} ${unitName(c.unit)}`.trim();
    };
    return {
      lang,
      t,
      units,
      setUnits: (next) => update({ units: next }),
      amount,
      setLang: (next) => {
        setLangState(next);
        saveLang(next);
      },
      pick: (text) => text[lang],
      month: (yearMonth) => {
        const [year, month] = yearMonth.split("-");
        return `${t.common.months[Number(month) - 1] ?? month} ${year}`;
      },
      value: (metric) => {
        if (metric.value === null) return t.common.noData;
        const original = `${number.format(metric.value)} ${unitName(metric.unit)}`.trim();
        if (convert(metric.value, metric.unit, units).convertedFrom === null) return original;
        return `${amount(metric.value, metric.unit)} (${original})`;
      },
    };
  }, [lang, units, update]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n necesita <LanguageProvider>");
  return context;
}
