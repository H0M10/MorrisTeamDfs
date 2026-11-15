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
    <section className="landing-band" aria-labelledby="valley-title">
      <h2 id="valley-title">{en ? "The valley is running out of water" : "El valle se está quedando sin agua"}</h2>
      <p className="landing-lead">
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
    <section className="landing-band" aria-labelledby="nasa-title">
      <h2 id="nasa-title">{en ? "The NASA data we use, and how" : "Los datos de la NASA que usamos y cómo"}</h2>
      <p className="landing-lead">
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

/** Cómo funciona por dentro: el motor físico, los cinco modelos y su validación. */
export function HowItWorks() {
  const { lang } = useI18n();
  const en = lang === "en";
  const steps: { title: [string, string]; formula: [string, string]; text: [string, string] }[] = [
    {
      title: ["1. Constraints first", "1. Restricciones primero"],
      formula: ["viable ⇔ water ≤ limit ∧ buyer ∧ machinery ∧ planting window", "viable ⇔ agua ≤ límite ∧ comprador ∧ maquinaria ∧ ventana de siembra"],
      text: [
        "Before ranking anything, each rotation is checked against what the farmer declared. If none passes, the tool says so and does not fill the gap with a recommendation.",
        "Antes de ordenar nada, cada rotación se revisa contra lo que declaró el agricultor. Si ninguna pasa, la herramienta lo dice y no rellena con una recomendación.",
      ],
    },
    {
      title: ["2. Physical water balance (FAO-56)", "2. Balance de agua físico (FAO-56)"],
      formula: ["ETc = Kc × ET0      net irrigation = max(0, ETc − effective rain)", "ETc = Kc × ET0      riego neto = max(0, ETc − lluvia efectiva)"],
      text: [
        "ET0 is computed with FAO-56 Penman-Monteith from NASA POWER weather; Kc is each crop's monthly coefficient; effective rain follows the USDA SCS method. Deterministic and auditable.",
        "ET0 se calcula con Penman-Monteith FAO-56 a partir del clima de NASA POWER; Kc es el coeficiente mensual de cada cultivo; la lluvia efectiva sigue el método USDA SCS. Determinista y auditable.",
      ],
    },
    {
      title: ["3. What the satellite sees", "3. Lo que ve el satélite"],
      formula: ["NDVI = (NIR − Red) / (NIR + Red)      NDMI = (NIR − SWIR1) / (NIR + SWIR1)", "NDVI = (NIR − Rojo) / (NIR + Rojo)      NDMI = (NIR − SWIR1) / (NIR + SWIR1)"],
      text: [
        "Monthly greenness, moisture, bare soil (BSI) and residue (NDTI) from Landsat/HLS at 30 m. They paint the field strip and show when the soil is left uncovered.",
        "Verdor, humedad, suelo desnudo (BSI) y rastrojo (NDTI) cada mes con Landsat/HLS a 30 m. Pintan la tira del campo y muestran cuándo queda el suelo sin cubrir.",
      ],
    },
    {
      title: ["4. Model 1 · Water each crop uses (XGBoost)", "4. Modelo 1 · Agua que usa cada cultivo (XGBoost)"],
      formula: ["ŷ = f₁(x) + f₂(x) + … + f_K(x)   (each tree corrects the previous error)", "ŷ = f₁(x) + f₂(x) + … + f_K(x)   (cada árbol corrige el error del anterior)"],
      text: [
        "Gradient-boosted trees learn monthly water use from OpenET using crop, weather, elevation and soil. No satellite greenness on purpose: it must predict rotations nobody has planted yet.",
        "Árboles con gradiente aprenden el agua mensual de OpenET a partir del cultivo, el clima, la elevación y el suelo. Sin verdor satelital a propósito: debe predecir rotaciones que nadie ha sembrado todavía.",
      ],
    },
    {
      title: ["5. Model 3 · Reading the crop history (GRU + attention)", "5. Modelo 3 · Lectura del historial (GRU + atención)"],
      formula: ["h_t = GRU(x_t, h_{t−1})      α_t = softmax(w·h_t)      c = Σ α_t h_t", "h_t = GRU(x_t, h_{t−1})      α_t = softmax(w·h_t)      c = Σ α_t h_t"],
      text: [
        "A small recurrent network reads 12 months of indices and says what was grown. The attention weights α show which months weighed most in that reading — not a causal explanation.",
        "Una red recurrente pequeña lee 12 meses de índices y dice qué se sembró. Los pesos de atención α muestran qué meses pesaron más en esa lectura; no son una explicación causal.",
      ],
    },
    {
      title: ["6. Model 4 · Soil moisture with an honest range (CQR)", "6. Modelo 4 · Humedad con un rango honesto (CQR)"],
      formula: ["[ q_low(x) − Q , q_high(x) + Q ]   with Q chosen so 90% of held-out cases fall inside", "[ q_bajo(x) − Q , q_alto(x) + Q ]   con Q elegido para que el 90 % de los casos apartados caiga dentro"],
      text: [
        "The FAO-56 balance is corrected with trees, and conformalized quantile regression turns it into a range calibrated against SMAP, leaving one valley out each time.",
        "El balance FAO-56 se corrige con árboles, y la regresión cuantílica conformal lo convierte en un rango calibrado contra SMAP, dejando un valle fuera cada vez.",
      ],
    },
    {
      title: ["7. Model 5 · What farmers actually plant next (Markov chain)", "7. Modelo 5 · Qué siembran después de verdad (cadena de Markov)"],
      formula: ["P(crop_t | crop_{t−1}, crop_{t−2}) = (n + 1) / (N + K)", "P(cultivo_t | cultivo_{t−1}, cultivo_{t−2}) = (n + 1) / (N + K)"],
      text: [
        "Second-order transition counts from 8,352 real crop changes, with Laplace smoothing. Alternatives are built from rotations that farmers really practice.",
        "Conteo de transiciones de segundo orden sobre 8 352 cambios de cultivo reales, con suavizado de Laplace. Las alternativas salen de rotaciones que los agricultores de verdad practican.",
      ],
    },
  ];
  return (
    <section className="landing-band" aria-labelledby="how-title">
      <h2 id="how-title">{en ? "How it works inside" : "Cómo funciona por dentro"}</h2>
      <p className="landing-lead">
        {en
          ? "Trained on 1,138 irrigated fields in 6 valleys of Nevada, Utah and Idaho (2016–2024). Every model is trained on 5 valleys and measured on Diamond Valley, which it never saw: neighboring pixels look alike, so a random split would inflate the scores."
          : "Entrenado con 1 138 campos de riego en 6 valles de Nevada, Utah e Idaho (2016–2024). Cada modelo se entrena en 5 valles y se mide en Diamond Valley, que nunca vio: los píxeles vecinos se parecen, así que partir al azar inflaría los resultados."}
      </p>
      <ol className="landing-steps">
        {steps.map((step) => (
          <li key={step.title[0]}>
            <h3>{en ? step.title[0] : step.title[1]}</h3>
            <p className="landing-formula">
              <code>{en ? step.formula[0] : step.formula[1]}</code>
            </p>
            <p>{en ? step.text[0] : step.text[1]}</p>
          </li>
        ))}
      </ol>
      <p className="landing-small">
        {en
          ? "The language model in the tutor only explains the screen: a validator discards any answer with a number that does not come from the data."
          : "El modelo de lenguaje del tutor solo explica la pantalla: un validador descarta cualquier respuesta con una cifra que no venga de los datos."}
      </p>
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
    <section className="landing-band" aria-labelledby="challenge-title">
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
        <p className="landing-lead">
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
    <section className="landing-band" aria-labelledby="optional-title">
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
