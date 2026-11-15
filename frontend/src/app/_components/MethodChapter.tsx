"use client";
// Capítulo "Método": de dónde salen los datos y la matemática de cada paso.
// Las fórmulas se escriben en LaTeX y KaTeX las dibuja en HTML y MathML, así
// un lector de pantalla también las puede leer. Son las ecuaciones que corre
// el código (backend/app/engine y models/*/CARD.md), no ilustraciones.
import katex from "katex";
import "katex/dist/katex.min.css";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { NasaData } from "./LandingSections";

function Formula({ tex, label }: { tex: string; label: string }) {
  const html = katex.renderToString(tex, {
    displayMode: true,
    output: "htmlAndMathml",
    throwOnError: false,
    strict: false,
  });
  return (
    <figure className="method-formula" aria-label={label} tabIndex={0}>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </figure>
  );
}

interface Step {
  id: string;
  title: [string, string];
  text: [string, string];
  tex: { tex: string; label: [string, string] }[];
  note?: [string, string];
}

const STEPS: Step[] = [
  {
    id: "constraints",
    title: ["1. Constraints come first", "1. Primero, las restricciones"],
    text: [
      "Before ranking anything, each rotation is checked against what the farmer declared. If none passes, the tool says which constraint ruled out each one and does not fill the gap with a recommendation.",
      "Antes de ordenar nada, cada rotación se revisa contra lo que declaró el agricultor. Si ninguna pasa, la herramienta dice qué restricción descartó a cada una y no rellena con una recomendación.",
    ],
    tex: [
      {
        tex: String.raw`\text{viable}(r) \iff W_r \le W_{\max} \;\land\; \text{buyer}(r) \;\land\; \text{machinery}(r) \;\land\; \text{window}(r)`,
        label: ["Viability rule", "Regla de viabilidad"],
      },
    ],
  },
  {
    id: "fao56",
    title: ["2. Physical water balance (FAO-56)", "2. Balance de agua físico (FAO-56)"],
    text: [
      "Reference evapotranspiration comes from NASA POWER weather with the FAO-56 Penman-Monteith equation. Each crop multiplies it by its monthly coefficient, and irrigation covers what effective rain (USDA SCS method) does not.",
      "La evapotranspiración de referencia sale del clima de NASA POWER con la ecuación Penman-Monteith de FAO-56. Cada cultivo la multiplica por su coeficiente mensual, y el riego cubre lo que la lluvia efectiva (método USDA SCS) no alcanza.",
    ],
    tex: [
      {
        tex: String.raw`ET_0 = \frac{0.408\,\Delta\,(R_n - G) + \gamma\,\dfrac{900}{T + 273}\,u_2\,(e_s - e_a)}{\Delta + \gamma\,(1 + 0.34\,u_2)}`,
        label: ["FAO-56 Penman-Monteith reference evapotranspiration", "Evapotranspiración de referencia Penman-Monteith FAO-56"],
      },
      {
        tex: String.raw`ET_c = K_c \cdot ET_0 \qquad I_n = \max\left(0,\; ET_c - P_e\right)`,
        label: ["Crop evapotranspiration and net irrigation", "Evapotranspiración del cultivo y riego neto"],
      },
    ],
  },
  {
    id: "indices",
    title: ["3. What the satellite sees", "3. Lo que ve el satélite"],
    text: [
      "Monthly spectral indices from Landsat/HLS at 30 m: greenness, moisture, bare soil and crop residue. They paint the field strip and reveal when the soil is left uncovered.",
      "Índices espectrales mensuales de Landsat/HLS a 30 m: verdor, humedad, suelo desnudo y rastrojo. Pintan la tira del campo y muestran cuándo queda el suelo sin cubrir.",
    ],
    tex: [
      {
        tex: String.raw`\text{NDVI} = \frac{NIR - Red}{NIR + Red} \qquad \text{NDMI} = \frac{NIR - SWIR_1}{NIR + SWIR_1}`,
        label: ["Greenness and moisture indices", "Índices de verdor y humedad"],
      },
      {
        tex: String.raw`\text{BSI} = \frac{(SWIR_1 + Red) - (NIR + Blue)}{(SWIR_1 + Red) + (NIR + Blue)} \qquad \text{NDTI} = \frac{SWIR_1 - SWIR_2}{SWIR_1 + SWIR_2}`,
        label: ["Bare-soil and residue indices", "Índices de suelo desnudo y rastrojo"],
      },
    ],
  },
  {
    id: "m1",
    title: ["4. Model 1 · Water each crop uses (XGBoost)", "4. Modelo 1 · Agua que usa cada cultivo (XGBoost)"],
    text: [
      "Gradient-boosted trees learn monthly water use from OpenET using crop, weather, elevation and soil. No satellite greenness on purpose: it must predict rotations nobody has planted yet. Measured as mean absolute error against FAO-56.",
      "Árboles con gradiente aprenden el agua mensual de OpenET a partir del cultivo, el clima, la elevación y el suelo. Sin verdor satelital a propósito: debe predecir rotaciones que nadie ha sembrado todavía. Se mide con el error absoluto medio contra FAO-56.",
    ],
    tex: [
      {
        tex: String.raw`\hat{y}_i = \sum_{k=1}^{K} f_k(\mathbf{x}_i) \qquad \mathcal{L} = \sum_i \left(y_i - \hat{y}_i\right)^2 + \sum_k \left(\gamma T_k + \tfrac{1}{2}\lambda \lVert w_k \rVert^2\right)`,
        label: ["Boosted trees and regularized loss", "Árboles en suma y pérdida regularizada"],
      },
      {
        tex: String.raw`\text{MAE} = \frac{1}{n} \sum_{i=1}^{n} \left| y_i - \hat{y}_i \right|`,
        label: ["Mean absolute error", "Error absoluto medio"],
      },
    ],
  },
  {
    id: "m2",
    title: ["5. Model 2 · Effect of the previous crop (XGBoost, observational)", "5. Modelo 2 · Efecto del cultivo anterior (XGBoost, observacional)"],
    text: [
      "We test whether knowing last year's crop improves the prediction of peak vigor. It does not: the gain is negative, so the tool says there is no local evidence and never presents it as a cause.",
      "Probamos si saber el cultivo del año anterior mejora la predicción del vigor máximo. No lo mejora: la ganancia es negativa, así que la herramienta dice que no hay evidencia local y nunca lo presenta como causa.",
    ],
    tex: [
      {
        tex: String.raw`\Delta = \frac{\text{MAE}_{\text{without prior}} - \text{MAE}_{\text{with prior}}}{\text{MAE}_{\text{without prior}}} \times 100\%`,
        label: ["Relative improvement", "Mejora relativa"],
      },
    ],
  },
  {
    id: "m3",
    title: ["6. Model 3 · Reading the crop history (GRU + attention)", "6. Modelo 3 · Lectura del historial (GRU + atención)"],
    text: [
      "A small recurrent network reads 12 months of indices and says what was grown: alfalfa, small grain, corn or fallow. The attention weights show which months weighed most in that reading; they are not a causal explanation. Measured with macro F1.",
      "Una red recurrente pequeña lee 12 meses de índices y dice qué se sembró: alfalfa, grano pequeño, maíz o barbecho. Los pesos de atención muestran qué meses pesaron más en esa lectura; no son una explicación causal. Se mide con F1 macro.",
    ],
    tex: [
      {
        tex: String.raw`\begin{aligned} z_t &= \sigma(W_z x_t + U_z h_{t-1}) \qquad r_t = \sigma(W_r x_t + U_r h_{t-1}) \\ \tilde{h}_t &= \tanh\!\left(W x_t + U (r_t \odot h_{t-1})\right) \qquad h_t = (1 - z_t) \odot h_{t-1} + z_t \odot \tilde{h}_t \end{aligned}`,
        label: ["GRU cell", "Celda GRU"],
      },
      {
        tex: String.raw`\alpha_t = \frac{\exp\!\left(w^\top h_t\right)}{\sum_{s=1}^{12} \exp\!\left(w^\top h_s\right)} \qquad c = \sum_{t=1}^{12} \alpha_t\, h_t`,
        label: ["Temporal attention", "Atención temporal"],
      },
    ],
  },
  {
    id: "m4",
    title: ["7. Model 4 · Soil moisture with an honest range (CQR)", "7. Modelo 4 · Humedad del suelo con un rango honesto (CQR)"],
    text: [
      "The FAO-56 balance is corrected with quantile trees, and conformalized quantile regression widens the range just enough, leaving one valley out at a time, so that it contains the SMAP value about 90% of the time.",
      "El balance FAO-56 se corrige con árboles de cuantiles, y la regresión cuantílica conformal ensancha el rango lo justo, dejando un valle fuera cada vez, para que contenga el valor de SMAP cerca del 90 % de las veces.",
    ],
    tex: [
      {
        tex: String.raw`E_i = \max\left\{\hat{q}_{\text{lo}}(x_i) - y_i,\; y_i - \hat{q}_{\text{hi}}(x_i)\right\} \qquad Q = \text{Quantile}_{\lceil (n+1)(1-\alpha) \rceil / n}\left(E_1, \dots, E_n\right)`,
        label: ["Conformity scores and correction", "Puntajes de conformidad y corrección"],
      },
      {
        tex: String.raw`C(x) = \left[\hat{q}_{\text{lo}}(x) - Q,\; \hat{q}_{\text{hi}}(x) + Q\right] \qquad \Pr\left(y \in C(x)\right) \ge 1 - \alpha = 0.90`,
        label: ["Calibrated interval and its guarantee", "Intervalo calibrado y su garantía"],
      },
    ],
    note: [
      "The guarantee assumes exchangeable data; across valleys it is checked empirically, and the measured coverage is shown next to the target.",
      "La garantía supone datos intercambiables; entre valles se comprueba con datos, y la cobertura medida se muestra junto a la meta.",
    ],
  },
  {
    id: "m5",
    title: ["8. Model 5 · What farmers actually plant next (Markov chain)", "8. Modelo 5 · Qué siembran después de verdad (cadena de Markov)"],
    text: [
      "Second-order transition counts from 8,352 real crop changes, with Laplace smoothing and a first-order fallback when a pair of years has fewer than 5 cases. Alternatives are built from rotations farmers really practice.",
      "Conteo de transiciones de segundo orden sobre 8 352 cambios de cultivo reales, con suavizado de Laplace y respaldo de primer orden cuando una pareja de años tiene menos de 5 casos. Las alternativas salen de rotaciones que los agricultores de verdad practican.",
    ],
    tex: [
      {
        tex: String.raw`P\left(c_t = j \mid c_{t-1} = i,\, c_{t-2} = h\right) = \frac{n_{hij} + 1}{\sum_{j'} n_{hij'} + K}`,
        label: ["Smoothed second-order transition", "Transición de segundo orden suavizada"],
      },
    ],
  },
];

