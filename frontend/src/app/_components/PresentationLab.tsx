"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, API_URL } from "@/lib/api";
import type { Evaluation, MetricValue, ModelReport } from "@/lib/contract";
import { useI18n } from "@/lib/i18n";
import { saveLastParcelId } from "@/lib/storage";
import { DataStatusBanner } from "@/lib/components/DataStatusBanner";
import { ParcelStrip } from "../tool/_components/ParcelStrip";
import { ModelMechanism } from "./ModelMechanism";
import { ReferenceNetwork } from "./ReferenceNetwork";
import { useMissionField } from "./MissionShell";
import { NeuralNetShowcase } from "./NeuralNetShowcase";

const choices = [
  ["1", "Agua", "Water", "XGBoost"],
  ["2", "Cultivo anterior", "Prior crop", "XGBoost"],
  ["3", "Historial", "History", "GRU + ONNX"],
  ["4", "Humedad", "Moisture", "CQR"],
  ["5", "Secuencias", "Sequences", "Markov"],
  ["physics", "Motor físico", "Physical engine", "FAO-56"],
];
const keys = [
  "model_1_crop_water",
  "model_2_prior_crop_effect",
  "model_3_crop_history_gru",
  "model_4_moisture_cqr",
] as const;
interface SequenceHealth {
  status: string;
  metric?: number;
  baseline?: number;
  unit?: string;
  card_path?: string;
}
const copy: Record<string, [string, string, string, string]> = {
  "1": [
    "¿Cuánta agua necesitaría cada opción?",
    "How much water would each option need?",
    "Cultivo, clima y suelo → ET mensual → lluvia efectiva → riego neto. Las alternativas se ajustan con OpenET del campo cuando existe. La métrica mide ET mensual, no ahorro real ni error de la rotación completa.",
    "Crop, weather and soil → monthly ET → effective rain → net irrigation. Alternatives are adjusted with field OpenET when available. The metric measures monthly ET, not actual savings or full-rotation error.",
  ],
  "2": [
    "¿Ayuda conocer el cultivo anterior?",
    "Does knowing the previous crop help?",
    "El modelo compara vigor con y sin cultivo anterior. En el valle de prueba no mejoró la línea base: la herramienta declara que no hay evidencia local. Es observacional, no causal.",
    "The model compares vigor predictions with and without the previous crop. On the test valley it did not improve on the baseline: the tool reports no local evidence. This is observational, not causal.",
  ],
  "3": [
    "¿Qué cultivo hubo y qué meses pesaron?",
    "Which crop was there, and which months mattered?",
    "Entradas: NDVI, NDMI, BSI, NDTI y marca de mes sin imagen. La red lee un año de 12 meses. Los colores acompañan la lectura; no son sus entradas numéricas. La geometría es un esquema, no los pesos internos de la red.",
    "Inputs: NDVI, NDMI, BSI, NDTI and a missing-image flag. The network reads a 12-month year. Colors accompany the reading; they are not its numerical inputs. Geometry is schematic, not the network’s internal weights.",
  ],
  "4": [
    "¿Qué tan incierta es la humedad regional?",
    "How uncertain is regional moisture?",
    "Balance hídrico y árboles por cuantiles con calibración conformal. Los intervalos se validaron por valle y mes. Su cobertura regional no prueba exactitud a escala de parcela.",
    "Water balance and quantile trees with conformal calibration. Intervals were validated by valley and month. Regional coverage does not establish parcel-level accuracy.",
  ],
  "5": [
    "¿Qué secuencias siguen campos parecidos?",
    "Which sequences do similar fields follow?",
    "Una cadena de Markov aprende transiciones de USDA CDL. Propone candidatas; las restricciones y el agua deciden cuáles comparar. La frecuencia observada no demuestra que una rotación sea óptima.",
    "A Markov chain learns transitions from USDA CDL. It proposes candidates; constraints and water determine which to compare. Observed frequency does not prove a rotation is optimal.",
  ],
  physics: [
    "¿Qué mantiene la decisión dentro de lo posible?",
    "What keeps the decision feasible?",
    "Comprador, maquinaria y calendario filtran candidatas. Se estima agua para verificar cada año antes de ordenar. Después se calculan las lecturas auxiliares y se muestran fuentes y límites.",
    "Buyer, machinery and calendar filter candidates. Water is estimated to check each year before ranking. Auxiliary readings are then computed, with sources and limitations displayed.",
  ],
};

