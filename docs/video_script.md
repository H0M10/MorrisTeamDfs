# Field Shift — 30-second video script

Both cuts are exactly 30 seconds. Narration is in English. Record the listed
routes only. Keep all fixture-derived values out of both cuts. In the backup,
if any fixture evaluation is visible, keep the **“Datos de ejemplo”** label
visible throughout. The final cut may show only the real, sourced results
listed below. Source references are editorial notes, not text to display on
screen.

## BACKUP — Saturday, 23:00

Purpose: show the prototype without implying that sample results are real.
Avoid all metric values, parcel-specific claims, and fixture-derived figures.

| Second | Image / route to record | Narration | On-screen text |
| --- | --- | --- | --- |
| 00–04 | `/showcase`: opening view and timeline. Keep sample-derived values out of frame. | “Farmers plan rotations around water, timing, soil, and local needs.” | `Field Shift` · `Prototype` · `Datos de ejemplo` |
| 05–09 | `/tool`: show the existing page and step navigation only. Do not imply the unfinished workflow is complete. | “Field Shift is a prototype for reviewing those choices together.” | `A decision-support prototype` · `Datos de ejemplo` |
| 10–15 | `/showcase`: browse the timeline with buttons or arrow keys. Hand control only if started by its button. | “Explore the timeline with buttons or a keyboard; hand control is optional.” | `Keyboard alternative` · `Optional hand control` · `Datos de ejemplo` |
| 16–22 | `/engineer`: show headings and status labels only; mask all metric and baseline values. | “The technical view shows where model status and evidence belong, not validated results.” | `Results require review` · `Datos de ejemplo` |
| 23–29 | `/showcase`: closing view, then a team title card. | “Next, we will review verified data and remaining questions with local experts.” | `@H0M10` · `@Checo-coder` · `@Gicarrillo` · `Field Shift` |

## FINAL — Sunday, after real-data verification

Record only when the screens are connected to the verified real evaluation.
Do not show any fixture evaluation. Keep the pending markers below where the
information is not yet verified; do not replace them with estimates.

| Second | Image / route to record | Narration | On-screen text |
| --- | --- | --- | --- |
| 00–04 | `/showcase`: opening and a simple data card; do not show fixture values. | “Field Shift combines field context with satellite and climate data.” | `15 parcels · 720 monthly rows · Nevada, Idaho, Utah` [S1] |
| 05–09 | `/tool`: show the Querétaro candidate boundary only if the real evaluation is selected; do not call it a confirmed farm boundary. | “Querétaro’s candidate boundary still needs review; the reference bank covers 32 crops.” | `2.8-hectare candidate boundary · confirmation pending` · `FAO-56: 32 crop codes · 132 monthly records` [S3, S4] |
| 10–15 | `/engineer`: show Model 2's complete comparison and label its held-out valley. | “Adding prior-crop history worsened the held-out result: NDVI error was 0.1541 versus 0.1450 without it.” | `−6.3% reported MAE reduction · negative means worse · diamond_valley_nv · n=9` [S8] |
| 16–22 | `/engineer`: show Model 1 metric and its baseline with the source and held-out-valley label. Keep Model 3 and parcel-level CQR unquantified. | “The water model's monthly error against OpenET was 9.2512 millimeters, versus 29.0496 for its FAO-56 baseline.” | `Model 1 · MAE · diamond_valley_nv · OpenET baseline comparison` [S7] |
| 23–29 | `/showcase`: closing view, then team title card. Do not show a model 3 score, parcel CQR interval, or aquifer figure. | “Some evidence is still missing. Field Shift supports local review; it does not replace it.” | `[DATO REAL PENDIENTE: cifra oficial de acuífero, fuente y fecha, @H0M10]` · `[DATO REAL PENDIENTE: métrica validada del Modelo 3, @Checo-coder]` |

### CQR note for the final cut

Model 4 has a reported held-out-valley validation result, but the current
parcel evaluations do not provide observed values paired with sourced CQR
interval bounds. Do not present a parcel-level coverage, interval width, or
band as available. If a parcel-level CQR result is needed in the video, keep
this marker until the values and provenance are supplied:

`[DATO REAL PENDIENTE: observaciones y límites CQR con fuente, fecha y escala nativa, @H0M10 + @Checo-coder]`

## What changes from BACKUP to FINAL

- Replace prototype-only shots with screens connected to the verified
  `data_status: real` evaluation.
- Remove the **“Datos de ejemplo”** banner only when no fixture data is on
  screen; never show fixture-derived values.
- Add the documented multi-valley dataset, the unconfirmed Querétaro
  candidate boundary, and held-out model results with their baselines and
  limits.
- Keep CONAGUA, Model 3, and parcel-level CQR details pending until their
  exact data and provenance are confirmed.
- If a route does not show the approved real evaluation, use the backup
  footage rather than implying it does.

## Source notes

- **[S1] Dataset size and scope:** `PLAN.md`, task D-05 (720-row export);
  `models/model_1_crop_water/CARD.md`, Data → Table (15 parcels, three
  valleys, 2021–2024). The ignored parquet export is not present in this
  checkout, so its metadata was not independently inspected here.
- **[S3] Querétaro area and method:** `data-pipeline/parcels/queretaro.geojson`,
  `features[0].properties.note` (2.8 ha, Sentinel-2 at 10 m, visual
  confirmation pending); `PLAN.md`, entry C-13. An older entry in
  `data-pipeline/PLAN_DE_DATOS.md` still lists 13 ha.
- **[S4] FAO-56 reference bank:** `models/fao56_crop_bank.csv`, 32 unique
  `crop_code` records; `models/kc_monthly.csv`, 132 data rows across 11
  `crop_group` values; `PLAN.md`, task M-01 (agronomic review pending).
- **[S7] Model 1 comparison:** `models/model_1_crop_water/CARD.md`, Metric
  against baseline and Partition; `backend/artifacts/model_1_crop_water/metrics.json`,
  `metric.value`, `baseline_metric.value`, `partition_method`.
- **[S8] Model 2 comparison:** `models/model_2_prior_crop_effect/CARD.md`,
  Metric against baseline, Partition, and Limits;
  `backend/artifacts/model_2_prior_crop_effect/metrics.json`, `metric.value`,
  `baseline_metric.value`, `extra.mae_with_prior`, `extra.n_test`,
  `extra.observational_only`. The negative result is a lack of predictive
  improvement in this sample, not a causal finding.
- **Pending values:** `models/model_3_crop_history_gru/CARD.md` has no
  trained metric; `backend/data/queretaro.parquet` and
  `backend/data/diamond_valley.parquet` do not currently provide observed
  values paired with interval bounds and provenance; `PLAN.md`, task D-04
  and entry C-13, say the official CONAGUA figure is still missing.

## Exact information still to request

- **@H0M10:** the official CONAGUA aquifer value, unit, publication and
  reference date, and basin scope; plus confirmation of the real evaluation
  approved for filming and the source/date/native-scale metadata for each
  displayed measure.
- **@Checo-coder:** the trained Model 3 card (metric, baseline, held-out
  partition, limitations, and artifact status); any parcel-level CQR
  observed values and interval bounds with source/date/native scale; and
  visual confirmation of the 2.8-hectare Querétaro candidate boundary.
- **@Gicarrillo:** confirmation that `/tool` is connected to the approved
  real evaluation and which exact screen is safe to record.
- **A local farmer or adviser:** verified crop history, water availability,
  equipment, planting window, and buyer constraints for the selected
  Querétaro parcel.
