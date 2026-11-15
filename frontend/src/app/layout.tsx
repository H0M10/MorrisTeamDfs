import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next } from "next/font/google";
import type { ReactNode } from "react";
import { LanguageProvider } from "@/lib/i18n";
import { SkipLink } from "@/lib/components/SkipLink";
// import {SimulationProvider} from "@/lib/components/SimulationProvider";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin", "latin-ext"],
  variable: "--font-atkinson",
  display: "swap",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: { default: "Field Shift", template: "%s · Field Shift" },
  description:
    "Apoyo a la decisión de rotación de cultivos con datos de la NASA. Crop rotation decision support with NASA data.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={atkinson.variable}>
      <body>
        <LanguageProvider>
          <SkipLink />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}

// // layout.tsx de las rutas de la herramienta
// export default function ToolLayout({ children }: { children: React.ReactNode }) {
//   return <SimulationProvider>{children}</SimulationProvider>;
// }