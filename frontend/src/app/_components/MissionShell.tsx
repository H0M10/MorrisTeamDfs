"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";
import { SiteHeader } from "@/lib/components/SiteHeader";
import { useI18n } from "@/lib/i18n";
import "../portada.css";
import "../presentation.css";
import "../mission.css";

const FieldContext = createContext({
  parcel: "dv-nv-01",
  setParcel: (_: string) => {
    void _;
  },
});
export const useMissionField = () => useContext(FieldContext);
const chapters = [
  ["/", "Inicio", "Overview"],
  ["/presentacion/reto", "El reto", "The challenge"],
  ["/presentacion/campo", "Caso real", "Live case"],
  ["/presentacion/modelos/3", "Modelos", "Models"],
  ["/presentacion/personas", "Las personas", "People"],
  ["/presentacion/evidencia", "Evidencia", "Evidence"],
];
export function MissionShell({ children }: { children: ReactNode }) {
  const [parcel, setParcel] = useState("dv-nv-01");
  const path = usePathname();
  const { lang } = useI18n();
  return (
    <FieldContext.Provider value={{ parcel, setParcel }}>
      <div className="mission">
        <SiteHeader minimal />
        <div className="mission-navigation">
          <nav
            aria-label={
              lang === "en"
                ? "Presentation chapters"
                : "Capítulos de la presentación"
            }
          >
            {chapters.map(([href, es, en]) => (
              <Link
                key={href}
                href={href!}
                aria-current={
                  (
                    href?.includes("/modelos/")
                      ? path.includes("/modelos/")
                      : path === href
                  )
                    ? "page"
                    : undefined
                }
              >
                {lang === "en" ? en : es}
              </Link>
            ))}
          </nav>
          <Link className="mission-tool-link" href="/tool">
            {lang === "en" ? "Farmer tool" : "Herramienta"} ↗
          </Link>
        </div>
        <main id="contenido" tabIndex={-1} className="presentation">
          {children}
        </main>
        <footer className="mission-footer">
          <span>Field Shift / The CSC</span>
          <span>NASA Space Apps Challenge 2026</span>
          <Link href="/presentacion/evidencia">
            {lang === "en" ? "Sources & limitations" : "Fuentes y límites"} ↗
          </Link>
        </footer>
      </div>
    </FieldContext.Provider>
  );
}
