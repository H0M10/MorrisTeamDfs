# Field Shift — The CSC

Herramienta de apoyo a la decisión de rotación de cultivos para el reto
"Field Shift: Adapting Farms with NASA Data" del NASA Space Apps Challenge 2026.

Compara tres rotaciones (la actual, una con menos agua y una con más suelo
cubierto) para una parcela de riego. Evalúa primero las restricciones del
agricultor y puede responder que ninguna rotación es viable. Cada cifra dice de
dónde viene, de cuándo es, a qué escala y si es observada, modelada o supuesta.

> **Estado: datos de ejemplo.** Hoy la API sirve los archivos de
> `contracts/fixtures/` con `data_status: "fixture"`. Ninguna de esas cifras es
> real.

## Antes de tocar nada

Lee [AGENTS.md](AGENTS.md) (reglas), [PLAN.md](PLAN.md) (quién hace qué),
[HUMANO.md](HUMANO.md) (lo que necesita a una persona) y
[PISTAS_PARALELAS.md](PISTAS_PARALELAS.md). Cada carpeta tiene dueño.

| Carpeta | Qué es | Dueño |
| --- | --- | --- |
| [contracts/](contracts/) | Esquema JSON, fixtures y bitácora de cambios | Hanniel |
| [backend/](backend/) | API en FastAPI y motor físico | Hanniel |
| [supabase/](supabase/) | Migraciones SQL | Hanniel |
| [frontend/](frontend/) | Una sola app Next.js: `/tool`, `/showcase`, `/remote`, `/engineer` | Personas 4, 5 y 6 |
| [data-pipeline/](data-pipeline/) | Guiones de Earth Engine (corren en Colab) | Persona 1 |
| [models/](models/) | Entrenamiento y fichas de modelos (corren fuera de la laptop) | Persona 2 |
| [docs/](docs/) | Página del proyecto y guion del video | Persona 6 |

## Arrancar en una laptop de 8 GB

**Regla: un proceso pesado a la vez.** No dejes corriendo `npm run dev`
mientras corres `pytest`, ni la API junto con las pruebas del frontend. Nada de
Docker. Nada de datos crudos ni entrenamiento en local.

Necesitas [uv](https://docs.astral.sh/uv/) (`pip install uv`), Node 24 y git.
uv descarga Python 3.11 por su cuenta.

### 1. Variables de entorno

```bash
cp .env.example backend/.env
cp .env.example frontend/.env.local
```

Con los valores por omisión todo corre en modo de ejemplo, sin llaves.

### 2. API (`/backend`)

```bash
cd backend
uv sync                                   # crea .venv con Python 3.11
uv run uvicorn app.main:app --port 8000   # http://localhost:8000/docs
```

Pruebas (detén antes el servidor de Next.js):

```bash
uv run ruff check . && uv run ruff format --check . && uv run pytest
```

`uv sync` instala solo lo necesario para servir la API (unos 150 MB).
`uv sync --all-extras` agrega xgboost y onnxruntime para cargar modelos.

### 3. Interfaz (`/frontend`)

```bash
cd frontend
npm ci
npm run dev        # http://localhost:3000
```

Sin la API encendida, las páginas leen la copia local del fixture. Para ahorrar
memoria puedes trabajar así y encender la API solo para probar la integración.

Revisión antes de subir cambios (detén antes `npm run dev`):

```bash
npm run lint && npm run typecheck && npm run build && npm run test:a11y
```

### 4. Datos y modelos

No corren en la laptop. Los comandos, las cuentas y la memoria que pide cada
uno están en [HUMANO.md](HUMANO.md), [data-pipeline/README.md](data-pipeline/README.md)
y [models/README.md](models/README.md).

## Si cambias el contrato

El contrato vive en `contracts/`. El backend y el frontend guardan una copia
porque se despliegan por separado. Después de cualquier cambio aprobado:

```bash
python contracts/sync.py                     # actualiza las copias
cd backend && uv run python scripts/gen_schemas.py    # modelos Pydantic
cd frontend && npm run gen:types                      # tipos TypeScript
```

La integración continua falla si las copias o los modelos generados no
coinciden con `contracts/schema.json`.

## Integración continua

GitHub Actions corre solo lo que cambió: `backend.yml` (ruff y pytest) cuando
cambia `backend/` o `contracts/`; `frontend.yml` (lint, tipos, compilación y
accesibilidad con axe) cuando cambia `frontend/` o `contracts/`.

## Despliegue

- **API:** Railway, con `backend/` como directorio raíz. Usa `backend/railway.json`. Sin Docker.
- **Interfaz:** Vercel, con `frontend/` como directorio raíz.
- **Base de datos:** Supabase. Si no responde, guardar y compartir se desactivan y lo demás sigue.

Los pasos con cuentas están en [HUMANO.md](HUMANO.md).

## Uso de IA

Cada sesión de un agente queda registrada en [AI_USAGE.md](AI_USAGE.md).
