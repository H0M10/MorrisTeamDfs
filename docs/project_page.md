# Field Shift: Adapting Farms with NASA Data

## The problem

Farmers plan crop rotations around water, soil, planting dates, equipment, and
local markets. Satellite and climate data can help describe a field, but each
source has a different resolution and limits. A useful decision aid must show
where its evidence comes from and what still needs local confirmation.

## The project

Field Shift is a prototype for reviewing crop-rotation choices with a farmer
or local adviser. Its evaluation contract supports a current rotation and two
alternatives, checks declared constraints, and records evidence, missing
information, and risks. The API's real-data mode serves 36-month evaluations
for Diamond Valley, Nevada (`dv-nv-01`), and San Juan del Río / Pedro Escobedo,
Querétaro (`qro-sjr-01`). Parcel crop history and operating constraints are
data-informed team assumptions rather than direct grower declarations (`type: "assumed"`). [S5, S6]

## Data used

The model-training cards document a real multi-valley table covering
2021–2024: 720 monthly rows from 15 parcels in Diamond Valley, Nevada; Snake
River, Idaho; and Millard, Utah. The documented sources include NASA POWER
(about 50 km), SMAP L4 (9 km), Landsat/Harmonized Landsat and Sentinel-2
(30 m), and SRTM (30 m). The training table also uses OpenET (30 m), USDA
Cropland Data Layer (30 m), and SoilGrids (250 m); these are not NASA sources.
Product scales describe the source grids, not field-level measurement
accuracy. [S1, S2]

Regional basin context is declared at basin/aquifer scale: Diamond Valley
Hydrographic Area 153 (NDWR: 30,000 acre-feet/yr perennial yield vs. ~76,000
acre-feet/yr historical pumping; CMA Order 1264, 2015-08-25; GMP Order 1302,
2019-01-11) and Valle de San Juan del Río Aquifer Code 2203 (CONAGUA, DOF
2023-11-09: 277.9 hm³/yr recharge, 334.79 hm³/yr extraction, −56.89 hm³/yr
availability deficit).

For Querétaro (`qro-sjr-01`), the boundary is a 2.8-hectare candidate polygon
derived from Sentinel-2 pixels at 10 m (ESA mission, visual confirmation by a
local person still needed). There is no USDA CDL or OpenET coverage for this
parcel; local market and irrigation context uses SIAP municipal crop closures
(2020–2025) and the official SIAP 2025 state aggregate (117,320.01 ha planted,
110,271.76 ha harvested, 5,608,171.22 thousand MXN). [S3, S6]

The project includes a FAO-56 crop reference bank (32 crop codes, 132 monthly
Kc records across 11 crop groups) reviewed against USDA CDL Eureka County
acreage, SIAP 2020–2025, NASA POWER climate, UNR Extension, and INIFAP (`H-03`).
After that agronomic check, Diamond Valley's `less_water` template pairs spring
wheat (`trigo_primavera`, 485 mm/yr modeled ETc) instead of forage oat
(`avena_forrajera`), matching local Eureka County crops while keeping individual
machinery/buyer traits declared as `assumed`. [S4]

## How it works

The API returns a 36-month timeline, declared constraints, three rotation
options, and reports for all four models trained on CPU and evaluated on
held-out Diamond Valley (`diamond_valley_nv`):

- **Model 1 — crop water use (XGBoost):** monthly MAE of 9.2512 mm against
  OpenET, compared with 29.0496 mm for the FAO-56 baseline (`−68.2%` error
  reduction). This measures agreement with OpenET, not field instruments;
  alternative rotations use calibrated FAO-56 to avoid NDVI/NDMI leakage. [S7]
- **Model 2 — prior-crop effect (XGBoost):** adding the previous crop did not
  improve prediction in the held-out valley. Its reported score is **−6.3%
  reduction in MAE**: 0.1541 NDVI with the prior crop vs. 0.1450 NDVI without
  it across 9 test parcel-years. We report this negative result transparently
  as "no local predictive evidence" (`absent` in unlabeled Querétaro), never as
  water savings or causal evidence. [S8]
- **Model 3 — crop-history classification (GRU + temporal attention, ONNX):**
  achieved **0.4143 macro F1** (`alfalfa 0.857`, `small_grain 0.800`) vs.
  **0.2222 macro F1** for the majority-class baseline (`0.581` on held-out
  2024 training split). Emits monthly `attention_weight` values in `timeline`
  indicating which months weighed most in the sequence reading (non-causal);
  marked `experimental` in unlabeled Querétaro. [S11]
- **Model 4 — regional soil-moisture interval (FAO-56 residual + CQR 90%):**
  measured **58.3333%** coverage against a **22.9167%** historical-range
  baseline, explicitly flagging the shortfall below the 90% target. In `dv-nv-01`,
  `timeline[].soil_moisture` pairs 36 monthly SMAP L4 (9 km) observations with
  sourced CQR bounds (`31/36` months inside band); omitted in `qro-sjr-01`
  where SMAP CQR calibration is unavailable. [S9, S10]

