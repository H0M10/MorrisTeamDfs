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

Record only when the screens are connected to the verified `data_status: real` evaluation.
Do not show any fixture evaluation or `Datos de ejemplo` banner. Keep explicit scale,
observational, and assumption caveats visible on screen.

| Second | Image / route to record | Narration | On-screen text |
| --- | --- | --- | --- |
| 00–04 | `/showcase`: opening 3D globe-to-parcel zoom (`dv-nv-01`) with real HLS color strip. | “Field Shift combines NASA climate, soil moisture, and 30-meter imagery to review farm rotations.” | `15 parcels · 720 monthly rows · NV, ID, UT` [S1] |
| 05–09 | `/tool`: show Diamond Valley (`dv-nv-01`) or Querétaro (`qro-sjr-01`) regional context & FAO-56 bank. | “Each metric carries its source, date, and native scale—highlighting critical basin deficits and local assumptions.” | `NDWR Area 153 · CONAGUA 2203 (−56.89 hm³/yr)` · `FAO-56: 32 crops (H-03 audited)` [S3, S4, S6] |
| 10–15 | `/engineer`: show Model 1 (`9.25 mm` vs `29.05 mm`) and transparent negative Model 2 (`−6.3%`). | “Our water model cuts error vs. FAO-56, while negative prior-crop results stay honest—never marketed as causal savings.” | `Model 1: 9.25 mm MAE vs OpenET` · `Model 2: −6.3% (no local evidence)` [S7, S8] |
| 16–22 | `/engineer`: show Model 3 (`0.4143` macro F1) + live monthly attention weights and Model 4 CQR band (`dv-nv-01`, `31/36` inside). | “A lightweight ONNX GRU highlights key months in the crop sequence, and conformal bounds quantify regional uncertainty.” | `Model 3: 0.4143 vs 0.2222 F1` · `Model 4 CQR: 58.3% vs 22.9% (target 90%)` [S9, S10, S11] |
| 23–29 | `/tool/evidencia` + closing title card. | “Constraints first, evidence and gaps side by side—Field Shift supports local review, never replacing the grower.” | `Observed · Modeled · Assumed · Zero hidden guesses` · `Team The CSC` |

## What changes from BACKUP to FINAL

- Replace prototype-only shots with screens connected to `data_status: real` on Railway/Vercel.
- Confirm the **“Datos de ejemplo”** banner is absent on screen; never include fixture-derived figures.
- Highlight the verified held-out metrics (Models 1–4), live Model 3 attention weights (`dv-nv-01`), live CQR 90% interval band (`31/36` months inside on `dv-nv-01`), and basin context (NDWR Area 153 & CONAGUA Clave 2203).

## Source notes

- **[S1] Dataset size and scope:** `PLAN.md`, task D-05 (`data-pipeline/exports/multi_valley_us.parquet`, 720 rows, 15 parcels, 3 valleys, 2021–2024).
- **[S3] Querétaro candidate boundary & SIAP:** `data-pipeline/parcels/queretaro.geojson` (2.8 ha Sentinel-2 10 m boundary, local confirmation still noted) + `backend/data/qro-sjr-01.meta.json` (CONAGUA Clave 2203 DOF 2023-11-09 `−56.89 hm³/yr` + SIAP 2020–2025 municipal / 2025 state).
- **[S4] FAO-56 bank & H-03 audit:** `models/fao56_crop_bank.csv` (32 codes), `models/kc_monthly.csv` (132 rows), `PLAN.md` task M-06 (`trigo_primavera` in `dv-nv-01` `less_water`).
- **[S6] Basin & constraint context:** `backend/data/dv-nv-01.meta.json` (NDWR Area 153 Order 1264/1302) & `backend/data/qro-sjr-01.meta.json`.
- **[S7–S11] Held-out metrics (`diamond_valley_nv`):** `models/model_1_crop_water/CARD.md` (`9.2512` vs `29.0496 mm`), `models/model_2_prior_crop_effect/CARD.md` (`-6.3%`, `0.1541` vs `0.1450` NDVI), `models/model_3_crop_history_gru/CARD.md` (`0.4143` vs `0.2222` macro F1, ONNX CPU + `attention_weight`), `models/model_4_moisture_cqr/CARD.md` (`58.3333%` vs `22.9167%`, target `90%`, `31/36` months inside band on `dv-nv-01`).
