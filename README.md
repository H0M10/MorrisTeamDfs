# Field Shift — The CSC

Herramienta de apoyo a la decisión de rotación de cultivos para el reto
"Field Shift: Adapting Farms with NASA Data" del NASA Space Apps Challenge 2026.

Compara tres rotaciones (la actual, una con menos agua y una con más suelo
cubierto) para una parcela de riego. Evalúa primero las restricciones del
agricultor y puede responder que ninguna rotación es viable. Cada cifra dice de
dónde viene, de cuándo es, a qué escala y si es observada, modelada o supuesta.

> **Estado: API real desplegada en Railway (`DATA_MODE=real`) con respaldo automático de fixtures.** En producción sirve las evaluaciones observadas y modeladas para Diamond Valley, NV (`dv-nv-01` y 59 pivotes detectados con satélite) y para cualquier campo de los 48 estados contiguos con el análisis en vivo, con 5 modelos medidos; cuando el frontend corre sin `NEXT_PUBLIC_API_URL`, muestra los archivos marcados como `fixture` de `contracts/fixtures/`.

## Enlaces en vivo (Producción)

- **Frontend (Vercel):** https://morris-team-dfs.vercel.app/
- **API FastAPI + Swagger (Railway):** https://morristeamdfs-production.up.railway.app/docs
- **Centro de Mando Visual (GitHub Pages):** https://h0m10.github.io/MorrisTeamDfs/

## Centro de Mando Visual (GitHub Pages)

El seguimiento en tiempo real de qué falta por hacer, qué está haciendo cada integrante, cómo se conectan backend/datos con frontend y qué decisiones requiere `HUMANO.md` vive en [docs/index.html](docs/index.html) (alimentado por [docs/status.json](docs/status.json)):

- **Tablero en GitHub Pages:** `https://h0m10.github.io/MorrisTeamDfs/` (tras activar Pages en Settings).
- **Presentación de arranque (8 diapositivas):** [docs/kickoff_equipo_the_csc.html](docs/kickoff_equipo_the_csc.html).
- **Sincronizar tras editar `docs/status.json`:** `python scripts/sync_board.py` (y `python scripts/sync_board.py --check`).

## Antes de tocar nada

Lee [AGENTS.md](AGENTS.md) (reglas), [PLAN.md](PLAN.md) (quién hace qué),
[HUMANO.md](HUMANO.md) (lo que necesita a una persona) y
[PISTAS_PARALELAS.md](PISTAS_PARALELAS.md). Cada carpeta tiene dueño.

| Carpeta | Qué es | Dueño | Rama |
| --- | --- | --- | --- |
| [contracts/](contracts/) | Esquema JSON, fixtures y bitácora de cambios | Hanniel (`@H0M10`) | `pista/motor-api` |
| [backend/](backend/) | API en FastAPI y motor físico | Hanniel (`@H0M10`) + apoyo `@Checo-coder` | `pista/motor-api` |
| [supabase/](supabase/) | Migraciones SQL | Hanniel (`@H0M10`) | `pista/motor-api` |
| [data-pipeline/](data-pipeline/) | Guiones de Earth Engine (corren en Colab) | Checo (`@Checo-coder`) | `pista/datos-modelos` |
| [models/](models/) | Entrenamiento y fichas de modelos (corren fuera de la laptop) | Checo (`@Checo-coder`) | `pista/datos-modelos` |
| [frontend/src/app/tool](frontend/src/app/tool/) | La herramienta del agricultor (`/tool`, Global) | `@Gicarrillo` | `pista/tool` |
| [frontend/](frontend/) (`/showcase`, `/engineer`) + [docs/](docs/) | Gestos, globo, `/engineer`, animaciones IA, página en inglés y video 30 s (`/remote` congelado) | Alexis (`@alexishal8`) | `pista/jueces-entrega` |

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
uv run uvicorn app.main:app --port 8010   # http://localhost:8010/docs
```

Pruebas (detén antes el servidor de Next.js):

```bash
uv run ruff check . && uv run ruff format --check . && uv run pytest
```

El entorno pesa unos 450 MB en disco. xgboost y onnxruntime solo se cargan en
memoria cuando existe un artefacto de modelo. Si `uv` no queda en el PATH tras
`pip install uv`, usa `python -m uv`.

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
