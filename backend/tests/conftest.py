from __future__ import annotations

import json
from collections.abc import Callable, Iterator
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.config import FIXTURES_DIR, Settings, get_settings
from app.main import create_app

FIXTURE_NAMES = ["diamond_valley", "queretaro", "no_viable_options"]
DV = "dv-nv-fixture-01"
QRO = "qro-sjr-fixture-01"
NO_VIABLE = "dv-nv-fixture-no-viable"


def load_fixture(name: str) -> dict[str, Any]:
    return json.loads((FIXTURES_DIR / f"{name}.json").read_text(encoding="utf-8"))


@pytest.fixture
def make_settings(tmp_path: Path) -> Callable[..., Settings]:
    """Settings que no leen ningún .env local."""

    def build(**overrides: Any) -> Settings:
        values: dict[str, Any] = {
            "data_mode": "fixture",
            "models_dir": tmp_path / "artifacts",
            "power_cache_dir": tmp_path / "power",
            "supabase_url": "",
            "supabase_anon_key": "",
        }
        values.update(overrides)
        return Settings(_env_file=None, **values)

    return build


@pytest.fixture
def make_client(make_settings: Callable[..., Settings]) -> Iterator[Callable[..., TestClient]]:
    clients: list[TestClient] = []

    def build(**overrides: Any) -> TestClient:
        settings = make_settings(**overrides)
        app = create_app(settings)
        app.dependency_overrides[get_settings] = lambda: settings
        client = TestClient(app)
        clients.append(client)
        return client

    yield build
    for client in clients:
        client.close()


@pytest.fixture
def client(make_client: Callable[..., TestClient]) -> TestClient:
    return make_client()
