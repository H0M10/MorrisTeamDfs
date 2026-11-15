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
    <section className="present-shell present-section" aria-labelledby="diff-title">
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
    <section className="present-shell present-section" aria-labelledby="proof-title">
      <h2 id="proof-title">{en ? "Tested, not promised" : "Probado, no prometido"}</h2>
      <p className="present-lead">
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
    <section className="present-shell present-section" aria-labelledby="map-title">
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

/** El problema: el acuífero de Diamond Valley, con sus fuentes oficiales. */
export function ValleyProblem() {
  const { lang } = useI18n();
  const en = lang === "en";
  const facts = en
    ? [
        ["About 2 feet a year", "Groundwater in Diamond Valley has dropped about 2 feet (60 cm) a year since 1960, mostly from irrigation pumping."],
        ["2015", "Nevada's State Engineer made it the state's first Critical Management Area (Order 1264)."],
        ["35 years", "A plan backed by 257 water-right holders (Order 1302, 2019) must bring pumping down to the valley's natural recharge."],
      ]
    : [
        ["Unos 60 cm al año", "El agua subterránea de Diamond Valley baja unos 60 cm (2 pies) al año desde 1960, sobre todo por el bombeo para riego."],
        ["2015", "El Ingeniero Estatal de Nevada la declaró la primera Zona de Manejo Crítico del estado (Orden 1264)."],
        ["35 años", "Un plan apoyado por 257 titulares de derechos de agua (Orden 1302, 2019) debe bajar el bombeo hasta la recarga natural del valle."],
      ];
  return (
    <section className="present-shell present-section" aria-labelledby="valley-title">
      <h2 id="valley-title">{en ? "The valley is running out of water" : "El valle se está quedando sin agua"}</h2>
      <p className="present-lead">
        {en
          ? "Every irrigator there will have to grow the same farm with less water. Which crops, in which order, and what happens to the soil in between: that is the decision Field Shift supports."
          : "Cada regante tendrá que sacar adelante su campo con menos agua. Qué cultivos, en qué orden y qué le pasa al suelo entre uno y otro: esa es la decisión que apoya Field Shift."}
      </p>
      <dl className="landing-facts">
        {facts.map(([big, text]) => (
          <div key={big}>
            <dt>{big}</dt>
            <dd>{text}</dd>
          </div>
        ))}
      </dl>
      <p className="landing-small">
        {en ? "Sources: " : "Fuentes: "}
        <a href="https://tools.water.nv.gov/DiamondValleyGMP.aspx" rel="noreferrer" target="_blank">
          Nevada Division of Water Resources, Diamond Valley GMP
        </a>
        {" · "}
        <a href="https://eurekasentinel.com/checking-in-on-diamond-valleys-groundwater-management-plan" rel="noreferrer" target="_blank">
          Eureka Sentinel
        </a>
        {en
          ? ". This valley is also the case named in the NASA challenge."
          : ". Este valle es además el caso que nombra el reto de la NASA."}
      </p>
    </section>
  );
}

