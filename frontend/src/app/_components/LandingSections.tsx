"use client";
// Secciones de la portada pensadas para la rúbrica de Space Apps: impacto
// (el problema con fuente), creatividad (lo que nos distingue), viabilidad
// (métricas leídas en vivo de la API y la prueba con personas) y respuesta al
// reto (cada requisito con la pantalla donde se ve). Ninguna cifra está
// escrita a mano: las de los modelos llegan de /api/v1/evaluate.
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, API_URL } from "@/lib/api";
import type { Evaluation, MetricValue } from "@/lib/contract";
import { useI18n } from "@/lib/i18n";

const CASE_ID = "dv-nv-01";

/** El problema real, con su fuente (Nevada Division of Water Resources). */
export function ProblemNote() {
  const { lang } = useI18n();
  const en = lang === "en";
  return (
    <p className="landing-problem">
      {en
        ? "In Diamond Valley, Nevada, groundwater has dropped about 2 feet a year since 1960. In 2015 it became the state's first Critical Management Area, and its irrigators must cut pumping. Deciding what to grow next is now a water decision."
        : "En Diamond Valley, Nevada, el agua subterránea baja unos 60 cm (2 pies) al año desde 1960. En 2015 se convirtió en la primera Zona de Manejo Crítico del estado y sus regantes deben reducir el bombeo. Decidir qué sembrar después ya es una decisión de agua."}{" "}
      <a href="https://tools.water.nv.gov/DiamondValleyGMP.aspx" rel="noreferrer" target="_blank">
        {en ? "Source: Nevada Division of Water Resources" : "Fuente: Nevada Division of Water Resources"}
      </a>
    </p>
  );
}

