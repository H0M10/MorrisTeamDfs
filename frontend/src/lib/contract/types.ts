/* Generado desde contracts/schema.json. No editar a mano.
 * Para regenerar: npm run gen:types */

/**
 * @minItems 1
 */
export type LocalizedList = [LocalizedText, ...LocalizedText[]];

/**
 * Contrato oficial de evaluación de rotaciones de cultivos para Field Shift (equipo The CSC, NASA Space Apps Challenge 2026).
 */
export interface FieldShiftEvaluationContract {
  contract_version: string;
  data_status: "fixture" | "real";
  fixture_disclaimer?: LocalizedText;
  parcel: Parcel;
  /**
   * @minItems 36
   * @maxItems 36
   */
  timeline: [
    TimelineMonth,
    TimelineMonth,
    TimelineMonth,
    TimelineMonth,
    TimelineMonth,
    TimelineMonth,
    TimelineMonth,
    TimelineMonth,
    TimelineMonth,
    TimelineMonth,
    TimelineMonth,
    TimelineMonth,
    TimelineMonth,
    TimelineMonth,
    TimelineMonth,
    TimelineMonth,
    TimelineMonth,
    TimelineMonth,
    TimelineMonth,
    TimelineMonth,
    TimelineMonth,
    TimelineMonth,
    TimelineMonth,
    TimelineMonth,
    TimelineMonth,
    TimelineMonth,
    TimelineMonth,
    TimelineMonth,
    TimelineMonth,
    TimelineMonth,
    TimelineMonth,
    TimelineMonth,
    TimelineMonth,
    TimelineMonth,
    TimelineMonth,
    TimelineMonth
  ];
  constraints: Constraints;
  has_viable_options: boolean;
  /**
   * @minItems 3
   * @maxItems 3
   */
  strategies: [Strategy, Strategy, Strategy];
  models: {
    model_1_crop_water: ModelReport;
    model_2_prior_crop_effect: ModelReport;
    model_3_crop_history_gru: ModelReport;
    model_4_moisture_cqr: ModelReport;
  };
}
export interface LocalizedText {
  es: string;
  en: string;
}
export interface Parcel {
  id: string;
  name: LocalizedText;
  center: {
    lat: number;
    lon: number;
  };
  /**
   * @minItems 4
   */
  polygon_wgs84: [
    [number, number],
    [number, number],
    [number, number],
    [number, number],
    ...[number, number][]
  ];
  area_ha: MetricValue;
  region_mode: "labeled" | "unlabeled";
  native_pixel_footprints_m: {
    [k: string]: number;
  };
  soil_profile: {
    clay_pct: MetricValue;
    sand_pct: MetricValue;
    silt_pct: MetricValue;
    organic_matter_pct: MetricValue;
    awc_mm_m: MetricValue;
    elevation_m: MetricValue;
    slope_pct: MetricValue;
  };
  climate_summary: {
    annual_et0_mm: MetricValue;
    annual_precip_mm: MetricValue;
    frost_days_year: MetricValue;
    heat_days_year: MetricValue;
  };
  basin_context: {
    aquifer_name: LocalizedText;
    scale_note: LocalizedText;
    smap_regional_moisture: MetricValue;
    aquifer_status_note: LocalizedText;
    aquifer_balance_metric?: MetricValue;
  };
}
export interface MetricValue {
  value: number | null;
  unit: string;
  interval?: MetricInterval;
  type: "observed" | "modeled" | "assumed" | "fixture";
  source: string;
  date: string;
  native_scale: string;
}
export interface MetricInterval {
  lower: number;
  upper: number;
  confidence: number;
}
export interface TimelineMonth {
  month: string;
  hls_color_hex: string;
  /**
   * @minItems 3
   * @maxItems 3
   */
  hls_rgb: [number, number, number];
  crop_code: string;
  crop_label: LocalizedText;
  indices: {
    ndvi: MetricValue;
    ndmi: MetricValue;
    bsi: MetricValue;
    ndti: MetricValue;
    ndre?: MetricValue;
  };
  rain_mm: MetricValue;
  et_mm: MetricValue;
  root_zone_water_index: MetricValue;
  soil_moisture: MetricValue;
  frost_days: MetricValue;
  heat_days: MetricValue;
  attention_weight: MetricValue | null;
}
export interface Constraints {
  evaluated_before_models: true;
  max_water_mm_year: MetricValue;
  available_machinery: string[];
  crops_without_buyer: string[];
  planting_window: {
    start_month: number;
    end_month: number;
    label: LocalizedText;
  };
}
export interface Strategy {
  id: "current" | "less_water" | "more_soil";
  title: LocalizedText;
  viable: boolean;
  constraint_evaluation: {
    water_ok: boolean;
    buyer_ok: boolean;
    machinery_ok: boolean;
    calendar_ok: boolean;
  };
  rejection_reason: LocalizedText | null;
  /**
   * @minItems 36
   * @maxItems 36
   */
  sequence_36m: [
    {
      month: string;
      crop_code: string;
      crop_label: LocalizedText;
      palette_token: "leaf" | "straw" | "earth" | "gate_blue";
      pattern: "solid" | "hatch" | "dots" | "stripe";
    },
    {
      month: string;
      crop_code: string;
      crop_label: LocalizedText;
      palette_token: "leaf" | "straw" | "earth" | "gate_blue";
      pattern: "solid" | "hatch" | "dots" | "stripe";
    },
    {
      month: string;
      crop_code: string;
      crop_label: LocalizedText;
      palette_token: "leaf" | "straw" | "earth" | "gate_blue";
      pattern: "solid" | "hatch" | "dots" | "stripe";
    },
    {
      month: string;
      crop_code: string;
      crop_label: LocalizedText;
      palette_token: "leaf" | "straw" | "earth" | "gate_blue";
      pattern: "solid" | "hatch" | "dots" | "stripe";
    },
    {
      month: string;
      crop_code: string;
      crop_label: LocalizedText;
      palette_token: "leaf" | "straw" | "earth" | "gate_blue";
      pattern: "solid" | "hatch" | "dots" | "stripe";
    },
    {
      month: string;
      crop_code: string;
      crop_label: LocalizedText;
      palette_token: "leaf" | "straw" | "earth" | "gate_blue";
      pattern: "solid" | "hatch" | "dots" | "stripe";
    },
    {
      month: string;
      crop_code: string;
      crop_label: LocalizedText;
      palette_token: "leaf" | "straw" | "earth" | "gate_blue";
      pattern: "solid" | "hatch" | "dots" | "stripe";
    },
    {
      month: string;
      crop_code: string;
      crop_label: LocalizedText;
      palette_token: "leaf" | "straw" | "earth" | "gate_blue";
      pattern: "solid" | "hatch" | "dots" | "stripe";
    },
    {
      month: string;
      crop_code: string;
      crop_label: LocalizedText;
      palette_token: "leaf" | "straw" | "earth" | "gate_blue";
      pattern: "solid" | "hatch" | "dots" | "stripe";
    },
    {
      month: string;
      crop_code: string;
      crop_label: LocalizedText;
      palette_token: "leaf" | "straw" | "earth" | "gate_blue";
      pattern: "solid" | "hatch" | "dots" | "stripe";
    },
    {
      month: string;
      crop_code: string;
      crop_label: LocalizedText;
      palette_token: "leaf" | "straw" | "earth" | "gate_blue";
      pattern: "solid" | "hatch" | "dots" | "stripe";
    },
    {
      month: string;
      crop_code: string;
      crop_label: LocalizedText;
      palette_token: "leaf" | "straw" | "earth" | "gate_blue";
      pattern: "solid" | "hatch" | "dots" | "stripe";
    },
    {
      month: string;
      crop_code: string;
      crop_label: LocalizedText;
      palette_token: "leaf" | "straw" | "earth" | "gate_blue";
      pattern: "solid" | "hatch" | "dots" | "stripe";
    },
    {
      month: string;
      crop_code: string;
      crop_label: LocalizedText;
      palette_token: "leaf" | "straw" | "earth" | "gate_blue";
      pattern: "solid" | "hatch" | "dots" | "stripe";
    },
    {
      month: string;
      crop_code: string;
      crop_label: LocalizedText;
      palette_token: "leaf" | "straw" | "earth" | "gate_blue";
      pattern: "solid" | "hatch" | "dots" | "stripe";
    },
    {
      month: string;
      crop_code: string;
      crop_label: LocalizedText;
      palette_token: "leaf" | "straw" | "earth" | "gate_blue";
      pattern: "solid" | "hatch" | "dots" | "stripe";
    },
    {
      month: string;
      crop_code: string;
      crop_label: LocalizedText;
      palette_token: "leaf" | "straw" | "earth" | "gate_blue";
      pattern: "solid" | "hatch" | "dots" | "stripe";
    },
    {
      month: string;
      crop_code: string;
      crop_label: LocalizedText;
      palette_token: "leaf" | "straw" | "earth" | "gate_blue";
      pattern: "solid" | "hatch" | "dots" | "stripe";
    },
    {
      month: string;
      crop_code: string;
      crop_label: LocalizedText;
      palette_token: "leaf" | "straw" | "earth" | "gate_blue";
      pattern: "solid" | "hatch" | "dots" | "stripe";
    },
    {
      month: string;
      crop_code: string;
      crop_label: LocalizedText;
      palette_token: "leaf" | "straw" | "earth" | "gate_blue";
      pattern: "solid" | "hatch" | "dots" | "stripe";
    },
    {
      month: string;
      crop_code: string;
      crop_label: LocalizedText;
      palette_token: "leaf" | "straw" | "earth" | "gate_blue";
      pattern: "solid" | "hatch" | "dots" | "stripe";
    },
    {
      month: string;
      crop_code: string;
      crop_label: LocalizedText;
      palette_token: "leaf" | "straw" | "earth" | "gate_blue";
      pattern: "solid" | "hatch" | "dots" | "stripe";
    },
    {
      month: string;
      crop_code: string;
      crop_label: LocalizedText;
      palette_token: "leaf" | "straw" | "earth" | "gate_blue";
      pattern: "solid" | "hatch" | "dots" | "stripe";
    },
    {
      month: string;
      crop_code: string;
      crop_label: LocalizedText;
      palette_token: "leaf" | "straw" | "earth" | "gate_blue";
      pattern: "solid" | "hatch" | "dots" | "stripe";
    },
    {
      month: string;
      crop_code: string;
      crop_label: LocalizedText;
      palette_token: "leaf" | "straw" | "earth" | "gate_blue";
      pattern: "solid" | "hatch" | "dots" | "stripe";
    },
    {
      month: string;
      crop_code: string;
      crop_label: LocalizedText;
      palette_token: "leaf" | "straw" | "earth" | "gate_blue";
      pattern: "solid" | "hatch" | "dots" | "stripe";
    },
    {
      month: string;
      crop_code: string;
      crop_label: LocalizedText;
      palette_token: "leaf" | "straw" | "earth" | "gate_blue";
      pattern: "solid" | "hatch" | "dots" | "stripe";
    },
    {
      month: string;
      crop_code: string;
      crop_label: LocalizedText;
      palette_token: "leaf" | "straw" | "earth" | "gate_blue";
      pattern: "solid" | "hatch" | "dots" | "stripe";
    },
    {
      month: string;
      crop_code: string;
      crop_label: LocalizedText;
      palette_token: "leaf" | "straw" | "earth" | "gate_blue";
      pattern: "solid" | "hatch" | "dots" | "stripe";
    },
    {
      month: string;
      crop_code: string;
      crop_label: LocalizedText;
      palette_token: "leaf" | "straw" | "earth" | "gate_blue";
      pattern: "solid" | "hatch" | "dots" | "stripe";
    },
    {
      month: string;
      crop_code: string;
      crop_label: LocalizedText;
      palette_token: "leaf" | "straw" | "earth" | "gate_blue";
      pattern: "solid" | "hatch" | "dots" | "stripe";
    },
    {
      month: string;
      crop_code: string;
      crop_label: LocalizedText;
      palette_token: "leaf" | "straw" | "earth" | "gate_blue";
      pattern: "solid" | "hatch" | "dots" | "stripe";
    },
    {
      month: string;
      crop_code: string;
      crop_label: LocalizedText;
      palette_token: "leaf" | "straw" | "earth" | "gate_blue";
      pattern: "solid" | "hatch" | "dots" | "stripe";
    },
    {
      month: string;
      crop_code: string;
      crop_label: LocalizedText;
      palette_token: "leaf" | "straw" | "earth" | "gate_blue";
      pattern: "solid" | "hatch" | "dots" | "stripe";
    },
    {
      month: string;
      crop_code: string;
      crop_label: LocalizedText;
      palette_token: "leaf" | "straw" | "earth" | "gate_blue";
      pattern: "solid" | "hatch" | "dots" | "stripe";
    },
    {
      month: string;
      crop_code: string;
      crop_label: LocalizedText;
      palette_token: "leaf" | "straw" | "earth" | "gate_blue";
      pattern: "solid" | "hatch" | "dots" | "stripe";
    }
  ];
  metrics: {
    annual_water_mm: MetricValue;
    water_delta_vs_current_mm: MetricValue;
    soil_cover_months_36m: MetricValue;
    prior_crop_vigor_delta_pct: MetricValue;
    frost_risk_days_year: MetricValue;
    heat_risk_days_year: MetricValue;
  };
  evidence_card: {
    why_suggested: LocalizedText;
    supporting_evidence: LocalizedList;
    benefits: LocalizedList;
    information_gaps: LocalizedList;
    local_review_risks: LocalizedList;
  };
}
export interface ModelReport {
  status: "trained" | "fallback" | "absent";
  experimental: boolean;
  algorithm: string;
  partition_method: LocalizedText;
  metric_name: LocalizedText;
  metric: MetricValue;
  baseline_name: LocalizedText;
  baseline_metric: MetricValue;
  active_mode_note: LocalizedText;
  card_path: string;
}
