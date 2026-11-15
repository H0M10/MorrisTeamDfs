# Field Shift: Adapting Farms with NASA Data

**Live tool:** https://morris-team-dfs.vercel.app/tool · **API:** https://morristeamdfs-production.up.railway.app/docs · **Code:** https://github.com/H0M10/MorrisTeamDfs

## The problem

Irrigated farms in the arid western United States plan crop rotations around water, soil, planting dates, equipment and local buyers. In Diamond Valley, Nevada, the challenge case, historical pumping has been near 76,000 acre-feet per year against an official perennial yield of 30,000 (Nevada Division of Water Resources, Hydrographic Area 153). Satellite and climate data can describe a field, but each source has its own resolution and limits. A useful decision aid has to show where every number comes from and what still needs a local person to confirm.

## What Field Shift does

A farmer or local adviser marks a field and compares three rotations over 36 months: the current one, one that uses less water and one that keeps the soil covered longer.

1. **Mark the field.** On a satellite map, use the phone's location or search a town, then tap the center of a pivot (small, medium or large) or tap the corners of any other field shape. Any field in the contiguous United States can be analyzed live in about 15–30 seconds. Fifty-nine pivots already detected in Diamond Valley open instantly.
2. **See the field from space.** A strip of 36 monthly colors from Harmonized Landsat Sentinel-2 imagery, plus what the crop models read for each year.
3. **Constraints first.** Water limit, machinery, crops without a buyer and planting window are checked before anything else. If no rotation fits, the tool says so and why; it never fills the gap with a recommendation.
4. **Three rotations** with water per year, months with a living crop, frost and heat days, and an evidence card for each: why it is suggested, supporting evidence, benefits, missing information and risks a local person must review.
5. **Share** a printable sheet and a private link where an adviser approves, corrects or discards the result. No names, phone numbers or emails are collected.

Every figure carries its source, date, native scale and type (observed, modeled or assumed). Regional products (NASA POWER about 50 km, SMAP 9 km) are never shown as field-level values.

## How it uses machine learning

Rules decide what is possible; trained models estimate what each option would mean. All five models were trained on 1,138 irrigated fields in six valleys of Nevada, Utah and Idaho (2016–2024) and measured on Diamond Valley, which none of them saw during training. Every model is reported against a baseline, including the two that lose.

| Model | What it does in the tool | Result on Diamond Valley (unseen) | Baseline |
| --- | --- | --- | --- |
| **1. Crop water use** (XGBoost, no satellite inputs) | Predicts monthly evapotranspiration for each candidate rotation from crop, weather and soil, adjusted to what OpenET measured on that field | **20.1 mm/month** mean error (7,524 field-months) | 25.2 mm (FAO-56 table) |
| **5. Crop sequences** (second-order Markov chain on USDA Cropland Data Layer 2015–2024) | Proposes the 3-year rotations that similar fields actually follow; rules and Model 1 then choose among them | Log-likelihood **−0.785** per year (752 field-years); top-1 accuracy 78.1 % | −0.938; 79.5 % (repeat last year) |
| **3. Crop-history reading** (small GRU with temporal attention, ONNX) | Reads 12 months of satellite indices and says which crop group was there each year, with its probability | Macro F1 **0.27** (627 field-years); 0.78 on the last year of the training valleys | 0.24 (always alfalfa) |
| **4. Soil moisture with interval** (FAO-56 balance + quantile trees + leave-one-valley-out conformal calibration) | 90 % interval for regional root-zone moisture each month | Coverage **96.3 %** (108 zone-months) | 62.0 % (historical range) |
| **2. Prior-crop effect** (XGBoost) | Nothing on screen: it loses to its baseline, so the tool states "no local evidence" | **−4.6 %** (546 field-years) | Same model without the prior crop |