/** Los datos que propone la NASA en el reto y qué hacemos con cada uno (o por qué no). */
export function NasaData() {
  const { lang } = useI18n();
  const en = lang === "en";
  const used: [string, string, string, string][] = [
    ["Landsat / HLS (NASA + USGS)", "30 m", "Greenness, moisture, bare-soil and residue indices every month; the color strip of the field; input of model 3.", "Verdor, humedad, suelo desnudo y rastrojo cada mes; la tira de color del campo; entrada del modelo 3."],
    ["NASA POWER", "≈ 50 km", "Reference evapotranspiration (Penman-Monteith), rain, temperature, frost and heat days.", "Evapotranspiración de referencia (Penman-Monteith), lluvia, temperatura, días de helada y calor."],
    ["SMAP", "9 km", "Regional soil moisture: the ground truth that calibrates model 4. Shown as regional, never as the field.", "Humedad regional del suelo: la verdad con que se calibra el modelo 4. Se muestra como regional, nunca como la parcela."],
    ["SRTM", "30 m", "Elevation and slope of the field; input of model 1.", "Elevación y pendiente del campo; entrada del modelo 1."],
    ["USDA Cropland Data Layer", "30 m", "What was grown each year: labels for models 2, 3 and 5.", "Qué se sembró cada año: etiquetas de los modelos 2, 3 y 5."],
    ["OpenET", "30 m", "Measured water use per field: the label model 1 learns from.", "Agua usada medida por campo: la etiqueta con la que aprende el modelo 1."],
    ["SSURGO / SoilGrids", "250 m", "Clay, sand and organic matter.", "Arcilla, arena y materia orgánica."],
  ];
  const notUsed: [string, string, string][] = [
    ["GRACE / GRACE-FO", "Hundreds of km: useful for the basin story, too coarse to inform one field.", "Cientos de km: sirve para contar la cuenca, demasiado grueso para decidir un campo."],
    ["ECOSTRESS", "Asynchronous ordering made it too slow for the weekend; OpenET covers field-scale water use.", "Su cola de pedidos era demasiado lenta para el fin de semana; OpenET cubre el agua a escala de campo."],
    ["GEDI", "Measures forest structure; not useful for annual crops.", "Mide estructura de bosques; no sirve para cultivos anuales."],
    ["GPM IMERG", "Rain comes from NASA POWER, which already gives daily rainfall for the same cell.", "La lluvia la tomamos de NASA POWER, que ya da la lluvia diaria de la misma celda."],
    ["MODIS", "Landsat/HLS sees the field at 30 m instead of 250 m.", "Landsat/HLS ve el campo a 30 m en lugar de 250 m."],
  ];
  return (
    <section className="method-block" aria-labelledby="nasa-title">
      <h2 id="nasa-title">{en ? "The NASA data we use, and how" : "Los datos de la NASA que usamos y cómo"}</h2>
      <p className="present-lead">
        {en
          ? "Every number on screen keeps the native scale of the source it came from. Coarse sources describe the region; they are never shown as if they measured your field."
          : "Cada cifra en pantalla conserva la escala nativa de su fuente. Las fuentes gruesas describen la región; nunca se muestran como si midieran tu campo."}
      </p>
      <div className="table-wrap" tabIndex={0} role="region" aria-labelledby="nasa-title">
        <table className="landing-map">
          <thead>
            <tr>
              <th scope="col">{en ? "Source" : "Fuente"}</th>
              <th scope="col">{en ? "Pixel size" : "Tamaño del píxel"}</th>
              <th scope="col">{en ? "What we do with it" : "Qué hacemos con ella"}</th>
            </tr>
          </thead>
          <tbody>
            {used.map(([name, scale, enText, esText]) => (
              <tr key={name}>
                <th scope="row">{name}</th>
                <td>{scale}</td>
                <td>{en ? enText : esText}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>{en ? "Suggested by the challenge, not used, and why" : "Propuestos por el reto que no usamos, y por qué"}</h3>
      <ul className="landing-list">
        {notUsed.map(([name, enText, esText]) => (
          <li key={name}>
            <strong>{name}:</strong> {en ? enText : esText}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** El desafío tal como lo publica la NASA, citado; de aquí parte todo lo demás. */
export function NasaChallenge() {
  const { lang } = useI18n();
  const en = lang === "en";
  const asks = en
    ? [
        "Use NASA Earth observations together with local soil information, crop characteristics and farmer priorities.",
        "Help farmers explore crop-rotation strategies that could strengthen soil health and adapt to changing weather and water.",
        "Compare at least three rotation strategies, including the existing rotation.",
        "Highlight when fields are typically bare and the seasons when current crops look more vulnerable.",
        "For each strategy, explain why it was suggested, what evidence supports it, what benefits it may offer, where information gaps exist and which risks need local review.",
        "Be a supportive tool that does not replace farmer judgment or local agricultural expertise.",
      ]
    : [
        "Usar observaciones de la Tierra de la NASA junto con información local del suelo, características de los cultivos y prioridades del agricultor.",
        "Ayudar al agricultor a explorar estrategias de rotación que fortalezcan la salud del suelo y se adapten a los cambios de clima y agua.",
        "Comparar al menos tres estrategias de rotación, incluida la rotación actual.",
        "Señalar cuándo el campo suele quedar sin cubrir y en qué temporadas el cultivo actual es más vulnerable.",
        "Para cada estrategia, explicar por qué se sugiere, qué evidencia la apoya, qué beneficios puede ofrecer, qué información falta y qué riesgos necesitan revisión local.",
        "Ser una herramienta de apoyo que no reemplace el juicio del agricultor ni la experiencia agrícola local.",
      ];
  return (
    <section className="present-shell present-section" aria-labelledby="challenge-title">
      <h2 id="challenge-title">{en ? "The NASA challenge, as written" : "El desafío de la NASA, tal cual"}</h2>
      <blockquote className="landing-quote" lang="en" cite="https://www.spaceappschallenge.org/">
        <p>
          “Farmers around the world navigate shifting temperatures, changing rainfall patterns, water shortages, extreme
          weather, and declining soil health. These pressures make it difficult to choose crop rotations that protect
          fields, conserve water, and support long-term resilience. Your challenge is to create a decision-support tool
          that uses NASA Earth observations along with local soil information, crop characteristics, and farmer priorities
          to help farmers explore rotation strategies that could strengthen soil health and adapt their farms to changing
          conditions.”
        </p>
        <footer>NASA Space Apps Challenge 2026 · Field Shift: Adapting Farms with NASA Data</footer>
      </blockquote>
      {!en && (
        <p className="present-lead">
          Traducción: los agricultores enfrentan temperaturas cambiantes, lluvias irregulares, escasez de agua, clima
          extremo y suelos cada vez más pobres. Eso dificulta elegir rotaciones que protejan el campo, ahorren agua y den
          resiliencia a largo plazo. El reto es crear una herramienta de apoyo a la decisión que use observaciones de la
          Tierra de la NASA junto con información local del suelo, características de los cultivos y prioridades del
          agricultor, para explorar rotaciones que fortalezcan la salud del suelo y adapten el campo a condiciones
          cambiantes.
        </p>
      )}
      <h3>{en ? "What it explicitly asks for" : "Lo que pide de forma explícita"}</h3>
      <ol className="landing-asks">
        {asks.map((ask) => (
          <li key={ask}>
            <span>{ask}</span>
          </li>
        ))}
      </ol>
      <p className="landing-small">
        {en
          ? "Below, each of these points is linked to the screen of the tool where you can check it."
          : "Más abajo, cada uno de estos puntos lleva a la pantalla de la herramienta donde se puede comprobar."}
      </p>
    </section>
  );
}

/** Consideraciones opcionales del reto: qué cubrimos, qué en parte y qué no. */
export function OptionalCoverage() {
  const { lang } = useI18n();
  const en = lang === "en";
  const rows: ["yes" | "part" | "no", string, string][] = [
    ["yes", "Explain terms such as evapotranspiration, NDVI or frost risk: glossary and voice tutor on every screen.", "Explicar términos como evapotranspiración, NDVI o riesgo de helada: glosario y tutor por voz en cada pantalla."],
    ["yes", "Satellite vs. ground: every number carries its native scale; regional sources are never shown as the field.", "Satélite frente a terreno: cada cifra lleva su escala nativa; las fuentes regionales nunca se muestran como la parcela."],
    ["yes", "Uncertainty and where local expertise is needed: calibrated 90% intervals and a “risks for local review” section per rotation.", "Incertidumbre y dónde hace falta el experto local: intervalos calibrados al 90 % y un apartado de «riesgos para revisión local» por rotación."],
    ["yes", "Harmonize resolutions: every source is aggregated to field and month, keeping its original scale on record.", "Armonizar resoluciones: cada fuente se agrega a campo y mes, conservando su escala original."],
    ["yes", "Farmer priorities and constraints: water, machinery, buyers, planting window and “what matters most”.", "Prioridades y restricciones del agricultor: agua, maquinaria, compradores, ventana de siembra y «qué te importa más»."],
    ["yes", "Timeline and scenario: 36-month calendar and a “what if your water limit changes?” scenario.", "Línea de tiempo y escenario: calendario de 36 meses y el escenario «¿y si cambia tu límite de agua?»."],
    ["part", "Market suitability: buyers are a hard constraint; prices are shown as missing information, not guessed.", "Mercado: el comprador es una restricción obligatoria; los precios se muestran como información que falta, no se adivinan."],
    ["no", "Erosion-risk zones, pest-cycle disruption and nitrogen credits of legumes: not modeled yet, and the evidence cards say so.", "Zonas de riesgo de erosión, ciclos de plagas y el nitrógeno que aportan las leguminosas: todavía no se modelan, y las fichas de evidencia lo dicen."],
  ];
  const label = { yes: en ? "Covered" : "Cubierto", part: en ? "Partly" : "En parte", no: en ? "Not yet" : "Todavía no" };
  return (
    <section className="present-shell present-section" aria-labelledby="optional-title">
      <h2 id="optional-title">{en ? "The challenge's optional considerations" : "Las consideraciones opcionales del reto"}</h2>
      <ul className="landing-coverage">
        {rows.map(([state, enText, esText]) => (
          <li key={enText} data-state={state}>
            <strong>{label[state]}</strong>
            <span>{en ? enText : esText}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Por qué las herramientas de apoyo a la decisión agrícola no se usan, con fuentes, y qué hacemos contra cada causa. */
export function FarmerAdoption() {
  const { lang } = useI18n();
  const en = lang === "en";
  const rows: [string, string, string, string][] = [
    [
      "Poor usability: complex interfaces, cluttered screens, confusing terms.",
      "Mala usabilidad: interfaces complejas, pantallas saturadas, términos confusos.",
      "One decision per screen, plain language without acronyms, a glossary and a voice tutor that explains each part.",
      "Una decisión por pantalla, lenguaje llano sin siglas, glosario y un tutor por voz que explica cada parte.",
    ],
    [
      "Not relevant to the farmer's own field and situation.",
      "No es relevante para el campo y la situación del agricultor.",
      "Analyzes the farmer's own field anywhere in the 48 contiguous states, with their water, buyers, machinery and planting window.",
      "Analiza el campo del propio agricultor en cualquiera de los 48 estados contiguos, con su agua, compradores, maquinaria y fechas de siembra.",
    ],
    [
      "Low trust: the farmer cannot see where a recommendation comes from.",
      "Poca confianza: el agricultor no ve de dónde sale una recomendación.",
      "Every number shows its source, date, scale and type; models that lose are published; nothing is invented by the language model.",
      "Cada cifra muestra fuente, fecha, escala y tipo; los modelos que pierden se publican; el modelo de lenguaje no inventa nada.",
    ],
    [
      "Unclear return and high cost.",
      "Retorno poco claro y costo alto.",
      "Free, runs in any phone browser, no hardware or account; the result is in water and soil terms the farmer already manages.",
      "Gratis, funciona en el navegador de cualquier teléfono, sin equipo ni cuenta; el resultado habla de agua y suelo, lo que el agricultor ya maneja.",
    ],
    [
      "Advisers use these tools far more than farmers do.",
      "Los técnicos usan estas herramientas mucho más que los agricultores.",
      "Built for both: the farmer decides, and a shareable sheet and review screen let the local adviser approve, correct or reject.",
      "Hecha para los dos: el agricultor decide, y una hoja para compartir y una pantalla de revisión dejan que el técnico local apruebe, corrija o descarte.",
    ],
  ];
  return (
    <section className="present-shell present-section" aria-labelledby="adoption-title">
      <p className="present-kicker">{en ? "Why tools fail" : "Por qué fallan las herramientas"}</p>
      <h2 id="adoption-title">
        {en ? "Most farm decision tools are built, then not used." : "La mayoría de las herramientas agrícolas se construyen y luego no se usan."}
      </h2>
      <dl className="adoption-facts">
        <div>
          <dt>49 %</dt>
          <dd>
            {en
              ? "of farmers used any decision-support tool, against all of the advisers surveyed (Rose et al., 2016)."
              : "de los agricultores usaba alguna herramienta de apoyo a la decisión, frente a todos los técnicos encuestados (Rose et al., 2016)."}
          </dd>
        </div>
        <div>
          <dt>15</dt>
          <dd>
            {en
              ? "factors explain low uptake; usability, relevance, performance and cost-effectiveness lead the list (Rose et al., 2016)."
              : "factores explican el bajo uso; encabezan la lista la usabilidad, la relevancia, el desempeño y el costo-beneficio (Rose et al., 2016)."}
          </dd>
        </div>
        <div>
          <dt>49 %</dt>
          <dd>
            {en
              ? "of farmers worldwide use at least one agtech solution; unclear return and cost are the main barriers (McKinsey, Global Farmer Insights)."
              : "de los agricultores del mundo usa al menos una solución agtech; el retorno poco claro y el costo son las barreras principales (McKinsey, Global Farmer Insights)."}
          </dd>
        </div>
      </dl>
      <div className="table-wrap" tabIndex={0} role="region" aria-labelledby="adoption-title">
        <table className="landing-map">
          <thead>
            <tr>
              <th scope="col">{en ? "Why tools fail" : "Por qué fallan"}</th>
              <th scope="col">{en ? "What Field Shift does" : "Qué hace Field Shift"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([enWhy, esWhy, enDo, esDo]) => (
              <tr key={enWhy}>
                <th scope="row">{en ? enWhy : esWhy}</th>
                <td>{en ? enDo : esDo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="present-note">
        {en ? "Sources: " : "Fuentes: "}
        <a href="https://www.repository.cam.ac.uk/handle/1810/261110" rel="noreferrer" target="_blank">
          Rose, D. C. et al. (2016). Decision support tools for agriculture: Towards effective design and delivery. Agricultural Systems
        </a>
        {" · "}
        <a href="https://www.mckinsey.com/industries/agriculture/our-insights/global-farmer-insights" rel="noreferrer" target="_blank">
          McKinsey, Global Farmer Insights
        </a>
        {" · "}
        <a href="https://www.mckinsey.com/industries/agriculture/our-insights/agtech-breaking-down-the-farmer-adoption-dilemma" rel="noreferrer" target="_blank">
          McKinsey, Agtech: breaking down the farmer adoption dilemma
        </a>
      </p>
    </section>
  );
}
