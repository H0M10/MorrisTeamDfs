"use client";
import Link from "next/link";
import { EvaluationGate } from "@/lib/components/LoadGate";
import type { Evaluation } from "@/lib/contract";
import { useI18n } from "@/lib/i18n";
import { ComparisonTable } from "../_components/ComparisonTable";
import { PriorityPicker } from "../_components/PriorityPicker";
import {
  bestByKey,
  isRankable,
  orderStrategies,
  rankValue,
  topTied,
  usePriorities,
  type Priorities,
} from "../_components/priorities";
import { RotationCalendar } from "../_components/RotationCalendar";
import { useToolEvaluation } from "../_components/useToolEvaluation";

export default function RotationsPage() {
  const { t } = useI18n();
  const state = useToolEvaluation();
  const [priorities, setPriorities] = usePriorities();
  return (
    <>
      <title>{`${t.tool.steps.rotations.name} · Field Shift`}</title>
      <h1>{t.tool.steps.rotations.title}</h1>
      <EvaluationGate state={state}>
        {(evaluation) => (
          <Rotations
            evaluation={evaluation}
            priorities={priorities}
            setPriorities={setPriorities}
          />
        )}
      </EvaluationGate>
    </>
  );
}

function Rotations({
  evaluation,
  priorities,
  setPriorities,
}: {
  evaluation: Evaluation;
  priorities: Priorities;
  setPriorities: (next: Priorities) => void;
}) {
  const { t, pick, value } = useI18n();
  const r = t.tool.rotations;
  const ordered = orderStrategies(evaluation.strategies, priorities);
  const best = bestByKey(evaluation.strategies);
  const explanation = explain();
  return (
    <>
      {!evaluation.has_viable_options && (
        <p role="status">
          <strong>{r.noneViable}</strong>
        </p>
      )}
      <PriorityPicker priorities={priorities} onChange={setPriorities} />
      <div role="status" aria-live="polite" className="priority-result">
        {explanation.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <ComparisonTable strategies={ordered} best={best} />
      <RotationCalendar strategies={ordered} />
      <p>
        <Link href="/tool/evidencia">{r.seeEvidence}</Link>
      </p>
    </>
  );

  /** Frases que explican el orden, calculadas solo con cifras del contrato. */
  function explain(): string[] {
    const { first, second } = priorities;
    if (!first) return [r.noPriorityChosen];
    const lines: string[] = [];
    if (first === "market") lines.push(r.marketMissing);
    // La prioridad que decide de verdad: la primera que tiene datos.
    const deciding = isRankable(first) ? first : isRankable(second) ? second : null;
    const named = [first, second].filter(isRankable).map((key) => r.priorityNames[key]);
    if (named[0]) lines.push(r.orderedBy(named[0], named[1]));
    const top = ordered[0];
    if (deciding && top?.viable && rankValue(top, deciding) !== null) {
      if (topTied(ordered, deciding)) {
        lines.push(r.tied(r.priorityNames[deciding]));
      } else {
        const m = top.metrics;
        const detail =
          deciding === "water"
            ? r.detail.water(value(m.annual_water_mm))
            : deciding === "soil"
              ? r.detail.soil(String(m.soil_cover_months_36m.value))
              : r.detail.climate(
                  String(m.frost_risk_days_year.value),
                  String(m.heat_risk_days_year.value),
                );
        lines.push(r.firstBecause(pick(top.title), r.priorityNames[deciding], detail));
      }
    }
    if (second === "market" && first !== "market") lines.push(r.marketMissing);
    return lines;
  }
}
