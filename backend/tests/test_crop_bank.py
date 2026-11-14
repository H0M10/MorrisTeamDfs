"""Banco de cultivos FAO-56 conectado al motor."""

from __future__ import annotations

import filecmp

import pytest
from fastapi.testclient import TestClient

from app.config import BACKEND_DIR
from app.engine import crop_bank
from app.engine.crop_traits import BALER, CROP_TRAITS, IRRIGATION, SEEDER, TRAITS_TYPE, traits_for
from tests.conftest import FIXTURE_NAMES, load_fixture

REPO_MODELS = BACKEND_DIR.parent / "models"


def test_bank_has_32_codes_and_11_monthly_groups() -> None:
    crops = crop_bank.list_crops()
    assert len(crops) == 32
    assert len({c.crop_code for c in crops}) == 32
    groups = {c.crop_group for c in crops}
    assert len(groups) == 11
    for spec in crops:
        series = crop_bank.monthly_kc_series(
            spec.crop_code, [f"2024-{m:02d}" for m in range(1, 13)]
        )
        assert len(series) == 12
        assert all(0 < kc <= 1.3 for kc in series)


def test_get_crop_spec_reads_the_csv_values() -> None:
    alfalfa = crop_bank.get_crop_spec("alfalfa")
    assert alfalfa is not None
    assert (alfalfa.kc_ini, alfalfa.kc_mid, alfalfa.kc_end) == (0.40, 0.95, 0.90)
    assert (alfalfa.root_depth_m, alfalfa.depletion_fraction_p) == (1.50, 0.55)
    assert alfalfa.cdl_codes == (36,)
    assert alfalfa.machinery == ("IRRIGATION", "SEEDER", "BALER")
    assert crop_bank.get_crop_spec("maiz").cdl_codes == (1, 12, 13)  # type: ignore[union-attr]
    assert crop_bank.get_crop_spec("quinoa") is None


def test_monthly_kc_follows_the_group_table() -> None:
    # kc_monthly.csv, grupo alfalfa: enero 0.40, marzo 0.65, julio 0.95
    assert crop_bank.monthly_kc_series("alfalfa", ["2023-01", "2023-03", "2023-07"]) == [
        0.40,
        0.65,
        0.95,
    ]
    # La alfalfa en latencia es la misma especie: misma curva
    assert crop_bank.kc_for_month("alfalfa_dormant", 1) == 0.40
    # Rastrojo y barbecho: Kc mínimo 0.20 todo el año
    assert set(
        crop_bank.monthly_kc_series("rastrojo_maiz", [f"2023-{m:02d}" for m in range(1, 13)])
    ) == {0.20}
    assert crop_bank.kc_for_month("quinoa", 5) is None
    with pytest.raises(KeyError):
        crop_bank.monthly_kc_series("quinoa", ["2023-05"])


def test_cdl_lookup() -> None:
    assert crop_bank.crop_code_for_cdl(36) == "alfalfa"
    assert crop_bank.crop_code_for_cdl(1) == "maiz"
    assert crop_bank.crop_code_for_cdl(61) == "barbecho"
    assert crop_bank.crop_code_for_cdl(176) is None


def test_reference_note_is_bilingual_and_declares_assumption() -> None:
    note = crop_bank.fao56_reference_note()
    assert set(note) == {"es", "en"}
    assert "FAO" in note["es"]
    assert "supuesto" in note["es"]
    assert crop_bank.BANK_TYPE == "assumed"


