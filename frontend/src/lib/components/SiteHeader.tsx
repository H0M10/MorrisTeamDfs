"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { Guide, guideRoute } from "../guide/Guide";
import { useGuideMode } from "../guide/mode";
import { useI18n } from "../i18n";
import { FirstVisitPrompt } from "./FirstVisitPrompt";
import { LanguageSwitch } from "./LanguageSwitch";
import { ListenButton } from "./ListenButton";
import { ReadingSettingsDialog } from "./ReadingSettings";

export function SiteHeader() {
  const { t } = useI18n();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsButton = useRef<HTMLButtonElement>(null);
  const pathname = usePathname().replace(/\/$/, "") || "/";
  const withGuide = guideRoute(pathname);
  const [guideMode, setGuideMode, guideLoaded] = useGuideMode();
  return (
    <>
      <header className="site-header">
        <Link href="/" className="brand">
          {t.common.appName}
        </Link>
        <div className="header-tools">
          {withGuide && guideLoaded && (
            <button
              type="button"
              aria-pressed={guideMode !== "off"}
              onClick={() => setGuideMode(guideMode === "off" ? "open" : "off")}
            >
              {t.guide.turnOn}
            </button>
          )}
          <ListenButton />
          <LanguageSwitch />
          <button
            ref={settingsButton}
            type="button"
            aria-haspopup="dialog"
            onClick={() => setSettingsOpen(true)}
          >
            {t.a11y.settingsButton}
          </button>
        </div>
      </header>
      {withGuide ? (
        <Guide onOpenSettings={() => setSettingsOpen(true)} />
      ) : pathname === "/campo" ? null : (
        <FirstVisitPrompt
          onChoose={() => setSettingsOpen(true)}
          onSkip={() => settingsButton.current?.focus()}
        />
      )}
      {settingsOpen && (
        <ReadingSettingsDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          returnFocus={settingsButton}
        />
      )}
    </>
  );
}