The product helps people inspect evidence and limitations; it has not
demonstrated farm-level water savings, yield gains, or a validated
farm-specific recommendation. The reported model metrics are not a substitute
for field validation or local advice.

## Intended impact

Field Shift aims to make trade-offs easier for farmers and local advisers to
review together. Its impact has not yet been measured. Before making a
field-specific recommendation, the project still needs confirmed farm
information, locally reviewed alternatives, and the remaining validation
work.

## Team

- **Hanniel · [@H0M10](https://github.com/H0M10):** evaluation contract,
  decision engine, and API.
- **Checo · [@Checo-coder](https://github.com/Checo-coder):** data pipeline,
  parcel analysis, and model training and validation.
- **Gicarrillo · [@Gicarrillo](https://github.com/Gicarrillo):**
  farmer-facing workflow and accessibility.
- **Alexis · [@alexishal8](https://github.com/alexishal8):** showcase,
  engineer view, and delivery materials.

Field Shift is being developed for the NASA Space Apps Challenge 2026.

## Source notes

- **[S1] Multi-valley training table:** `PLAN.md`, task D-05 (completed export:
  720 rows); `models/model_1_crop_water/CARD.md`, Data → Table (15 parcels,
  three valleys, 2021-01–2024-12). The ignored export file itself is not
  present in this checkout, so its metadata was not independently inspected
  here.
- **[S2] Training source fields and scales:** `models/model_1_crop_water/CARD.md`,
  Data → Sources and native scale; `models/model_2_prior_crop_effect/CARD.md`,
  Data → Sources and native scale; `models/model_4_moisture_cqr/CARD.md`,
  Data → Sources and native scale.
- **[S3] Querétaro candidate area:** `data-pipeline/parcels/queretaro.geojson`,
  `features[0].properties.note` (Sentinel-2, 10 m, 2.8 ha, visual
  confirmation pending); `PLAN.md`, task D-04 and entry C-13. An older
  summary in `data-pipeline/PLAN_DE_DATOS.md` still says 13 ha; this page
  follows the newer geometry and C-13 entry.
- **[S4] Crop reference tables & H-03 audit:** `models/fao56_crop_bank.csv`
  (32 unique `crop_code` records) and `models/kc_monthly.csv` (132 rows, 11
  crop groups); agronomic audit `H-03` verified against USDA CDL Eureka
  County (`data-pipeline/crop_census.py`), SIAP 2020–2025, NASA POWER, FAO-56
  Table 12, UNR Extension, and INIFAP (`PLAN.md`, tasks M-01, M-06).
- **[S5] Evaluation shape:** `contracts/schema.json`, `properties.data_status`
  (`fixture` or `real`), `properties.timeline` (36 months),
  `properties.strategies` (three), and `properties.models` (four named
  reports).
- **[S6] Real parcels and remaining assumptions:** `PLAN.md`, task A-06 and
  entries C-12/C-13; `backend/data/dv-nv-01.meta.json` and
  `backend/data/qro-sjr-01.meta.json` (`constraints_source`, NDWR Area 153,
  CONAGUA Clave 2203, SIAP 2020–2025).
- **[S7] Model 1:** `models/model_1_crop_water/CARD.md`, Metric against
  baseline and Partition; `backend/artifacts/model_1_crop_water/metrics.json`.
- **[S8] Model 2:** `models/model_2_prior_crop_effect/CARD.md`, Partition,
  Metric against baseline, and Limits; `backend/artifacts/model_2_prior_crop_effect/metrics.json`,
  `metric.value`, `baseline_metric.value`, `extra.mae_with_prior`,
  `extra.n_test`, `extra.observational_only`.
- **[S9] Model 4:** `models/model_4_moisture_cqr/CARD.md`, Metric against
  baseline and Limits; `backend/artifacts/model_4_moisture_cqr/metrics.json`,
  `metric.value`, `baseline_metric.value`, `extra.target_coverage`.
- **[S10] Parcel CQR bounds:** `backend/app/services/table_to_contract.py`
  (`A-07` integration) serves paired SMAP L4 (9 km) observations and CQR 90%
  bounds in `dv-nv-01` (`31/36` months inside interval) and omits CQR in
  uncalibrated `qro-sjr-01`.
- **[S11] Model 3:** `models/model_3_crop_history_gru/CARD.md` and
  `backend/artifacts/model_3_crop_history_gru/metrics.json` (`model.onnx`
  verified in CPU `onnxruntime`, `0.4143` vs `0.2222` macro F1).

## Still needed before final submission

- **Visual confirmation & farmer review:** verify the 2.8-hectare Querétaro
  candidate boundary (`qro-sjr-01`) with a local person and replace team
  `assumed` crop history and machinery/buyer constraints with confirmed farm
  inputs.
- **Farmer-facing completion (`/tool`, `@Gicarrillo`) & final 30 s video
  (`@alexishal8`):** complete `/tool` real-API flow + axe/screen-reader check
  and record the 30-second video using only verified `data_status: real`
  screens.
