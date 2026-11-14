"use client";
import { EvaluationGate } from "@/lib/components/LoadGate";
import { SiteHeader } from "@/lib/components/SiteHeader";
import { useEvaluation, useParcelId } from "@/lib/evaluation";
import { useI18n } from "@/lib/i18n";
import { supabaseConfigured } from "@/lib/supabase";

export default function RemotePage() {
  const { t, pick, month } = useI18n();
  const [parcelId] = useParcelId();
  const state = useEvaluation(parcelId);
  return (
    <div className="judges">
      <title>{`${t.remote.title} · Field Shift`}</title>
      <SiteHeader />
      <main id="contenido" tabIndex={-1} className="page">
        <h1>{t.remote.title}</h1>
        <p>{t.remote.lead}</p>
        <p role="status">{supabaseConfigured ? t.remote.supabaseOn : t.remote.supabaseOff}</p>
        <EvaluationGate state={state}>
          {(evaluation) => (
            <>
              <h2>{t.remote.raw}</h2>
              <pre tabIndex={0}>
                {JSON.stringify(
                  {
                    [t.remote.month]: evaluation.timeline.map((item) => month(item.month)),
                    [t.remote.rotation]: evaluation.strategies.map((s) => `${s.id}: ${pick(s.title)}`),
                  },
                  null,
                  2,
                )}
              </pre>
            </>
          )}
        </EvaluationGate>
      </main>
    </div>
  );
}
