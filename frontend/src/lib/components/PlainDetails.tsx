"use client";
// Detalle técnico que, con "Lenguaje sencillo", queda detrás de "Ver más"
// (PLAN_DOMINGO §6.8). Sin el ajuste se muestra tal cual. Nunca se esconde
// del todo: la ficha de cada cifra sigue a un clic.
import type { ReactNode } from "react";
import { useA11y } from "../a11y/profile";
import { useI18n } from "../i18n";

export function PlainDetails({ children, summary }: { children: ReactNode; summary?: string }) {
  const { t } = useI18n();
  const { profile } = useA11y();
  if (!profile.plain) return <>{children}</>;
  return (
    <details>
      <summary>{summary ?? t.a11y.seeMore}</summary>
      {children}
    </details>
  );
}
