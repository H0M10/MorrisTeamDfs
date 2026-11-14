# Field Shift: Adapting Farms with NASA Data

## The problem

Farmers plan crop rotations around limited water, planting dates, equipment, soil, and the crops local buyers will accept. Earth-observation data can add useful context, but satellite pixels do not all match a farm parcel. A decision aid must show where its information comes from and what still needs local review.

## The project

Field Shift is a prototype for reviewing crop-rotation choices with a farmer or local adviser. Its evaluation contract describes a comparison of the current rotation with two alternatives: one intended to use less water and one intended to keep more soil covered. It checks declared farm constraints before comparing the options and provides a place to record supporting evidence, missing information, and risks for local review.

**Current status:** the evaluation screens use synthetic sample files marked `fixture`, not observations from a real farm. The data pipeline scripts are written but have not been run against Earth Engine; the collection identifiers still need catalog verification. No real NASA observation has been connected to a farm evaluation in the current app. The `/tool` workflow is still incomplete. Field Shift has not demonstrated water savings, yield gains, or a validated farm-specific recommendation.

## NASA data sources

The project has selected the following NASA sources for its planned data pipeline. The resolutions below are the products' native pixel or grid scales, not the accuracy or size of a farm-level measurement. The sources have **not** been ingested into the current evaluations.

| NASA source | Planned use | Native resolution | Status in this project |
| --- | --- | --- | --- |
| NASA POWER daily data | Weather context, including reference evapotranspiration, rainfall, temperature, frost, and heat | About 50 km; a 0.5° × 0.625° grid | A data client and pipeline step exist; no live data is in the current evaluation |
| Harmonized Landsat and Sentinel-2 (HLS L30/S30) | Monthly cloud-filtered color series and vegetation or surface indices | 30 m | Selected in the pipeline scripts; no real export has been run |
| NASA SMAP Level 4 | Surface and root-zone soil-moisture context | 9 km | Selected in the pipeline scripts; regional context only; no real export has been run |
| Shuttle Radar Topography Mission (SRTM) | Elevation and slope context | 30 m | Selected in the pipeline scripts; no real export has been run |

The Earth Engine collection identifiers in the scripts are explicitly marked as unverified and must be checked against the catalog before an export. These resolutions describe the planned products; they do not mean the prototype currently shows real observations at those scales. POWER and SMAP must not be presented as parcel-scale readings.

## How it works

The contract defines an evaluation timeline, declared farm constraints, three rotation choices, evidence notes, and model status. The backend includes deterministic constraint checks and calculation code for water balance, climate measures, and satellite indices. The current running evaluation path serves sample data. Rechecking constraints does not replace those samples with live NASA observations.

The `/showcase` page displays an evaluation timeline that can be browsed with buttons or arrow keys; hand control is optional. The `/engineer` page displays model-status and attention-weight tables from the evaluation it receives. Both currently show sample evaluation data. The farmer-facing `/tool` pages are a partial scaffold, not a complete working flow.

The Earth Engine and NASA POWER scripts describe how the team intends to prepare monthly parcel tables. They have not yet produced a real-data evaluation. Until that work is run and checked, the interface is a prototype, not a source of field-specific advice.

## Intended impact

Field Shift aims to make the trade-offs and evidence behind crop rotations easier for farmers and local advisers to review together. Its impact has not yet been measured. A real evaluation, verified source dates and scales, and locally reviewed constraints are needed before making field-specific claims.

## Team

- **Hanniel · [@H0M10](https://github.com/H0M10):** evaluation contract, decision engine, and API.
- **Checo · [@Checo-coder](https://github.com/Checo-coder):** Earth-observation data pipeline and model training and validation.
- **Gicarrillo · [@Gicarrillo](https://github.com/Gicarrillo):** farmer-facing workflow and accessibility.
- **Alexis · [@alexishal8](https://github.com/alexishal8):** showcase, engineer view, and delivery materials.

Field Shift is being developed for the NASA Space Apps Challenge 2026.
