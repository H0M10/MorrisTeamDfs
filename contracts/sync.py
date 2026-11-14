"""Copia el contrato a las carpetas que se despliegan por separado.

Railway despliega solo /backend y Vercel solo /frontend, así que ninguno ve
/contracts en producción. Este guion mantiene una copia idéntica en cada uno.
La fuente de verdad sigue siendo /contracts.

Uso:
    python contracts/sync.py           copia
    python contracts/sync.py --check   falla si alguna copia difiere (CI)
"""

from __future__ import annotations

import filecmp
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "contracts"
FILES = [
    "schema.json",
    "fixtures/diamond_valley.json",
    "fixtures/queretaro.json",
    "fixtures/no_viable_options.json",
]
TARGETS = [
    ROOT / "backend" / "app" / "contract_data",
    ROOT / "frontend" / "src" / "lib" / "contract",
]


def main(argv: list[str]) -> int:
    check = "--check" in argv
    stale: list[str] = []
    for target in TARGETS:
        for name in FILES:
            src, dst = SOURCE / name, target / name
            same = dst.exists() and filecmp.cmp(src, dst, shallow=False)
            if same:
                continue
            if check:
                stale.append(str(dst.relative_to(ROOT)))
            else:
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(src, dst)
                print(f"copiado {dst.relative_to(ROOT)}")
    if stale:
        print("Copias del contrato desactualizadas:")
        for item in stale:
            print(f"  {item}")
        print("Corre: python contracts/sync.py")
        return 1
    print("Contrato sincronizado.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
