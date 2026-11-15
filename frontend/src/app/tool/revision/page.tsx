"use client";
// Vista del técnico local: abre una evaluación compartida por enlace y deja su
// veredicto (aprueba, corrige o descarta). Sin cuentas ni datos personales:
// el token del enlace es la única llave.
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { ApiError, api } from "@/lib/api";
import { DataStatusBanner } from "@/lib/components/DataStatusBanner";
import type { ConstraintsInput, Review, SharedEvaluation, Verdict } from "@/lib/contract";
import { useI18n } from "@/lib/i18n";
import { ShareSummary } from "../_components/ShareSummary";

const VERDICTS: Verdict[] = ["approve", "correct", "discard"];

type Loaded =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; message: string }
  | { status: "ready"; shared: SharedEvaluation; reviews: Review[] };

function ReviewForm({
  token,
  shared,
  onSaved,
}: {
  token: string;
  shared: SharedEvaluation;
  onSaved: (reviews: Review[]) => void;
}) {
  const { t, pick } = useI18n();
  const r = t.tool.review;
  const original = shared.result.constraints;
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [water, setWater] = useState<number>(original.max_water_mm_year.value ?? 0);
  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!verdict) {
      setMessage(r.chooseVerdict);
      return;
    }
    const corrected: ConstraintsInput | undefined =
      verdict === "correct"
        ? {
            max_water_mm_year: water,
            available_machinery: original.available_machinery,
            crops_without_buyer: original.crops_without_buyer,
            planting_window: {
              start_month: original.planting_window.start_month,
              end_month: original.planting_window.end_month,
            },
          }
        : undefined;
    setSaving(true);
    setMessage(null);
    try {
      const response = await api.review(token, {
        verdict,
        comments: comments.trim() || undefined,
        corrected_limits: corrected,
      });
      onSaved(response.reviews);
      setMessage(r.saved);
      setComments("");
    } catch (error) {
      setMessage(error instanceof ApiError ? pick(error.localized) : r.saveError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} aria-labelledby="review-form-heading" className="editor">
      <h2 id="review-form-heading">{r.formTitle}</h2>
      <fieldset>
        <legend>{r.verdictLegend}</legend>
        <ul className="choice-list">
          {VERDICTS.map((code) => (
            <li key={code}>
              <label className="choice">
                <input
                  type="radio"
                  name="verdict"
                  value={code}
                  checked={verdict === code}
                  onChange={() => setVerdict(code)}
                />
                <span>
                  <strong>{r.verdicts[code]}</strong>
                  <br />
                  {r.verdictHelp[code]}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      {verdict === "correct" && (
        <p>
          <label htmlFor="review-water" className="field-label">
            {r.correctedWater} ({t.tool.constraints.mmPerYear})
          </label>
          <input
            id="review-water"
            className="field"
            type="number"
            inputMode="numeric"
            min={0}
            max={5000}
            step={10}
            value={water}
            onChange={(event) => setWater(Number(event.target.value))}
          />
        </p>
      )}
      <p>
        <label htmlFor="review-comments" className="field-label">
          {r.comments}
        </label>
        <span id="review-comments-help" className="small">
          {r.noPersonalData}
        </span>
        <textarea
          id="review-comments"
          className="field field-wide"
          rows={4}
          maxLength={2000}
          aria-describedby="review-comments-help"
          value={comments}
          onChange={(event) => setComments(event.target.value)}
        />
      </p>
      <button type="submit" className="primary" disabled={saving}>
        {saving ? t.common.loading : r.submit}
      </button>
      <p role="status" aria-live="polite">
        {message ?? ""}
      </p>
    </form>
  );
}

function ReviewView() {
  const { t } = useI18n();
  const r = t.tool.review;
  const token = useSearchParams().get("t") ?? "";
  const [state, setState] = useState<Loaded>({ status: "loading" });
  const { pick } = useI18n();

  useEffect(() => {
    if (!token) {
      // Sin token no hay nada que pedir a la API.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ status: "missing" });
      return;
    }
    let alive = true;
    Promise.all([api.shared(token), api.reviews(token).catch(() => ({ token, reviews: [] }))]).then(
      ([shared, reviews]) => alive && setState({ status: "ready", shared, reviews: reviews.reviews }),
      (error: unknown) =>
        alive &&
        setState({
          status: "error",
          message: error instanceof ApiError ? pick(error.localized) : r.loadError,
        }),
    );
    return () => {
      alive = false;
    };
  }, [token, pick, r.loadError]);

  if (state.status === "loading") return <p role="status">{t.common.loading}</p>;
  if (state.status === "missing") return <p role="alert">{r.missingToken}</p>;
  if (state.status === "error") return <p role="alert">{state.message}</p>;

  const { shared, reviews } = state;
  return (
    <>
      <DataStatusBanner status={shared.result.data_status} origin="api" />
      <p>
        {r.sharedOn}: {new Date(shared.created_at).toLocaleString()}
      </p>
      <ShareSummary evaluation={shared.result} />
      <section aria-labelledby="reviews-heading">
        <h2 id="reviews-heading">{r.listTitle}</h2>
        {reviews.length === 0 ? (
          <p>{r.none}</p>
        ) : (
          <ol>
            {reviews.map((review) => (
              <li key={review.id}>
                <strong>{r.verdicts[review.verdict]}</strong> ·{" "}
                {new Date(review.created_at).toLocaleString()}
                {review.corrected_limits && (
                  <>
                    {" "}
                    · {r.correctedWater}: {review.corrected_limits.max_water_mm_year}{" "}
                    {t.tool.constraints.mmPerYear}
                  </>
                )}
                {review.comments && <p>{review.comments}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>
      <ReviewForm
        token={token}
        shared={shared}
        onSaved={(next) => setState({ status: "ready", shared, reviews: next })}
      />
    </>
  );
}

export default function ReviewPage() {
  const { t } = useI18n();
  return (
    <>
      <title>{`${t.tool.review.title} · Field Shift`}</title>
      <h1>{t.tool.review.title}</h1>
      <p>{t.tool.review.intro}</p>
      <Suspense fallback={<p role="status">{t.common.loading}</p>}>
        <ReviewView />
      </Suspense>
    </>
  );
}
