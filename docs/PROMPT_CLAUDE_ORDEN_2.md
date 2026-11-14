# Prompt Maestro para Claude (Fable 5.2) — Orden #2 + Banco de Cultivos y Fuentes Opcionales

Copia y pega este bloque íntegro en Claude (CLI) sobre la rama `pista/motor-api`.

---

```markdown
Lee primero `AGENTS.md` (o `CLAUDE.md`), `PLAN.md` y `docs/RECURSOS_NASA_Y_BANCO_CULTIVOS.md`.
Trabajas en la rama `pista/motor-api` apoyando a Hanniel (`@H0M10`) como constructor y auditor técnico.

REGLAS INQUEBRANTABLES:
1. Cero cifras inventadas. Todo dato numérico debe traer fuente, fecha, escala nativa y `type` (`observed`, `modeled`, `assumed`, `fixture`).
2. `contracts/schema.json` (v0.1.1) está CONGELADO: NO cambies su esquema; todos los códigos de cultivo nuevos siguen funcionando porque `crop_code` es string libre.
3. No cargues tablas grandes ni PyTorch en esta laptop de 8 GB RAM. Mantén la carga ligera y ejecuta pruebas al terminar en un solo proceso a la vez.
4. Al terminar, actualiza `AI_USAGE.md` con tu línea de sesión y corre todas las verificaciones al final.

OBJETIVO (Orden #2 + Expansión del Banco Agronómico para Compuerta G2):

### Tarea 1 — Corregir hallazgo científico `S-01` en `backend/app/models/loader.py`
En `ModelRegistry._report()` (alrededor de las líneas 249-262):
- Actualmente, cuando un modelo está en `"fallback"` en modo `"unlabeled"` (Querétaro), devuelve `"experimental": False`.
- `AGENTS.md` §4 y `contracts/fixtures/queretaro.json` exigen que `model_3_crop_history_gru` devuelva `"experimental": True` cuando `region_mode == "unlabeled"` incluso estando en respaldo (`fallback`).
- Corrige `loader.py` para fijar `"experimental": unlabeled and spec.name == "model_3_crop_history_gru"` en el retorno de fallback/absent, y agrega una prueba unitaria en `backend/tests/test_models_loader.py` que valide esto (manteniendo `Models.model_validate(report)` en verde).

### Tarea 2 — Conectar el Banco de Cultivos FAO-56 (`models/fao56_crop_bank.csv` + `models/kc_monthly.csv`) al Motor
Revisa `models/fao56_crop_bank.csv` (24 especies + alias de fixtures) y `models/kc_monthly.csv` (11 grupos × 12 meses).
1. Copia o sincroniza una copia compacta accesible desde `/backend/app/engine/data/` (o empaquetada dentro de `backend/app/`) para que **Railway** (que despliega solo `/backend` con `Root Directory = backend`) pueda leer `fao56_crop_bank.csv` y `kc_monthly.csv` sin salir de `/backend`.
2. Crea `backend/app/engine/crop_bank.py`:
   - Carga los cultivos de `fao56_crop_bank.csv` y los $K_c$ mensuales de `kc_monthly.csv`.
   - Expone helpers puros: `list_crops()`, `get_crop_spec(crop_code)`, `monthly_kc_series(crop_code, months)` y `fao56_reference_note()`.
   - Expone en `/api/v1` un endpoint de lectura `GET /api/v1/crops` (solo si no rompe rutas existentes) o asegúrate de que `crop_traits.py` construya `CROP_TRAITS` dinámicamente desde el banco conservando exactamente los códigos existentes (`alfalfa`, `alfalfa_dormant`, `cebada_forrajera`, `avena_forrajera`, `trigo_invierno`, `maiz`, `maiz_frijol`, `sorgo_grano`, `avena_cubierta`, `avena_veza`, `cubierta_mixta`, `triticale_cobertura`, `descanso_rastrojo`, `rastrojo_directo`, `rastrojo_maiz`, `rastrojo_sorgo`, `barbecho`) más los nuevos (`trigo_primavera`, `frijol_seco`, `garbanzo`, `lenteja`, `soya`, `girasol`, `canola`, `algodon`, `papa`, `cebolla`, `tomate`, `chile`, `ajo`, `brocoli`, `trebol_cobertura`).
   - Recuerda: `sown`, `sold` y `machinery` siguen marcados con `type: "assumed"` y fuente declarada (`TRAITS_SOURCE`).
   - Verifica que `backend/tests/test_constraints.py` siga pasando 100% sin cambios en las expectativas existentes.

### Tarea 3 — Implementar `backend/app/services/table_to_contract.py` y conectar `DATA_MODE=real` (`S-02`)
Construye `backend/app/services/table_to_contract.py` para transformar una tabla `.parquet` producida por `data-pipeline/build_table.py` en una evaluación completa válida contra `contracts/schema.json` (`Evaluation.model_validate(...)` en Pydantic):
1. Lee la serie mensual real (36 meses para `parcel_id`) desde Parquet (`pyarrow` / `pandas`):
   - `hls_color_hex`, índices (`ndvi`, `ndmi`, `bsi`, `ndti`), `rain_mm` (POWER), `et0_mm` (POWER), `frost_days`, `heat_days`, `smap_rootzone`/`smap_surface` (declarando escala nativa `"9 km (contexto regional)"` y usando `water_balance.exponential_filter` si falta serie de raíces, marcado como índice relativo).
   - `soil_profile` (`S-02`): calcula `organic_matter_pct = soc_gkg * 0.1724` declarando `source: "SoilGrids 250 m (soc × factor Van Bemmelen 0.1724)"` y `awc_mm_m` usando SSURGO si viene en tabla o la función de pedotransferencia declarada (Saxton & Rawls, 2006) a partir de `clay_pct`, `sand_pct` y `organic_matter_pct` con `type: "modeled"` / `"assumed"` explícito.
   - Si existe `imerg_rain_mm` o `ndre` (solo Sentinel-2 / HLS S30) en el Parquet, inclúyelos como evidencia contextual sin violar `additionalProperties: false` del esquema.
2. Calcula las 3 estrategias (`current`, `less_water`, `more_soil`) usando el motor determinista (`constraints.py`, `water_balance.py` con `kc_monthly.csv`, `crop_bank.py`) y los artefactos de `ModelRegistry` si existen y tienen métrica (o sus respaldos declarados si están en `fallback`), normalizando pesos de atención a suma `1.0` cuando vengan de ONNX.
3. Marca `"data_status": "real"`, respeta `"has_viable_options": false` si ninguna estrategia pasa las restricciones y completa `evidence_card` (`why_suggested`, `supporting_evidence`, `benefits`, `information_gaps`, `local_review_risks`) determinísticamente con los datos y fuentes reales (sin texto inventado por LLM).
4. Conecta `backend/app/services/evaluation.py` (`list_pilots`, `evaluate`, `simulate`) para leer los `.parquet` en `settings.resolve(settings.data_dir)` cuando `DATA_MODE == "real"` (si no hay archivo para ese `parcel_id`, sigue lanzando `real_data_unavailable(parcel_id)` -> HTTP 503 claro).
5. Crea pruebas completas en `backend/tests/test_table_to_contract.py` usando un `.parquet` sintético pequeño en `tmp_path` (con validación estricta contra `contracts/schema.json`).

### Tarea 4 — Enriquecimiento limpio en `data-pipeline/config.py` (opcional, sin romper núcleo)
En `data-pipeline/config.py`:
- Añade fuentes **opcionales (`required=False`)** de Grupo B definidas en `docs/RECURSOS_NASA_Y_BANCO_CULTIVOS.md`:
  - `gpm_imerg` (`NASA/GPM_L3/IMERG_MONTHLY_V07`, `~10 km (0.1°)`)
  - `prism` (`OREGONSTATE/PRISM/AN81m`, `~4 km (EE. UU.)`, `labeled_only=True`)
- Amplía `CDL_GROUPS` sin romper los 4 grupos existentes (`alfalfa`, `small_grain`, `corn`, `fallow`) agregando un diccionario separado `EXTENDED_CDL_GROUPS` (o leyendo los códigos CDL de `models/fao56_crop_bank.csv`) para `sorghum`, `beans_legumes`, `oilseeds`, `cotton`, `root_tuber`, `vegetables`, `cover_crop`, de modo que el Modelo 3 siga usando sus 4 clases originales mientras `table_to_contract.py` reconoce los 24 cultivos.

VERIFICACIONES OBLIGATORIAS AL TERMINAR (ejecutar en `/backend` y raíz, sin dejar procesos corriendo):
1. `python contracts/sync.py --check`
2. `python scripts/sync_board.py --check`
3. `cd backend && uv run ruff check .`
4. `cd backend && uv run ruff format --check .`
5. `cd backend && uv run pytest`

Si alguna prueba falla, corrígela antes de reportar. Reporta qué archivos editaste, los resultados exactos de ruff/pytest y agrega una entrada en `AI_USAGE.md`.
```
