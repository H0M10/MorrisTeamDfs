"use client";
import { EvaluationGate } from "@/lib/components/LoadGate";
import { SiteHeader } from "@/lib/components/SiteHeader";
import { useEvaluation, useParcelId } from "@/lib/evaluation";
import { useI18n } from "@/lib/i18n";

export default function EngineerPage() {
  const { t, pick, value, month } = useI18n();
  const [parcelId] = useParcelId();
  const state = useEvaluation(parcelId);
  return (
    <div className="judges">
      <title>{`${t.engineer.title} · Field Shift`}</title>
      <SiteHeader />
      <main id="contenido" tabIndex={-1} className="page">
        <h1>{t.engineer.title}</h1>
        <p>{t.engineer.lead}</p>
        <EvaluationGate state={state}>
          {(evaluation) => {
            const weights = evaluation.timeline.filter((item) => item.attention_weight !== null);
            return (
              <>
                <h2>{t.engineer.models}</h2>
                <div className="table-wrap" tabIndex={0} role="region" aria-label={t.engineer.models}>
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">{t.engineer.model}</th>
                        <th scope="col">{t.engineer.status}</th>
                        <th scope="col">{t.engineer.algorithm}</th>
                        <th scope="col">{t.engineer.metric}</th>
                        <th scope="col">{t.engineer.baseline}</th>
                        <th scope="col">{t.engineer.note}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(evaluation.models).map(([name, report]) => (
                        <tr key={name}>
                          <th scope="row">{name}</th>
                          <td>{report.status}</td>
                          <td>{report.algorithm}</td>
                          <td>
                            {pick(report.metric_name)}: {value(report.metric)}
                          </td>
                          <td>
                            {pick(report.baseline_name)}: {value(report.baseline_metric)}
                          </td>
                          <td>{pick(report.active_mode_note)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h2>{t.engineer.attention}</h2>
                <p>{t.engineer.attentionNote}</p>
                {weights.length === 0 ? (
                  <p>{t.engineer.noAttention}</p>
                ) : (
                  <div className="table-wrap" tabIndex={0} role="region" aria-label={t.engineer.attention}>
                    <table>
                      <thead>
                        <tr>
                          <th scope="col">{t.strip.month}</th>
                          <th scope="col">{t.engineer.weight}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weights.map((item) => (
                          <tr key={item.month}>
                            <th scope="row">{month(item.month)}</th>
                            <td>{item.attention_weight?.value ?? t.common.noData}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            );
          }}
        </EvaluationGate>
      </main>
    </div>
  );
}
