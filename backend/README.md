# /backend — Motor y API

Dueño: Hanniel (`@H0M10`) y Checo (`@Checo-coder`) — Motor y API.
Entrega: API en FastAPI para Railway (solo CPU), motor físico determinista
FAO-56, evaluador de restricciones e inferencia de modelos.

## Arrancar

```bash
cd backend
uv sync                                   # Python 3.11 y versiones de uv.lock
uv run uvicorn app.main:app --port 8010   # documentación en /docs
```

Si `uv` no está en el PATH (pasa en Windows tras `pip install uv`), usa
`python -m uv` en su lugar.

```bash
uv run ruff check . && uv run ruff format --check . && uv run pytest
```

Las pruebas no salen a la red: POWER y Supabase van simulados.
En la laptop de 8 GB, detén `npm run dev` antes de correrlas.

## Qué hay

| Ruta | Qué hace |
| --- | --- |
| `app/main.py` | App de FastAPI, CORS y `/health` |
| `app/config.py` | Variables de entorno (`DATA_MODE`, CORS, Supabase, POWER, modelos) |
| `app/api/v1.py` | Rutas bajo `/api/v1` |
| `app/schemas/contract.py` | **Generado** desde `contracts/schema.json`. No se edita a mano |
| `app/schemas/api.py` | Peticiones y respuestas que envuelven la evaluación |
| `app/engine/constraints.py` | Restricciones primero: `viable`, `rejection_reason`, `has_viable_options` |
| `app/engine/crop_traits.py` | Rasgos de cultivo (todo supuesto; lo revisa un agrónomo) |
| `app/engine/water_balance.py` | ET0 Penman-Monteith, balance FAO-56 mensual, filtro exponencial |
| `app/engine/indices.py` | NDVI, NDMI, BSI, NDTI. Sin NDRE ni CAI |
| `app/engine/climate.py` | Frecuencia de heladas y calor por mes |
| `app/sources/power.py` | NASA POWER con caché en disco y tiempo de espera |
| `app/models/loader.py` | Artefactos XGBoost y ONNX; sin artefacto o sin métrica entra el respaldo |
| `app/services/evaluation.py` | Arma la evaluación (modo fixture o real) |
| `app/services/ask.py` | Enrutador de preguntas por reglas |
| `app/services/share.py` | Enlaces compartibles en Supabase |
| `app/contract_data/` | Copia de `/contracts` (la mantiene `python contracts/sync.py`) |

## Rutas

| Método y ruta | Qué devuelve |
| --- | --- |
| `GET /health` | Estado, `data_mode`, versión del contrato y estado de cada modelo |
| `GET /api/v1/pilots` | Parcelas piloto |
| `POST /api/v1/evaluate` | Evaluación completa según el contrato |
| `POST /api/v1/simulate` | La misma evaluación con la viabilidad recalculada |
| `POST /api/v1/ask` | Respuesta por reglas, solo con campos del contrato |
| `POST /api/v1/share` | Guarda una evaluación y devuelve su token |
| `GET /api/v1/share/{token}` | Lee una evaluación compartida |

Ejemplo:

```bash
curl -X POST localhost:8010/api/v1/simulate -H "content-type: application/json" -d '{
  "parcel_id": "dv-nv-fixture-01",
  "constraints": {
    "max_water_mm_year": 600,
    "available_machinery": ["pivote_central", "sembradora_grano", "empacadora"],
    "crops_without_buyer": [],
    "planting_window": {"start_month": 3, "end_month": 10}
  }
}'
```

Los errores salen como `{"error": "codigo", "message": {"es": "...", "en": "..."}}`.

## DATA_MODE

- `fixture` (por omisión): `/evaluate` sirve los fixtures tal cual, con
  `data_status: "fixture"`. `/simulate` solo vuelve a evaluar las restricciones
  sobre el mismo fixture; las demás cifras no cambian y todo sigue marcado
  como dato de ejemplo.
- `real`: usará las tablas precalculadas de `/data-pipeline`. Aún no existen:
  `/evaluate` responde 503 `real_data_unavailable` en vez de inventar.

Para conectar los datos reales el punto de entrada es `evaluate()` en
`app/services/evaluation.py`. El motor (`app/engine/`) ya son funciones puras
listas para recibir las series.

## Modelos

Cada modelo se busca en `MODELS_DIR/<nombre>/`:

```
artifacts/model_1_crop_water/model.ubj      (o model.json)
artifacts/model_1_crop_water/metrics.json
artifacts/model_3_crop_history_gru/model.onnx
```

`metrics.json` lo escribe el guion de entrenamiento de `/models`:

```json
{
  "metric": {"value": 41.0, "unit": "mm", "type": "modeled", "source": "...", "date": "2026-11", "native_scale": "30 m"},
  "baseline_metric": {"value": 58.0, "unit": "mm", "type": "modeled", "source": "...", "date": "2026-11", "native_scale": "30 m"},
  "partition_method": {"es": "...", "en": "..."}
}
```

Sin artefacto, sin `metrics.json` o si el artefacto no carga, el modelo queda
en `fallback` (o `absent` para el modelo 2 fuera de EE. UU.) y el campo
`models` de la respuesta lo dice. `/health` muestra el motivo.

## Si cambia el contrato

```bash
python contracts/sync.py                   # desde la raíz
cd backend && uv run python scripts/gen_schemas.py
uv run pytest
```

## Despliegue en Railway

Sin Docker. `railway.json` usa Railpack, que lee `.python-version` y `uv.lock`.
Directorio raíz del servicio: `backend`. Variables: las del bloque Backend de
`.env.example`. Los pasos con la cuenta están en `HUMANO.md`.

## Decisiones y límites de hoy

- `scikit-learn` está como extra opcional (`uv sync --extra train`): la API no
  lo usa para servir. Si el modelo 4 lo necesita para predecir, pásalo a
  dependencias.
- `xgboost-cpu` en vez de `xgboost`: mismo módulo, sin las bibliotecas de GPU
  que en Linux pesan cientos de MB.
- La tabla de rasgos de cultivo no incluye maquinaria de cosecha de grano.
- No hay RUSLE, NDRE ni CAI.
- La tabla de coeficientes de cultivo (Kc) de FAO-56, que es el respaldo del
  modelo 1, aún no está cargada: debe transcribirla y verificarla una persona.
