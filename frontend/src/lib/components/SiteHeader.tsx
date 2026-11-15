"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useI18n } from "../i18n";
import { FirstVisitPrompt } from "./FirstVisitPrompt";
import { LanguageSwitch } from "./LanguageSwitch";
import { ListenButton } from "./ListenButton";
import { ReadingSettingsDialog } from "./ReadingSettings";
import { UnitsSwitch } from "./UnitsSwitch";

export function SiteHeader() {
  const { t } = useI18n();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsButton = useRef<HTMLButtonElement>(null);
  return (
    <>
      <header className="site-header">
        <Link href="/" className="brand">
          {t.common.appName}
        </Link>
        <div className="header-tools">
          <ListenButton />
          <UnitsSwitch />
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
      <FirstVisitPrompt
        onChoose={() => setSettingsOpen(true)}
        onSkip={() => settingsButton.current?.focus()}
      />
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
