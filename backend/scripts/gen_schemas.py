"""Genera app/schemas/contract.py a partir de app/contract_data/schema.json.

Uso (desde /backend):
    uv run python scripts/gen_schemas.py           regenera
    uv run python scripts/gen_schemas.py --check   falla si el archivo no está al día

No edites contract.py a mano: cambia /contracts/schema.json, corre
`python contracts/sync.py` y luego este guion.
"""

from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
SCHEMA = BACKEND / "app" / "contract_data" / "schema.json"
OUTPUT = BACKEND / "app" / "schemas" / "contract.py"


def generate(target: Path) -> None:
    subprocess.run(
        [
            sys.executable,
            "-m",
            "datamodel_code_generator",
            "--input",
            str(SCHEMA),
            "--input-file-type",
            "jsonschema",
            "--output",
            str(target),
            "--output-model-type",
            "pydantic_v2.BaseModel",
            "--target-python-version",
            "3.11",
            "--class-name",
            "Evaluation",
            "--enum-field-as-literal",
            "all",
            "--use-standard-collections",
            "--use-union-operator",
            "--use-double-quotes",
            "--field-constraints",
            "--disable-timestamp",
            "--formatters",
            "ruff-format",
        ],
        check=True,
        cwd=BACKEND,
    )


def normalized(path: Path) -> str:
    return path.read_text(encoding="utf-8").replace("\r\n", "\n")


def main(argv: list[str]) -> int:
    if "--check" not in argv:
        generate(OUTPUT)
        print(f"generado {OUTPUT.relative_to(BACKEND)}")
        return 0
    with tempfile.TemporaryDirectory() as tmp:
        fresh = Path(tmp) / "contract.py"
        generate(fresh)
        if not OUTPUT.exists() or normalized(fresh) != normalized(OUTPUT):
            print("app/schemas/contract.py no coincide con el esquema.")
            print("Corre: uv run python scripts/gen_schemas.py")
            return 1
    print("Modelos Pydantic al día.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