export function Differentiators() {
  const { lang } = useI18n();
  const en = lang === "en";
  const items = en
    ? [
        ["It tells you what it does not know", "Every number shows its source, date, scale and type. Models that lose to their baseline are published anyway. The language model is not allowed to produce numbers."],
        ["Constraints come first", "Water, buyers, machinery and planting dates are checked before anything else. A rotation that does not fit is ruled out and the screen says why."],
        ["Made for everyone in the field", "A voice tutor that explains each screen, works with screen readers, high contrast for direct sun, large text and English or Spanish."],
      ]
    : [
        ["Te dice lo que no sabe", "Cada cifra muestra su fuente, fecha, escala y tipo. Los modelos que pierden contra su línea base se publican igual. El modelo de lenguaje tiene prohibido producir cifras."],
        ["Las restricciones van primero", "Agua, compradores, maquinaria y fechas de siembra se revisan antes que nada. Una rotación que no cabe se descarta y la pantalla dice por qué."],
        ["Hecha para todos en el campo", "Un tutor por voz que explica cada pantalla, compatible con lectores de pantalla, alto contraste para el sol, letra grande y español o inglés."],
      ];
  return (
    <section className="landing-band" aria-labelledby="diff-title">
      <h2 id="diff-title">{en ? "What makes Field Shift different" : "Lo que hace distinto a Field Shift"}</h2>
      <ol className="landing-diff">
        {items.map(([title, text]) => (
          <li key={title}>
            <h3>{title}</h3>
            <p>{text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

type ModelKey = keyof Evaluation["models"];
const NAMES: Record<ModelKey, [string, string]> = {
  model_1_crop_water: ["1. Agua que usa cada cultivo", "1. Water each crop uses"],
  model_2_prior_crop_effect: ["2. Efecto del cultivo anterior", "2. Effect of the previous crop"],
  model_3_crop_history_gru: ["3. Lectura del historial de cultivos", "3. Reading the crop history"],
  model_4_moisture_cqr: ["4. Humedad del suelo con intervalo", "4. Soil moisture with an interval"],
};
/** Cómo se decide si el modelo gana a su línea base (dirección de la métrica). */
const WINS: Record<ModelKey, (m: number, b: number) => boolean> = {
  model_1_crop_water: (m, b) => m < b, // error en mm: menos es mejor
  model_2_prior_crop_effect: (m) => m > 0, // mejora en %: negativo es perder
  model_3_crop_history_gru: (m, b) => m > b, // F1: más es mejor
  model_4_moisture_cqr: (m, b) => Math.abs(m - 90) < Math.abs(b - 90), // cobertura: cerca de 90 %
};

export function ModelProof() {
  const { lang, pick } = useI18n();
  const en = lang === "en";
  const [models, setModels] = useState<Evaluation["models"] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    api.evaluate(CASE_ID).then(
      (evaluation) => alive && setModels(evaluation.models),
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, []);
  const fmt = (metric: MetricValue) =>
    metric.value === null
      ? "—"
      : `${new Intl.NumberFormat(en ? "en-US" : "es-MX", { maximumFractionDigits: 2 }).format(metric.value)} ${metric.unit}`;

  return (
    <section className="landing-band" aria-labelledby="proof-title">
      <h2 id="proof-title">{en ? "Tested, not promised" : "Probado, no prometido"}</h2>
      <p className="landing-lead">
        {en
          ? "Each model is measured on a valley it never saw during training and compared with a simple baseline. These values are read live from our API."
          : "Cada modelo se mide en un valle que no vio al entrenar y se compara con una línea base sencilla. Estas cifras se leen en vivo de nuestra API."}
      </p>
      {failed && <p role="alert">{en ? "The API did not answer. Try again in a moment." : "La API no respondió. Intenta de nuevo en un momento."}</p>}
      {!models && !failed && <p role="status">{en ? "Loading live metrics…" : "Cargando métricas en vivo…"}</p>}
      {models && (
        <div className="table-wrap" tabIndex={0} role="region" aria-labelledby="proof-title">
          <table className="landing-proof">
            <caption>{en ? "Model vs. baseline on an unseen valley (Diamond Valley, NV)" : "Modelo contra línea base en un valle no visto (Diamond Valley, NV)"}</caption>
            <thead>
              <tr>
                <th scope="col">{en ? "Model" : "Modelo"}</th>
                <th scope="col">{en ? "Measure" : "Medida"}</th>
                <th scope="col">{en ? "Model" : "Modelo"}</th>
                <th scope="col">{en ? "Baseline" : "Línea base"}</th>
                <th scope="col">{en ? "Result" : "Resultado"}</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(WINS) as ModelKey[]).map((key) => {
                const report = models[key];
                const m = report.metric?.value ?? null;
                const b = report.baseline_metric?.value ?? null;
                const won = m !== null && b !== null ? WINS[key](m, b) : null;
                return (
                  <tr key={key}>
                    <th scope="row">
                      {en ? NAMES[key][1] : NAMES[key][0]}
                      <span className="landing-small"> · {report.algorithm}</span>
                    </th>
                    <td>{report.metric_name ? pick(report.metric_name) : "—"}</td>
                    <td>{report.metric ? fmt(report.metric) : "—"}</td>
                    <td>
                      {report.baseline_metric ? fmt(report.baseline_metric) : "—"}
                      {report.baseline_name && <span className="landing-small"> · {pick(report.baseline_name)}</span>}
                    </td>
                    <td className={won ? "proof-win" : "proof-loss"}>
                      {won === null
                        ? "—"
                        : won
                          ? en ? "✓ Beats its baseline" : "✓ Gana a su línea base"
                          : en ? "✕ Loses — published anyway" : "✕ Pierde — lo publicamos igual"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="landing-small">
        {en ? "Full cards, splits and limits: " : "Fichas completas, particiones y límites: "}
        <Link href="/presentacion/modelos/3">{en ? "the models chapter" : "el capítulo de modelos"}</Link>
        {" · "}
        <a href={`${API_URL}/health`} rel="noreferrer" target="_blank">
          {en ? "live API status" : "estado de la API en vivo"}
        </a>
      </p>
    </section>
  );
}

export function PeopleTest() {
  const { lang } = useI18n();
  const en = lang === "en";
  return (
    <section className="landing-band" aria-labelledby="people-title">
      <div>
        <h2 id="people-title">{en ? "Tested with people" : "Probado con personas"}</h2>
        <p>
          {en
            ? "We asked 10 people to analyze their own field on a phone. In the first version, none of them finished. They got stuck marking the field, the tutor got in the way, and the answer was hidden."
            : "Pedimos a 10 personas analizar su propio campo desde el teléfono. En la primera versión, ninguna terminó. Se atoraron al marcar el campo, el tutor estorbaba y la respuesta estaba escondida."}
        </p>
        <h3>{en ? "What we changed" : "Lo que cambiamos"}</h3>
        <ul>
          <li>{en ? "The map comes first, with your location, search and one clear instruction on top of it." : "El mapa va primero, con tu ubicación, la búsqueda y una sola instrucción encima."}</li>
          <li>{en ? "The tutor never opens by itself; it waits in a corner until you ask." : "El tutor ya no se abre solo: espera en una esquina hasta que lo llamas."}</li>
          <li>{en ? "Steps fit on a phone: “Step 2 of 6” with a progress bar instead of six crowded buttons." : "Los pasos caben en el teléfono: «Paso 2 de 6» con barra de avance en lugar de seis botones apretados."}</li>
        </ul>
        <p className="landing-small">
          {en
            ? "Next: repeat the same task with the same people and with local irrigation advisers."
            : "Lo que sigue: repetir la misma tarea con las mismas personas y con técnicos de riego locales."}
        </p>
      </div>
    </section>
  );
}

export function ChallengeMap() {
  const { lang } = useI18n();
  const en = lang === "en";
  const rows: [string, string, string, string, string][] = [
    ["NASA Earth observations", "Observaciones de la NASA", "/presentacion/evidencia", "Landsat/HLS 30 m, POWER, SMAP 9 km, SRTM, with native scale on every number", "Landsat/HLS 30 m, POWER, SMAP 9 km, SRTM, con la escala nativa en cada cifra"],
    ["Local soil, crop traits and farmer priorities", "Suelo local, rasgos de cultivo y prioridades", "/tool/rotaciones", "“What matters most to you?” orders the options without made-up scores", "«¿Qué te importa más?» ordena las opciones sin puntajes inventados"],
    ["Farmer constraints", "Restricciones del agricultor", "/tool/restricciones", "Water, machinery, buyers and planting window, evaluated first", "Agua, maquinaria, compradores y ventana de siembra, evaluados primero"],
    ["At least three rotations, including the current one", "Al menos tres rotaciones, incluida la actual", "/tool/rotaciones", "Side by side, with a 36-month calendar", "Lado a lado, con un calendario de 36 meses"],
    ["Why, evidence, benefits, missing information, local risks", "Por qué, evidencia, beneficios, lo que falta, riesgos locales", "/tool/evidencia", "One evidence card per rotation", "Una ficha de evidencia por rotación"],
    ["Bare-field periods and vulnerable seasons", "Periodos sin cobertura y temporadas vulnerables", "/tool/retrato", "“When is your field exposed?” from satellite greenness and frost and heat days", "«¿Cuándo está expuesto tu campo?» con el verdor del satélite y los días de helada y calor"],
    ["Uncertainty explained", "Incertidumbre explicada", "/presentacion/modelos/4", "90% intervals and model-vs-baseline metrics", "Intervalos al 90 % y métricas contra línea base"],
    ["Supports, does not replace, local expertise", "Apoya, no reemplaza, al experto local", "/tool/compartir", "Shareable sheet and technician review", "Hoja para compartir y revisión del técnico"],
    ["Farmer-centered, plain language", "Centrado en el agricultor, lenguaje llano", "/accesibilidad", "Voice tutor, screen readers, sun mode, US units", "Tutor por voz, lectores de pantalla, modo sol, unidades de EE. UU."],
  ];
  return (
    <section className="landing-band" aria-labelledby="map-title">
      <h2 id="map-title">{en ? "What the challenge asks, and where to see it" : "Lo que pide el reto y dónde verlo"}</h2>
      <div className="table-wrap" tabIndex={0} role="region" aria-labelledby="map-title">
        <table className="landing-map">
          <thead>
            <tr>
              <th scope="col">{en ? "The challenge asks for" : "El reto pide"}</th>
              <th scope="col">{en ? "How we do it" : "Cómo lo hacemos"}</th>
              <th scope="col">{en ? "See it" : "Verlo"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([enAsk, esAsk, href, enHow, esHow]) => (
              <tr key={href + enAsk}>
                <th scope="row">
                  <span aria-hidden="true">✓ </span>
                  {en ? enAsk : esAsk}
                </th>
                <td>{en ? enHow : esHow}</td>
                <td>
                  <Link href={href}>{en ? "Open" : "Abrir"} ↗</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
