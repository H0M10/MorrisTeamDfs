# Field Shift — 30-second video script

Narration in English, about 75 words. Record only screens with `data_status: real` (no "Datos de ejemplo" banner). Before recording, analyze the field you will show once, so it opens instantly. Source notes are for the team, not on-screen text.

| Second | Screen to record | Narration | On-screen text |
| --- | --- | --- | --- |
| 00–05 | `/tool` → "Marcar mi campo": tap "Usar mi ubicación" or search Eureka, NV; tap the center of a Diamond Valley pivot; the yellow circle appears. | "A farmer marks a field on a satellite map." | `Any field in the contiguous US` |
| 05–10 | Press "Analizar mi campo"; cut to the result. Then `/tool/retrato`: the 36-month color strip and "Lo que leen los modelos". | "Field Shift pulls 36 months of NASA satellite and climate data for that exact field." | `HLS 30 m · SMAP 9 km · NASA POWER` [S1] |
| 10–17 | `/tool/rotaciones`: three rotations side by side; zoom on the water figures. | "Trained models propose the rotations similar fields actually follow and predict how much water each would use." | `Current 697 mm · Lower-water 398 mm · More-cover 645 mm` [S2] |
| 17–24 | `/tool/evidencia`: open one evidence card, then the Model 1 check sentence. | "Every number shows its source, and every model is tested on a valley it never saw — even the two that lose." | `Model 1: 20 mm vs 25 mm (FAO-56) · 5 models, all tested` [S3] |
| 24–30 | `/tool/compartir`: the share link and the adviser review; closing title card. | "Constraints first, evidence side by side, and a local adviser has the last word." | `Field Shift · Team The CSC · NASA Space Apps 2026` |

## Checklist before recording

- Railway and Vercel respond; `/health` lists the four contract models and `sequence_model` as trained.
- The field to show is analyzed beforehand (live results are lost on each Railway redeploy unless H-23 is done).
- No "Datos de ejemplo" banner on any screen.
- Use the figures on screen that day; if they differ from the numbers below, the screen wins and the on-screen text is updated.

## Source notes

- **[S1]** Data sources and scales: `docs/project_page.md`, Data table.
- **[S2]** `dv-nv-01` rotations on 2026-11-15: current 697 mm/yr (OpenET), lower-water 398 mm/yr (Model 1), more soil cover 645 mm/yr (Model 1, rotation from Model 5).
- **[S3]** Model metrics on Diamond Valley, unseen: `models/*/CARD.md` and `backend/artifacts/*/metrics.json`. Model 1 20.11 vs 25.25 mm; Model 2 −4.6 % (loses); Model 3 F1 0.27 vs 0.24; Model 4 96.3 % vs 62.0 %; Model 5 log-likelihood −0.785 vs −0.938, accuracy 78.1 % vs 79.5 % (loses on accuracy).