function Provenance({ metric }: { metric: MetricValue }) {
  const { lang } = useI18n();
  return (
    <details className="present-provenance">
      <summary>
        {lang === "en" ? "Source, scale and type" : "Fuente, escala y tipo"}
      </summary>
      <p>{metric.source}</p>
      <p>
        {metric.date} · {metric.native_scale} · {metric.type} · {metric.unit}
      </p>
    </details>
  );
}

export function PresentationLab({
  view = "decision",
  model = "3",
}: {
  view?: "decision" | "models";
  model?: string;
}) {
  const { lang, pick } = useI18n();
  const en = lang === "en";
  const tr = (es: string, english: string) => (en ? english : es);
  const { parcel, setParcel } = useMissionField();
  const [data, setData] = useState<Evaluation | null>(null);
  const [seq, setSeq] = useState<SequenceHealth | null>(null);
  const active = model;
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(true);
  const [limit, setLimit] = useState("500");
  const [scenario, setScenario] = useState<Evaluation | null>(null);
  const [scenarioStatus, setScenarioStatus] = useState<
    "idle" | "loading" | "error" | "ready"
  >("idle");
  const [run, setRun] = useState(0);
  const request = useRef(0);
  useEffect(() => {
    let alive = true;
    api.evaluate(parcel).then(
      (result) => {
        if (!alive) return;
        setData(result);
        setBusy(false);
      },
      () => {
        if (alive) {
          setError(true);
          setBusy(false);
        }
      },
    );
    fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(8000) })
      .then((r) => {
        if (!r.ok) throw new Error("health");
        return r.json();
      })
      .then((health: { sequence_model?: SequenceHealth }) => {
        if (alive) setSeq(health.sequence_model ?? null);
      })
      .catch(() => {
        if (alive) setSeq(null);
      });
    return () => {
      alive = false;
      request.current += 1;
    };
  }, [parcel, run]);
  const reload = (id = parcel) => {
    request.current += 1;
    setData(null);
    setScenario(null);
    setScenarioStatus("idle");
    setError(false);
    setBusy(true);
    setSeq(null);
    setParcel(id);
    setRun((x) => x + 1);
  };
  async function simulate() {
    if (!data) return;
    const ticket = ++request.current;
    const value = Number(limit);
    if (
      !Number.isFinite(value) ||
      limit.trim() === "" ||
      value < 0 ||
      value > 5000
    ) {
      setScenario(null);
      setScenarioStatus("error");
      return;
    }
    setScenario(null);
    setScenarioStatus("loading");
    try {
      const result = await api.simulate(parcel, {
        max_water_mm_year: value,
        available_machinery: data.constraints.available_machinery,
        crops_without_buyer: data.constraints.crops_without_buyer,
        planting_window: {
          start_month: data.constraints.planting_window.start_month,
          end_month: data.constraints.planting_window.end_month,
        },
      });
      if (ticket === request.current) {
        setScenario(result);
        setScenarioStatus("ready");
      }
    } catch {
      if (ticket === request.current) setScenarioStatus("error");
    }
  }
  const shown = scenario ?? data;
  const report: ModelReport | null =
    data && keys[Number(active) - 1]
      ? data.models[keys[Number(active) - 1]!]
      : null;
  const maxWater = Math.max(
    1,
    ...(shown?.strategies.map((s) => s.metrics.annual_water_mm.value ?? 0) ??
      []),
  );
  const text = copy[active]!;
  const cardPath =
    active === "physics"
      ? "backend/app/engine"
      : active === "5"
        ? "models/model_5_crop_sequence/CARD.md"
        : `models/${keys[Number(active) - 1]}/CARD.md`;
  const savingField = () => {
    if (data) saveLastParcelId(data.parcel.id);
  };
  return (
    <>
      {view === "decision" && (
        <section
          id="campo-real"
          className="present-shell present-section"
          aria-labelledby="decision-title"
        >
          <p className="present-kicker">
            01 /{" "}
            {tr(
              "Un campo. Una decisión comprobable.",
              "One field. A checkable decision.",
            )}
          </p>
          <h2 id="decision-title">
            {tr(
              "¿Y si cambia tu límite de agua?",
              "What if your water limit changes?",
            )}
          </h2>
          <div className="present-lab-toolbar">
            <label>
              {tr("Campo de demostración", "Demonstration field")}
              <select value={parcel} onChange={(e) => reload(e.target.value)}>
                <option value="dv-nv-01">Diamond Valley / NV / 01</option>
                <option value="dv-f001">Diamond Valley / NV / F001</option>
                <option value="dv-f002">Diamond Valley / NV / F002</option>
              </select>
            </label>
            <button type="button" onClick={() => reload()} disabled={busy}>
              {busy
                ? tr("Consultando API…", "Querying API…")
                : tr("Ejecutar análisis", "Run analysis")}{" "}
              ↻
            </button>
            <p className="present-note">
              {tr(
                "Inferencia bajo demanda sobre observaciones históricas. No es una transmisión satelital en directo.",
                "On-demand inference on historical observations. This is not a live satellite feed.",
              )}
            </p>
          </div>
          {!data && !error && (
            <p role="status">
              {tr(
                "Consultando la evaluación del campo…",
                "Fetching the field evaluation…",
              )}
            </p>
          )}
          {error && (
            <p role="alert">
              {tr(
                "La API no respondió. Puedes volver a ejecutar el análisis. No mostramos resultados inventados.",
                "The API did not respond. Run the analysis again. No invented results are shown.",
              )}
            </p>
          )}
          {data && (
            <>
              <DataStatusBanner status={data.data_status} />
              <div className="present-field-heading">
                <h3>{pick(data.parcel.name)}</h3>
                <p>
                  {data.timeline[0].month} → {data.timeline[35].month} ·{" "}
                  {data.parcel.center.lat.toFixed(4)},{" "}
                  {data.parcel.center.lon.toFixed(4)} · {data.data_status}
                </p>
              </div>
              <ParcelStrip timeline={data.timeline} />
              <form
                className="present-scenario"
                onSubmit={(e) => {
                  e.preventDefault();
                  void simulate();
                }}
              >
                <div>
                  <strong>{tr("Escenario de agua", "Water scenario")}</strong>
                  <p>
                    {tr(
                      "Cambia solo el agua. Conserva maquinaria, mercado y calendario del campo, que pueden ser supuestos.",
                      "Change water only. Keep the field’s machinery, market and calendar constraints, which may be assumptions.",
                    )}
                  </p>
                </div>
                <label>
                  {tr("Límite anual (mm)", "Annual limit (mm)")}
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="5000"
                    step="1"
                    required
                    value={limit}
                    onChange={(e) => {
                      request.current += 1;
                      setLimit(e.target.value);
                      setScenario(null);
                      setScenarioStatus("idle");
                    }}
                  />
                </label>
                <button
                  className="primary"
                  type="submit"
                  disabled={scenarioStatus === "loading"}
                >
                  {scenarioStatus === "loading"
                    ? tr("Comprobando…", "Checking…")
                    : tr("Comprobar escenario", "Check scenario")}
                </button>
              </form>
              {scenarioStatus === "error" && (
                <p role="alert">
                  {tr(
                    "No se pudo comprobar el escenario. No hay resultados de simulación disponibles. Revisa el límite (0–5000 mm) y vuelve a intentarlo.",
                    "The scenario could not be checked. No simulation results are available. Check the limit (0–5000 mm) and try again.",
                  )}
                </p>
              )}
              <div className="present-results" aria-live="polite">
                {scenarioStatus === "idle" && (
                  <p>
                    {tr(
                      "Evaluación de referencia. Pulsa «Comprobar escenario» para aplicar el límite escrito.",
                      "Reference evaluation. Press “Check scenario” to apply the entered limit.",
                    )}
                  </p>
                )}
                {scenarioStatus === "ready" && scenario && (
                  <p>
                    <strong>
                      {tr("Escenario calculado", "Computed scenario")} ·{" "}
                      {scenario.constraints.max_water_mm_year.value} mm
                    </strong>
                  </p>
                )}
                {shown &&
                  scenarioStatus !== "loading" &&
                  scenarioStatus !== "error" && (
                    <>
                      <p className="present-note">
                        {tr(
                          "La tabla muestra el promedio anual. La viabilidad comprueba el año de mayor consumo. Una alternativa descartada no es una recomendación.",
                          "The table shows mean annual use. Feasibility checks the highest-use year. A rejected alternative is not a recommendation.",
                        )}
                      </p>
                      {!shown.has_viable_options && (
                        <p className="present-rejected">
                          {tr(
                            "Ninguna de estas opciones cumple los límites.",
                            "None of these options meets the constraints.",
                          )}
                        </p>
                      )}
                      <div className="present-rotations">
                        {shown.strategies.map((s) => (
                          <article
                            key={s.id}
                            className={
                              s.viable
                                ? "present-option"
                                : "present-option is-rejected"
                            }
                          >
                            <span className="present-option-status">
                              {s.viable
                                ? tr("Cumple los límites", "Meets constraints")
                                : tr("Descartada", "Rejected")}
                            </span>
                            <h3>{pick(s.title)}</h3>
                            <p className="present-big-number">
                              {s.metrics.annual_water_mm.value ?? "—"}
                              <small> mm / {tr("año", "year")}</small>
                            </p>
                            <Provenance metric={s.metrics.annual_water_mm} />
                            {s.rejection_reason && (
                              <p>{pick(s.rejection_reason)}</p>
                            )}
                            <details>
                              <summary>
                                {tr(
                                  "Ver ficha de evidencia",
                                  "View evidence card",
                                )}
                              </summary>
                              {Object.entries(s.evidence_card)
                                .filter(
                                  ([key]) =>
                                    s.viable ||
                                    (key !== "benefits" &&
                                      key !== "why_suggested"),
                                )
                                .map(([key, entries]) => (
                                  <div key={key}>
                                    <h4>
                                      {
                                        (
                                          {
                                            why_suggested: tr("Por qué", "Why"),
                                            supporting_evidence: tr(
                                              "Evidencia",
                                              "Evidence",
                                            ),
                                            benefits: tr(
                                              "Beneficios posibles",
                                              "Potential benefits",
                                            ),
                                            information_gaps: tr(
                                              "Información faltante",
                                              "Information gaps",
                                            ),
                                            local_review_risks: tr(
                                              "Revisión local",
                                              "Local review",
                                            ),
                                          } as Record<string, string>
                                        )[key]
                                      }
                                    </h4>
                                    {Array.isArray(entries) ? (
                                      <ul>
                                        {entries.map((entry, i) => (
                                          <li key={i}>{pick(entry)}</li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p>{pick(entries)}</p>
                                    )}
                                  </div>
                                ))}
                            </details>
                          </article>
                        ))}
                      </div>
                    </>
                  )}
              </div>
              <div className="present-actions">
                <Link href="/tool" onClick={savingField}>
                  {tr(
                    "Explorar este campo en la herramienta",
                    "Explore this field in the tool",
                  )}{" "}
                  ↗
                </Link>
                <Provenance metric={data.constraints.max_water_mm_year} />
              </div>
            </>
          )}
        </section>
      )}
      {view === "models" && (
        <section
          id="modelos"
          className="present-models"
          aria-labelledby="models-title"
        >
          <div className="present-shell present-section">
            <p className="present-kicker">
              02 / {tr("Del dato a la decisión", "From data to decision")}
            </p>
            <h2 id="models-title">{text[en ? 1 : 0]}</h2>
            <p>
              {tr(
                "Cambia de modelo para ver su función, su resultado y sus límites sobre el mismo campo. Las formas son esquemas; los valores publicados vienen de la API.",
                "Switch models to inspect their role, results and limits on the same field. Shapes are schematic; published values come from the API.",
              )}
            </p>
            <label className="mission-field-select">
              {tr("Parcela de análisis", "Analysis field")}
              <select value={parcel} onChange={(e) => reload(e.target.value)}>
                <option value="dv-nv-01">Diamond Valley / 01</option>
                <option value="dv-f001">Diamond Valley / F001</option>
                <option value="dv-f002">Diamond Valley / F002</option>
              </select>
            </label>
            <div className="present-actions">
              <button type="button" disabled={busy} onClick={() => reload()}>
                {busy
                  ? tr("Consultando API…", "Querying API…")
                  : tr("Ejecutar análisis", "Run analysis")}
              </button>
              <span role="status">
                {error
                  ? tr(
                      "La API no respondió. Puedes reintentar.",
                      "The API did not respond. You can retry.",
                    )
                  : ""}
              </span>
            </div>
            <div
              className="present-model-switch"
              role="group"
              aria-label={tr("Explorar modelos", "Explore models")}
            >
              {choices.map(([id, es, english, algo]) => (
                <Link
                  key={id}
                  href={`/presentacion/modelos/${id}`}
                  aria-current={active === id ? "page" : undefined}
                >
                  <span>{id === "physics" ? "ƒ" : `M${id}`}</span>
                  {tr(es!, english!)}
                  <small>{algo}</small>
                </Link>
              ))}
            </div>
            <div className="present-model-stage" key={`${active}-${parcel}`}>
              {data && active !== "3" && (
                <DataStatusBanner status={data.data_status} />
              )}
              <div className="present-model-intro">
                <span className="present-index">
                  {choices.find((c) => c[0] === active)?.[3]}
                </span>
                <p>{text[en ? 3 : 2]}</p>
              </div>
              {active !== "3" && <ModelMechanism model={active} data={data} />}
              {report && (
                <details className="mission-validation" open={active !== "3"}>
                  <summary>
                    {tr("Métrica y validación", "Metrics and validation")}
                  </summary>
                  <div className="present-model-metrics">
                    <p>
                      <strong>{report.status}</strong> · {report.algorithm}
                    </p>
                    <div>
                      <span>{pick(report.metric_name)}</span>
                      <strong>
                        {report.metric.value ?? "—"} {report.metric.unit}
                      </strong>
                      <Provenance metric={report.metric} />
                    </div>
                    <div>
                      <span>{pick(report.baseline_name)}</span>
                      <strong>
                        {report.baseline_metric.value ?? "—"}{" "}
                        {report.baseline_metric.unit}
                      </strong>
                      <Provenance metric={report.baseline_metric} />
                    </div>
                    <p>{pick(report.partition_method)}</p>
                    <p>{pick(report.active_mode_note)}</p>
                  </div>
                </details>
              )}
              {!data && (
                <p>
                  {tr(
                    "Ejecuta el análisis del campo para ver sus resultados. No se usan cifras de ejemplo como resultados reales.",
                    "Run the field analysis to see results. Example values are not used as real results.",
                  )}
                </p>
              )}
              {active === "3" && data && (
                <NeuralNetShowcase selectedParcelId={parcel} referenceVisual />
              )}
              {active === "3" && !data && <ReferenceNetwork />}
              {active === "1" && data && (
                <div className="present-water-bars">
                  {(scenario ?? data).strategies.map((s) => (
                    <div key={s.id}>
                      <span>{pick(s.title)}</span>
                      <div className="present-bar-track">
                        <span
                          style={{
                            width: `${Math.min(100, Math.max(0, ((s.metrics.annual_water_mm.value ?? 0) / maxWater) * 100))}%`,
                          }}
                        />
                      </div>
                      <strong>
                        {s.metrics.annual_water_mm.value ?? "—"} mm/
                        {tr("año", "yr")}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
              {active === "2" && report && (
                <p className="present-verdict">
                  {pick(report.active_mode_note)}
                </p>
              )}
              {active === "4" && data && (
                <div
                  className="table-wrap"
                  tabIndex={0}
                  role="region"
                  aria-label={tr(
                    "Intervalos regionales de humedad",
                    "Regional moisture intervals",
                  )}
                >
                  <table>
                    <caption>
                      {tr(
                        "Últimos doce meses · humedad regional, no medición de parcela",
                        "Last twelve months · regional moisture, not a field measurement",
                      )}
                    </caption>
                    <thead>
                      <tr>
                        {[
                          tr("Mes", "Month"),
                          "SMAP (m³/m³)",
                          tr("Intervalo modelado", "Modeled interval"),
                        ].map((label) => (
                          <th key={label} scope="col">
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.timeline.slice(-12).map((m) => (
                        <tr key={m.month}>
                          <th scope="row">{m.month}</th>
                          <td>{m.soil_moisture.value ?? "—"}</td>
                          <td>
                            {m.soil_moisture.interval
                              ? `${m.soil_moisture.interval.lower} – ${m.soil_moisture.interval.upper}`
                              : tr("Sin intervalo", "No interval")}
                            <Provenance metric={m.soil_moisture} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {active === "5" && (
                <>
                  <p>
                    {tr(
                      "Estado del artefacto de secuencias",
                      "Sequence artifact status",
                    )}
                    : {seq?.status ?? tr("No disponible", "Unavailable")}
                  </p>
                  {seq?.status === "trained" && (
                    <p>
                      {tr(
                        "Log-verosimilitud por año en el valle no visto",
                        "Log-likelihood per year on the unseen valley",
                      )}
                      : <strong>{seq.metric ?? "—"}</strong> ·{" "}
                      {tr("Línea base", "Baseline")}: {seq.baseline ?? "—"}.{" "}
                      {tr(
                        "Métrica global de validación, no probabilidad de esta parcela. Pierde ligeramente en exactitud top-1; consulta la ficha.",
                        "Global validation metric, not this field’s probability. It loses slightly on top-1 accuracy; see the card.",
                      )}
                    </p>
                  )}
                  {data && (
                    <div className="present-sequences">
                      {(scenario ?? data).strategies.map((s) => (
                        <div key={s.id}>
                          <h4>{pick(s.title)}</h4>
                          <p>
                            {tr(
                              "Secuencia final tras reglas y selección; puede venir del catálogo o del modelo.",
                              "Final sequence after rules and selection; it may come from the catalogue or the model.",
                            )}
                          </p>
                          <ol>
                            {Array.from({ length: 3 }, (_, i) => (
                              <li key={i}>
                                <strong>
                                  {tr("Año", "Year")} {i + 1}
                                </strong>
                                <span>
                                  {Array.from(
                                    new Set(
                                      s.sequence_36m
                                        .slice(i * 12, i * 12 + 12)
                                        .map((m) => pick(m.crop_label)),
                                    ),
                                  ).join(" / ")}
                                </span>
                              </li>
                            ))}
                          </ol>
                          <Provenance
                            metric={s.metrics.soil_cover_months_36m}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              {active === "physics" && (
                <div className="present-equations">
                  <article>
                    <h4>{tr("Demanda del cultivo", "Crop demand")}</h4>
                    <p>
                      <code>ETc = Kc × ET₀</code>
                    </p>
                    <p>
                      {tr(
                        "FAO-56: coeficiente declarado del cultivo y evapotranspiración de referencia. El modelo 1 puede sustituir esta estimación de ET.",
                        "FAO-56: declared crop coefficient and reference evapotranspiration. Model 1 can replace this ET estimate.",
                      )}
                    </p>
                  </article>
                  <article>
                    <h4>
                      {tr("Riego neto estimado", "Estimated net irrigation")}
                    </h4>
                    <p>
                      <code>max(0, ET − P_effective)</code>
                    </p>
                    <p>
                      {tr(
                        "Lluvia efectiva con USDA SCS. No incluye pérdidas del sistema de riego; no equivale a extracción medida.",
                        "Effective rainfall uses USDA SCS. Irrigation-system losses are not included; this is not measured pumping.",
                      )}
                    </p>
                  </article>
                  <article>
                    <h4>{tr("Verdor del satélite", "Satellite greenness")}</h4>
                    <p>
                      <code>NDVI = (NIR − Red) / (NIR + Red)</code>
                    </p>
                    <p>
                      {tr(
                        "Un índice de vegetación, no una medida de rendimiento. NDMI, BSI y NDTI aportan señales complementarias.",
                        "A vegetation index, not a yield measurement. NDMI, BSI and NDTI provide complementary signals.",
                      )}
                    </p>
                  </article>
                </div>
              )}
              <a
                href={`https://github.com/H0M10/MorrisTeamDfs/tree/main/${cardPath}`}
              >
                {tr(
                  "Ver método, código y límites",
                  "View methods, code and limits",
                )}{" "}
                ↗
              </a>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

export function FieldFilm() {
  const { lang } = useI18n();
  const en = lang === "en";
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch("/showcase/clip-status/hf-01-orbit-valley.mp4")
      .then((r) => r.json())
      .then((r: { exists?: boolean }) => {
        if (alive) setAvailable(Boolean(r.exists));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  if (!available) return null;
  return (
    <section
      className="present-film present-shell"
      aria-label={
        en
          ? "From orbit to the field: illustration"
          : "De la órbita al campo: ilustración"
      }
    >
      <video
        controls
        preload="none"
        playsInline
        aria-label={
          en
            ? "Silent illustrative descent from orbit to an irrigated valley"
            : "Ilustración sin audio de un descenso desde órbita hasta un valle de riego"
        }
      >
        <source src="/clips/hf-01-orbit-valley.mp4" type="video/mp4" />
      </video>
      <p>
        {en
          ? "AI-generated illustration · a descent from orbit to irrigated fields. Not a recording of this parcel or satellite measurements. Silent, optional playback."
          : "Ilustración generada con IA · descenso desde órbita hasta campos de riego. No es una grabación de esta parcela ni una medición satelital. Sin audio y con reproducción opcional."}
      </p>
    </section>
  );
}
