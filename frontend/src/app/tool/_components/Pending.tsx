"use client";
import { useI18n } from "@/lib/i18n";

/** Marca lo que falta construir en una pantalla del esqueleto. */
export function Pending({ children }: { children: string }) {
  const { t } = useI18n();
  return (
    <p className="note-pending no-print">
      <strong>{t.common.pending}:</strong> {children}
    </p>
  );
}