/** Las palabras dentro de las fórmulas, en español. */
const TEX_ES: [string, string][] = [
  [String.raw`	ext{viable}(r)`, String.raw`	ext{viable}(r)`],
  [String.raw`	ext{buyer}`, String.raw`	ext{comprador}`],
  [String.raw`	ext{machinery}`, String.raw`	ext{maquinaria}`],
  [String.raw`	ext{window}`, String.raw`	ext{ventana}`],
  ["without prior", "sin anterior"],
  ["with prior", "con anterior"],
  [String.raw`	ext{Quantile}`, String.raw`	ext{Cuantil}`],
];
const localizeTex = (tex: string) => TEX_ES.reduce((acc, [en, es]) => acc.split(en).join(es), tex);

export function MethodChapter() {
  const { lang } = useI18n();
  const en = lang === "en";
  const i = en ? 0 : 1;
  return (
    <div className="present-shell present-section method">
      <p className="present-kicker">{en ? "03 / Method" : "03 / Método"}</p>
      <h2>{en ? "From satellite to decision, step by step." : "Del satélite a la decisión, paso a paso."}</h2>
      <p className="present-lead">
        {en
          ? "Trained on 1,138 irrigated fields in 6 valleys of Nevada, Utah and Idaho (2016–2024). Every model is trained on 5 valleys and measured on Diamond Valley, which it never saw: neighboring pixels look alike, so a random split would inflate the scores. Each model is compared with a simple baseline, even when it loses."
          : "Entrenado con 1 138 campos de riego en 6 valles de Nevada, Utah e Idaho (2016–2024). Cada modelo se entrena en 5 valles y se mide en Diamond Valley, que nunca vio: los píxeles vecinos se parecen, así que partir al azar inflaría los resultados. Cada modelo se compara con una línea base sencilla, aunque pierda."}
      </p>

      <NasaData />

      <h2 className="method-heading">{en ? "The mathematics, as the code runs it" : "La matemática, tal como la corre el código"}</h2>
      <ol className="method-steps">
        {STEPS.map((step) => (
          <li key={step.id}>
            <h3>{step.title[i]}</h3>
            <p>{step.text[i]}</p>
            {step.tex.map((f) => (
              <Formula key={f.tex} tex={en ? f.tex : localizeTex(f.tex)} label={f.label[i]} />
            ))}
            {step.note && <p className="method-note">{step.note[i]}</p>}
          </li>
        ))}
      </ol>
      <p className="present-note">
        {en
          ? "The language model in the tutor only explains the screen: a validator discards any answer with a number that does not come from the data or from what the person said."
          : "El modelo de lenguaje del tutor solo explica la pantalla: un validador descarta cualquier respuesta con una cifra que no venga de los datos o de lo que dijo la persona."}
      </p>
      <p>
        <Link className="button primary" href="/presentacion/evidencia">
          {en ? "See the measured results" : "Ver los resultados medidos"} →
        </Link>
      </p>
    </div>
  );
}