What the results say, plainly:
- **Model 1** halves the error of the standard FAO-56 table but overestimates Diamond Valley, the highest valley, by 93–153 mm per year, so each field's alternatives are adjusted with that field's own OpenET measurement. On the challenge field it predicts that grain rotations save less water than the FAO-56 table promises (398 instead of 369 mm per year for the lower-water option, against 697 mm measured for the current alfalfa).
- **Model 5** is better than "repeat last year" at describing how likely each next crop is, which is what we use it for, but slightly worse at guessing a single crop. We report both numbers.
- **Model 3** separates small grain poorly in Diamond Valley (F1 0.21). Its attention weights are shown as "months that weighed most in the reading", never as an explanation.
- **Model 2** shows that, in these valleys, the previous crop does not help predict peak vigor. It is presented as observational and never as a cause or a water saving.

Google Dynamic World (a neural network on Sentinel-2) is shown next to Model 3 as an external reading of crop probability. It does not change any figure.

## Data

| Source | Scale | Used for |
| --- | --- | --- |
| NASA Harmonized Landsat Sentinel-2 (HLS) | 30 m | Monthly color, NDVI, NDMI, BSI and NDTI |
| NASA SMAP L4 | 9 km | Regional root-zone moisture (Model 4) |
| NASA POWER | about 50 km | Daily weather; FAO-56 Penman-Monteith reference ET, frost and heat days |
| NASA SRTM | 30 m | Elevation and slope |
| OpenET ensemble | 30 m | Water the field actually used; label for Model 1 |
| USDA Cropland Data Layer | 30 m | Crop history; labels for Models 3 and 5 |
| SoilGrids (ISRIC) | 250 m | Clay, sand, silt and organic carbon |
| USDA NASS QuickStats | county and state | Which crops have local buyers; hay prices as context |

Heavy processing runs in Google Earth Engine; only reduced tables reach the laptops. The FAO-56 crop bank (32 crop codes) was audited against county acreage, UNR Extension and FAO-56 Table 12.

## Limits

- Field Shift has not demonstrated farm-level water savings or yield gains. Its figures are measurements, model estimates with a reported error, or declared assumptions.
- Without a farmer's own declaration, constraints are derived from data (current water use, temperature, county census) and labeled as assumptions.
- Pivots are detected or drawn as approximate shapes, not official boundaries.
- It works in the contiguous United States, where OpenET and the Cropland Data Layer exist.

## Team

- **Hanniel · [@H0M10](https://github.com/H0M10):** evaluation contract, decision engine, API and models.
- **Checo · [@Checo-coder](https://github.com/Checo-coder):** data pipeline and model training.
- **Gicarrillo · [@Gicarrillo](https://github.com/Gicarrillo):** farmer-facing workflow and accessibility.
- **Alexis · [@alexishal8](https://github.com/alexishal8):** showcase, engineer view and delivery materials.

AI assistants were used to write and review code and documents; every session is logged in `AI_USAGE.md`. No language model produces any figure shown in the tool.

Field Shift was developed for the NASA Space Apps Challenge 2026.

## Source notes

- Model metrics: `backend/artifacts/<model>/metrics.json` and `models/<model>/CARD.md` (data, split, metric, baseline and limits for each model).
- Training table: 1,138 fields, 6 valleys, 2016–2024, 122,904 monthly rows (`data-pipeline/ee_sample_fields.py`, `ee_export_batched.py`, `build_table.py`).
- Diamond Valley pivots: `data-pipeline/ee_valley_fields.py`, `backend/data/diamond_valley_fields.parquet` (59 fields kept of 66 detected).
- Basin context and county market: `backend/data/dv-nv-01.meta.json` (NDWR Area 153, Orders 1264 and 1302; USDA 2022 Census of Agriculture, Eureka County).
- Live analysis: `backend/app/services/live.py` and `backend/app/sources/earth_engine.py`.
- Evaluation shape: `contracts/schema.json` (36 months, exactly three rotations, sourced metrics).
