# AI_USAGE.md — Bitácora de uso de Inteligencia Artificial

Registro obligatorio por `AGENTS.md` §1.10 para la entrega del NASA Space Apps Challenge 2026 (equipo The CSC). Cada sesión de agente agrega una línea al terminar.

| Fecha (Local) | Agente / Herramienta | Qué hizo | Carpeta(s) |
| --- | --- | --- | --- |
| 2026-11-14 01:35 | Antigravity (ARGON — modelo Gemini) | Lectura de `AGENTS.md` y `PISTAS_PARALELAS.md`; copia a `CLAUDE.md`; creación de estructura de carpetas con `README.md` de 2 líneas; diseño y validación de `contracts/schema.json`, 3 fixtures de 36 meses (`diamond_valley`, `queretaro`, `no_viable_options`) y `contracts/CHANGELOG.md`; creación inicial de `PLAN.md`, `HUMANO.md` y `AI_USAGE.md`. | `/`, `/contracts`, `/backend`, `/data-pipeline`, `/models`, `/frontend`, `/supabase`, `/docs` |
| 2026-11-14 02:10 | Claude Code (Claude Fable 5.2) | Bloque 0: `git init`, `.gitignore`, `.gitattributes`, `.editorconfig`, `.env.example`, `README.md` raíz, integración continua por carpeta (ruff y pytest para backend; lint, tipos, compilación y axe para frontend) y `contracts/sync.py` para copiar el contrato a backend y frontend. | `/`, `/.github`, `/contracts` (solo `sync.py`) |
