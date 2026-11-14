"""Sincroniza docs/status.json dentro de docs/index.html para GitHub Pages y apertura local.

Uso:
    python scripts/sync_board.py           # inyecta docs/status.json en docs/index.html
    python scripts/sync_board.py --check   # verifica sin modificar (sale con codigo 1 si difiere)
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STATUS_PATH = ROOT / "docs" / "status.json"
INDEX_PATH = ROOT / "docs" / "index.html"

START_MARKER = "<!-- BOARD_STATUS_START -->"
END_MARKER = "<!-- BOARD_STATUS_END -->"


def render_embedded_block(data: dict) -> str:
    serialized = json.dumps(data, ensure_ascii=False, indent=2).replace("</", "<\\/")
    return (
        f'{START_MARKER}\n'
        f'<script id="board-data" type="application/json">\n'
        f"{serialized}\n"
        f"</script>\n"
        f"{END_MARKER}"
    )


def build_updated_html(html: str, data: dict) -> str:
    if START_MARKER not in html or END_MARKER not in html:
        raise ValueError(
            f"No se encontraron los marcadores {START_MARKER} ... {END_MARKER} en {INDEX_PATH}."
        )
    before, rest = html.split(START_MARKER, 1)
    _, after = rest.split(END_MARKER, 1)
    return before + render_embedded_block(data) + after


def main() -> int:
    parser = argparse.ArgumentParser(description="Sincroniza docs/status.json en docs/index.html")
    parser.add_argument("--check", action="store_true", help="Verifica sin escribir cambios.")
    args = parser.parse_args()

    if not STATUS_PATH.exists():
        print(f"ERROR: No existe {STATUS_PATH}", file=sys.stderr)
        return 1
    if not INDEX_PATH.exists():
        print(f"ERROR: No existe {INDEX_PATH}", file=sys.stderr)
        return 1

    data = json.loads(STATUS_PATH.read_text(encoding="utf-8"))
    current_html = INDEX_PATH.read_text(encoding="utf-8")
    expected_html = build_updated_html(current_html, data)

    if args.check:
        if current_html == expected_html:
            print("Tablero sincronizado.")
            return 0
        print("DESINCRONIZADO: ejecuta `python scripts/sync_board.py`.", file=sys.stderr)
        return 1

    if current_html != expected_html:
        INDEX_PATH.write_text(expected_html, encoding="utf-8", newline="\n")
        print(f"Actualizado {INDEX_PATH.relative_to(ROOT)} desde {STATUS_PATH.relative_to(ROOT)}.")
    else:
        print("Tablero ya estaba al día.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
