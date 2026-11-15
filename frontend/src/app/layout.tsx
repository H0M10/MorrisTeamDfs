import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next } from "next/font/google";
import type { ReactNode } from "react";
import { A11Y_BOOT_SCRIPT } from "@/lib/a11y/boot";
import { A11yProvider } from "@/lib/a11y/profile";
import { LanguageProvider } from "@/lib/i18n";
import { SkipLink } from "@/lib/components/SkipLink";
// import {SimulationProvider} from "@/lib/components/SimulationProvider";
import "./globals.css";
// Perfil de accesibilidad: después de globals.css para ganarle (P1-1).
import "@/lib/a11y/a11y.css";
import "@/lib/guide/guide.css";

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
    // suppressHydrationWarning: el script de abajo pone los data-* del perfil
    // en <html> antes de que React hidrate.
    <html lang="es" className={atkinson.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: A11Y_BOOT_SCRIPT }} />
      </head>
      <body>
        <A11yProvider>
          <LanguageProvider>
            <SkipLink />
            {children}
          </LanguageProvider>
        </A11yProvider>
      </body>
    </html>
  );
}

// // layout.tsx de las rutas de la herramienta
// export default function ToolLayout({ children }: { children: React.ReactNode }) {
//   return <SimulationProvider>{children}</SimulationProvider>;
// }