def test_traits_are_built_from_the_bank() -> None:
    assert TRAITS_TYPE == "assumed"
    assert set(CROP_TRAITS) == {c.crop_code for c in crop_bank.list_crops()}
    alfalfa, dormant = traits_for("alfalfa"), traits_for("alfalfa_dormant")
    assert alfalfa is not None and dormant is not None
    assert alfalfa.machinery == (IRRIGATION, SEEDER, BALER)
    assert dormant.group == "alfalfa"  # mismo cultivo en pie: no es una siembra
    assert traits_for("cebada_forrajera").group == "cebada_forrajera"  # type: ignore[union-attr]
    assert traits_for("cebada_forrajera").bank_group == "small_grain"  # type: ignore[union-attr]
    cover = traits_for("trebol_cobertura")
    assert cover is not None and cover.sown and not cover.sold
    residue = traits_for("rastrojo_sorgo")
    assert residue is not None and not residue.sown and residue.machinery == ()
    # Cultivos nuevos del banco
    for code in ("frijol_seco", "girasol", "papa", "tomate", "soya", "algodon"):
        traits = traits_for(code)
        assert traits is not None and traits.sown and traits.sold


@pytest.mark.parametrize("name", FIXTURE_NAMES)
def test_every_fixture_crop_is_in_the_bank(name: str) -> None:
    data = load_fixture(name)
    codes = {m["crop_code"] for s in data["strategies"] for m in s["sequence_36m"]}
    assert codes <= set(CROP_TRAITS)


@pytest.mark.skipif(not REPO_MODELS.exists(), reason="/models no está (despliegue)")
@pytest.mark.parametrize("name", ["fao56_crop_bank.csv", "kc_monthly.csv"])
def test_backend_copy_matches_models_folder(name: str) -> None:
    assert filecmp.cmp(REPO_MODELS / name, crop_bank.DATA_DIR / name, shallow=False), (
        "La copia del banco está desactualizada: corre `python contracts/sync.py`"
    )


def test_crops_route(client: TestClient) -> None:
    response = client.get("/api/v1/crops")
    assert response.status_code == 200
    body = response.json()
    assert body["type"] == "assumed"
    assert body["traits_type"] == "assumed"
    assert body["source"] and body["date"] and body["native_scale"]
    assert set(body["reference_note"]) == {"es", "en"}
    assert len(body["crops"]) == 32
    by_code = {c["crop_code"]: c for c in body["crops"]}
    assert by_code["alfalfa"]["kc"] == {"ini": 0.4, "mid": 0.95, "end": 0.9}
    assert len(by_code["alfalfa"]["kc_monthly"]) == 12
    assert by_code["alfalfa"]["name"] == {"es": "Alfalfa henificada", "en": "Alfalfa hay"}
    assert by_code["papa"]["source"].startswith("FAO-56")


PIPELINE_CONFIG = BACKEND_DIR.parent / "data-pipeline" / "config.py"


@pytest.mark.skipif(not PIPELINE_CONFIG.exists(), reason="/data-pipeline no está (despliegue)")
def test_extended_cdl_groups_match_the_bank_and_model_3_keeps_four_classes() -> None:
    import importlib.util  # noqa: PLC0415

    spec = importlib.util.spec_from_file_location("pipeline_config", PIPELINE_CONFIG)
    assert spec is not None and spec.loader is not None
    config = importlib.util.module_from_spec(spec)
    import sys  # noqa: PLC0415

    sys.modules["pipeline_config"] = config  # dataclasses lo necesita al importar
    try:
        spec.loader.exec_module(config)
    finally:
        sys.modules.pop("pipeline_config", None)

    from_bank: dict[str, set[int]] = {}
    for crop in crop_bank.list_crops():
        from_bank.setdefault(crop.crop_group, set()).update(crop.cdl_codes)
    assert {g: set(c) for g, c in config.EXTENDED_CDL_GROUPS.items()} == from_bank

    # El modelo 3 sigue con sus cuatro clases
    assert set(config.CDL_GROUPS) == {"alfalfa", "small_grain", "corn", "fallow"}
    assert config.cdl_group(4) == "other"
    assert config.extended_cdl_group(4) == "sorghum"
    assert config.extended_cdl_group(43) == "root_tuber"
    assert config.extended_cdl_group(None) == "unknown"

    keys = {source.key: source for source in config.SOURCES}
    assert keys["gpm_imerg"].required is False
    assert keys["prism"].required is False and keys["prism"].labeled_only is True
