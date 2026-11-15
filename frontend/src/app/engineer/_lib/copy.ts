export const engineerCopy = {
  es: {
    metricsTitle: "Métricas de los modelos",
    metricsCaption:
      "Métricas y líneas base reportadas por el registro de modelos",
    model: "Modelo",
    status: "Estado",
    metric: "Métrica",
    value: "Valor",
    unit: "Unidad",
    description: "Descripción",
    pending: "Modelo pendiente de entrenamiento",
    noModels: "Modelo pendiente de entrenamiento.",
    loading: "Cargando registro de modelos…",
    error: "No se pudo cargar el registro de modelos",
    cqrTitle: "Intervalo de humedad CQR",
    cqrDescription:
      "La cobertura se calcula únicamente cuando la API entrega valores observados junto con sus límites de intervalo y procedencia.",
    empiricalCoverage: "Cobertura empírica",
    nominalCoverage: "Cobertura nominal",
    meanWidth: "Ancho promedio del intervalo",
    noCqrData:
      "Esta evaluación no entrega observaciones y límites CQR con procedencia para calcular cobertura empírica.",
    noChartData: "Sin observaciones reales para dibujar la banda CQR.",
    chartAlt:
      "Banda de intervalos CQR y observaciones reales, con tabla alternativa debajo",
    chartTitle: "Banda CQR y observaciones reales",
    tableRegion: "Tabla alternativa de CQR",
    tableCaption: "Observaciones y límites del intervalo CQR",
    month: "Mes",
    observation: "Observación (y)",
    lower: "Límite inferior",
    upper: "Límite superior",
    source: "Fuente",
    date: "Fecha",
    nativeScale: "Escala nativa",
    partition: "Partición",
    limits: "Límites declarados en la ficha",
    modelLimits: {
      model_1_crop_water:
        "Versión sin satélite (cultivo, clima y suelo) para poder predecir rotaciones que nadie ha sembrado. Se evalúa frente a OpenET, no a mediciones de campo. En Diamond Valley sobreestima la rotación actual (+93 a +153 mm/año): las alternativas se ajustan con el OpenET de cada parcela. Requiere OpenET y CDL (EE. UU.).",
      model_2_prior_crop_effect:
        "Resultado observacional, no causal ni de ahorro de agua. Con 8 835 parcela-años en 1 138 campos de 6 valles sigue perdiendo frente a su línea base (−4.6 %): no se usa para ninguna cifra. Sin CDL no existe fuera de EE. UU.",
      model_3_crop_history_gru:
        "Solo reconoce cuatro clases; la atención no es causal. En Diamond Valley distingue mal el grano pequeño (F1 0.21) y el F1 macro no pasa de cerca de 0.5 porque ahí no hay maíz ni barbecho. No sustituye la declaración del agricultor.",
      model_4_moisture_cqr:
        "Contexto regional SMAP de 9 km, no humedad de parcela. Calibración conformal dejando un valle fuera (540 puntos): cubre 96.3 %, por encima del 90 % nominal, con un intervalo más ancho. El balance usa capacidad de agua supuesta (150 mm).",
    },
    networkTitle: "Red en vivo · Modelo 3 (GRU + atención temporal)",
    networkDescription:
      "Pesos de atención reales emitidos por el artefacto ONNX del Modelo 3 (o diagrama de arquitectura en modo demostración). Los pesos indican los meses que más pesaron en la lectura, nunca una explicación causal.",
    networkAlt:
      "Arquitectura y pesos de atención temporal: secuencia mensual hacia GRU con atención y cuatro clases de cultivo",
    networkDiagramTitle:
      "Entrada temporal, GRU con atención y cuatro clases de salida",
    sequence: "Secuencia de 12 meses",
    gru: "GRU temporal",
    attention: "Atención",
    architectureNote:
      "El dibujo representa la arquitectura declarada en CARD.md cuando no hay pesos de inferencia activos.",
    attentionWeightsTitle:
      "Meses que más pesaron en la lectura del Modelo 3 (no causal)",
    attentionTableSummary: "Ver tabla mensual completa de pesos de atención",
    attentionWeightCol: "Peso de atención",
    cropLabelCol: "Cultivo / estado",
    parcelLabel: "Parcela evaluada",
    crops: ["Alfalfa", "Grano pequeño", "Maíz", "Barbecho"],
  },
  en: {
    metricsTitle: "Model metrics",
    metricsCaption: "Metrics and baselines reported by the model registry",
    model: "Model",
    status: "Status",
    metric: "Metric",
    value: "Value",
    unit: "Unit",
    description: "Description",
    pending: "Model pending training",
    noModels: "Model pending training.",
    loading: "Loading model registry…",
    error: "Could not load the model registry",
    cqrTitle: "CQR moisture interval",
    cqrDescription:
      "Coverage is calculated only when the API provides observed values with interval bounds and provenance.",
    empiricalCoverage: "Empirical coverage",
    nominalCoverage: "Nominal coverage",
    meanWidth: "Mean interval width",
    noCqrData:
      "This evaluation does not provide sourced observations and CQR bounds to calculate empirical coverage.",
    noChartData: "No real observations are available to draw the CQR band.",
    chartAlt:
      "CQR interval band and real observations, with an alternative table below",
    chartTitle: "CQR band and real observations",
    tableRegion: "Alternative CQR table",
    tableCaption: "Observations and CQR interval bounds",
    month: "Month",
    observation: "Observation (y)",
    lower: "Lower bound",
    upper: "Upper bound",
    source: "Source",
    date: "Date",
    nativeScale: "Native scale",
    partition: "Partition",
    limits: "Limitations stated in the model card",
    modelLimits: {
      model_1_crop_water:
        "Satellite-free version (crop, weather and soil) so it can predict rotations nobody has planted. Evaluated against OpenET, not field measurements. In Diamond Valley it overestimates the current rotation (+93 to +153 mm/yr): alternatives are adjusted with each field's OpenET. Requires OpenET and CDL (U.S.).",
      model_2_prior_crop_effect:
        "Observational, not causal and not evidence of water savings. With 8,835 parcel-years across 1,138 fields in 6 valleys it still loses to its baseline (−4.6%): it is not used for any figure. Without CDL it is unavailable outside the U.S.",
      model_3_crop_history_gru:
        "Recognizes only four classes; attention is not causal. In Diamond Valley it separates small grain poorly (F1 0.21) and macro F1 cannot exceed about 0.5 because there is no corn or fallow there. It does not replace the grower's declaration.",
      model_4_moisture_cqr:
        "Regional 9 km SMAP context, not parcel moisture. Leave-one-valley-out conformal calibration (540 points): 96.3% coverage, above the nominal 90%, with a wider interval. The balance uses assumed water capacity (150 mm).",
    },
    networkTitle: "Live network · Model 3 (GRU + temporal attention)",
    networkDescription:
      "Real attention weights from the Model 3 ONNX artifact (or architecture schematic in mock mode). Weights show which months weighed most in the reading, never causal proof.",
    networkAlt:
      "Architecture and temporal attention weights: monthly sequence feeding a GRU with temporal attention and four crop classes",
    networkDiagramTitle:
      "Temporal input, GRU with attention, and four output classes",
    sequence: "12-month sequence",
    gru: "Temporal GRU",
    attention: "Attention",
    architectureNote:
      "This drawing represents the architecture documented in CARD.md when no inference weights are active.",
    attentionWeightsTitle:
      "Months that weighed most in Model 3's reading (non-causal)",
    attentionTableSummary: "View full monthly attention-weight table",
    attentionWeightCol: "Attention weight",
    cropLabelCol: "Crop / state",
    parcelLabel: "Evaluated parcel",
    crops: ["Alfalfa", "Small grain", "Corn", "Fallow"],
  },
} as const;
