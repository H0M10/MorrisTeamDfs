"use client";
import { useEffect, useState } from "react";
import { ApiError, api } from "@/lib/api";
import { EvaluationGate } from "@/lib/components/LoadGate";
import type { Evaluation } from "@/lib/contract";
import { useDeclaredConstraints, useParcelId } from "@/lib/evaluation";
import { useI18n } from "@/lib/i18n";
import { canSpeak, speak, stopSpeaking } from "@/lib/speech";
import { ShareSummary, useSummaryText } from "../_components/ShareSummary";
import { useToolEvaluation } from "../_components/useToolEvaluation";

type LinkState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "ready"; url: string }
  | { status: "error"; message: string };

function ShareLink({ evaluation }: { evaluation: Evaluation }) {
  const { t, pick } = useI18n();
  const s = t.tool.share;
  const [parcelId] = useParcelId();
  const [constraints] = useDeclaredConstraints(parcelId);
  const [link, setLink] = useState<LinkState>({ status: "idle" });
  const [copied, setCopied] = useState(false);

  const create = async () => {
    setLink({ status: "saving" });
    setCopied(false);
    try {
      const { token } = await api.share({ parcel_id: parcelId, constraints }, evaluation);
      const url = `${window.location.origin}/tool/revision?t=${encodeURIComponent(token)}`;
      setLink({ status: "ready", url });
    } catch (error) {
      setLink({
        status: "error",
        message: error instanceof ApiError ? pick(error.localized) : s.linkError,
      });
    }
  };

  const copy = async () => {
    if (link.status !== "ready") return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section aria-labelledby="share-link-heading" className="no-print">
      <h2 id="share-link-heading">{s.linkTitle}</h2>
      <p>{s.linkIntro}</p>
      <p>
        <button type="button" className="primary" onClick={create} disabled={link.status === "saving"}>
          {link.status === "saving" ? s.linkSaving : s.linkCreate}
        </button>
      </p>
      <div role="status" aria-live="polite">
        {link.status === "error" && <p>{link.message}</p>}
        {link.status === "ready" && (
          <>
            <p>
              <label htmlFor="share-url" className="field-label">
                {s.linkReady}
              </label>
              <input id="share-url" className="field field-wide" readOnly value={link.url} />
            </p>
            <p className="inline-fields">
              <button type="button" onClick={copy}>
                {copied ? s.copied : s.copy}
              </button>
              <a className="button" href={link.url}>
                {s.openReview}
              </a>
            </p>
          </>
        )}
      </div>
    </section>
  );
}

export default function SharePage() {
  const { t, lang } = useI18n();
  const state = useToolEvaluation();
  const summaryText = useSummaryText();
  const [voice, setVoice] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    // El soporte de voz solo se conoce en el navegador.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVoice(canSpeak());
    return () => stopSpeaking();
  }, []);

  return (
    <>
      <title>{`${t.tool.steps.share.name} · Field Shift`}</title>
      <h1>{t.tool.steps.share.title}</h1>
      <p className="no-print">{t.tool.share.intro}</p>
      <EvaluationGate state={state}>
        {(evaluation) => (
          <>
            <p className="no-print inline-fields">
              <button type="button" className="primary" onClick={() => window.print()}>
                {t.tool.share.print}
              </button>
              {voice && (
                <button
                  type="button"
                  aria-pressed={speaking}
                  onClick={() => {
                    if (speaking) {
                      stopSpeaking();
                      setSpeaking(false);
                      return;
                    }
                    setSpeaking(true);
                    speak(summaryText(evaluation), lang, () => setSpeaking(false));
                  }}
                >
                  {speaking ? t.tool.share.stopListening : t.tool.share.listen}
                </button>
              )}
            </p>
            <ShareSummary evaluation={evaluation} />
            <ShareLink evaluation={evaluation} />
          </>
        )}
      </EvaluationGate>
    </>
  );
}
