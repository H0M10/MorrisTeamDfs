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
for Diamond Valley, Nevada, and `qro-sjr-01` in Querétaro. Some inputs,
including the Querétaro crop history and constraints, are still team
assumptions—not farmer declarations. [S5, S6]

## Data used

The model-training cards document a real multi-valley table covering
2021–2024: 720 monthly rows from 15 parcels in Diamond Valley, Nevada; Snake
River, Idaho; and Millard, Utah. The documented sources include NASA POWER
(about 50 km), SMAP L4 (9 km), Landsat/Harmonized Landsat and Sentinel-2
(30 m), and SRTM (30 m). The training table also uses OpenET (30 m), USDA
Cropland Data Layer (30 m), and SoilGrids (250 m); these are not NASA sources.
Product scales describe the source grids, not field-level measurement
accuracy. [S1, S2]

For Querétaro, the current `qro-sjr-01` geometry is a 2.8-hectare candidate
boundary derived from Sentinel-2 pixels at 10 m. It still needs visual
confirmation by a person. Sentinel-2 is an ESA mission, not a NASA dataset.
There is no USDA CDL or OpenET coverage for this parcel, and the crop history
and operating constraints have not been confirmed by a farmer. [S3, S6]

The project also includes a crop reference bank with 32 crop codes and a
monthly FAO-56 coefficient table with 132 records across 11 crop groups. These
are reference inputs, not satellite observations; the bank still needs
agronomic review. [S4]

## How it works

The API returns a 36-month timeline, declared constraints, three rotation
options, and reports for four models. The team has trained and measured
Models 1, 2, and 4 using a held-out-valley evaluation in Diamond Valley.
Their reported results are:

- **Model 1 — crop water use:** monthly MAE of 9.2512 mm against OpenET,
  compared with 29.0496 mm for the FAO-56 baseline. This measures agreement
  with OpenET, not field instruments. [S7]
- **Model 2 — prior-crop effect:** adding the previous crop did not improve
  prediction in the held-out valley. Its reported score is **−6.3% reduction
  in MAE**: MAE was 0.1541 NDVI with the prior crop and 0.1450 NDVI without
  it, on nine test parcel-years. The negative result is reported as observed:
  it is not evidence of a benefit, water savings, or a causal crop effect.
  The card concludes there is no local evidence of predictive improvement in
  this small sample. [S8]
- **Model 4 — regional soil-moisture interval:** measured coverage was
  58.3333% against a 22.9167% historical-range baseline, below its 90%
  target. It is regional context at 9 km, not parcel moisture. The current
  parcel evaluations do not provide observed values paired with sourced CQR
  bounds, so parcel-level empirical coverage and interval charts remain
  pending. [S9, S10]
- **Model 3 — crop-history classification:** still pending training and
  validation. No performance metric is claimed. [S11]

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
- **[S4] Crop reference tables:** `models/fao56_crop_bank.csv`, 32 unique
  `crop_code` records; `models/kc_monthly.csv`, 132 data rows and 11 unique
  `crop_group` values; `PLAN.md`, task M-01 (agronomic review H-03 pending).
- **[S5] Evaluation shape:** `contracts/schema.json`, `properties.data_status`
  (`fixture` or `real`), `properties.timeline` (36 months),
  `properties.strategies` (three), and `properties.models` (four named
  reports).
- **[S6] Real parcels and remaining assumptions:** `PLAN.md`, task A-06 and
  entries C-12/C-13; `backend/data/qro-sjr-01.meta.json`,
  `constraints_source` (team assumptions, not farmer or SIAP data).
- **[S7] Model 1:** `models/model_1_crop_water/CARD.md`, Metric against
  baseline and Partition; `backend/artifacts/model_1_crop_water/metrics.json`,
  `metric.value`, `baseline_metric.value`, `partition_method`.
- **[S8] Model 2:** `models/model_2_prior_crop_effect/CARD.md`, Partition,
  Metric against baseline, and Limits; `backend/artifacts/model_2_prior_crop_effect/metrics.json`,
  `metric.value`, `baseline_metric.value`, `extra.mae_with_prior`,
  `extra.n_test`, `extra.observational_only`.
- **[S9] Model 4:** `models/model_4_moisture_cqr/CARD.md`, Metric against
  baseline and Limits; `backend/artifacts/model_4_moisture_cqr/metrics.json`,
  `metric.value`, `baseline_metric.value`, `extra.target_coverage`.
- **[S10] Parcel CQR data gap:** current real evaluations in
  `backend/data/diamond_valley.parquet` and `backend/data/queretaro.parquet`
  are validated against the contract per `PLAN.md`, tasks D-03/D-04; the
  API's evaluated timelines currently contain no observed values with
  interval bounds and provenance.
- **[S11] Model 3:** `models/model_3_crop_history_gru/CARD.md`, Status and
  Metric sections; `PLAN.md`, task M-04.

The root `README.md` and `models/README.md` still contain older statements
that the app only serves fixtures and that models are untrained. They should
be reconciled before publication; this page follows the dated model cards,
metric artifacts, current parcel geometry, and newer plan entries cited
above.

## Still needed

- **@H0M10:** an officially verified CONAGUA aquifer figure, unit, reference
  date, source publication, and basin scope; also confirm which real-data
  evaluation and source metadata are approved for public demonstration.
- **@Checo-coder:** Model 3's completed training card, validation metric,
  partition, limitations, and artifact status; parcel-level observed CQR
  values and interval bounds with source/date/scale; and visual confirmation
  of the 2.8-hectare Querétaro candidate boundary.
- **@Gicarrillo:** confirm which farmer-facing screens are connected to the
  approved real evaluation and safe to show.
- **A local farmer or adviser:** confirm Querétaro crop history, water
  availability, machinery, planting window, and buyer constraints; these are
  not yet verified farmer-provided facts.
