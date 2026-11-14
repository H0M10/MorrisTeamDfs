"""Cliente de NASA POWER con transporte simulado: ninguna prueba sale a la red."""

from __future__ import annotations

from datetime import date
from pathlib import Path

import httpx
import pytest

from app.sources.power import MAX_PARAMETERS, PowerClient, PowerError

START, END = date(2023, 1, 1), date(2023, 1, 3)
DAYS = ["20230101", "20230102", "20230103"]


class FakePower:
    """Responde como POWER y cuenta las peticiones."""

    def __init__(self) -> None:
        self.requests: list[httpx.Request] = []

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        names = request.url.params["parameters"].split(",")
        block = {
            name: {day: (-999.0 if day == DAYS[1] else float(i)) for day in DAYS}
            for i, name in enumerate(names)
        }
        return httpx.Response(
            200,
            json={
                "header": {"fill_value": -999.0},
                "properties": {"parameter": block},
                "parameters": {name: {"units": "C"} for name in names},
            },
        )


def client_with(handler: object, tmp_path: Path, **kwargs: object) -> PowerClient:
    return PowerClient(tmp_path / "cache", transport=httpx.MockTransport(handler), **kwargs)  # type: ignore[arg-type]


def test_daily_parses_values_and_fill_value(tmp_path: Path) -> None:
    fake = FakePower()
    result = client_with(fake, tmp_path).daily(39.68, -116.03, START, END, ["T2M_MAX", "T2M_MIN"])
    assert result.dates == (date(2023, 1, 1), date(2023, 1, 2), date(2023, 1, 3))
    # -999 es "sin dato": llega como None, nunca como número
    assert result.values["T2M_MAX"] == (0.0, None, 0.0)
    assert result.values["T2M_MIN"] == (1.0, None, 1.0)
    assert result.units["T2M_MAX"] == "C"
    assert "50 km" in result.native_scale

    params = fake.requests[0].url.params
    assert params["community"] == "AG"
    assert params["latitude"] == "39.6800"
    assert params["longitude"] == "-116.0300"
    assert (params["start"], params["end"]) == ("20230101", "20230103")
    assert "api_key" not in params  # POWER no pide llave


def test_second_call_is_served_from_disk_cache(tmp_path: Path) -> None:
    fake = FakePower()
    client = client_with(fake, tmp_path)
    first = client.daily(39.68, -116.03, START, END, ["T2M_MAX"])
    second = client.daily(39.68, -116.03, START, END, ["T2M_MAX"])
    assert len(fake.requests) == 1
    assert first == second
    assert len(list((tmp_path / "cache").glob("*.json"))) == 1


def test_cache_survives_a_new_client_and_an_offline_api(tmp_path: Path) -> None:
    client_with(FakePower(), tmp_path).daily(39.68, -116.03, START, END, ["T2M_MAX"])

    def offline(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("sin red", request=request)

    result = client_with(offline, tmp_path).daily(39.68, -116.03, START, END, ["T2M_MAX"])
    assert result.values["T2M_MAX"] == (0.0, None, 0.0)


def test_more_than_twenty_parameters_are_split(tmp_path: Path) -> None:
    fake = FakePower()
    names = [f"P{i:02d}" for i in range(45)]
    result = client_with(fake, tmp_path).daily(39.68, -116.03, START, END, names)
    sizes = [len(r.url.params["parameters"].split(",")) for r in fake.requests]
    assert sizes == [20, 20, 5]
    assert max(sizes) <= MAX_PARAMETERS
    assert set(result.values) == set(names)


def test_timeout_raises_power_error(tmp_path: Path) -> None:
    def slow(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("lento", request=request)

    with pytest.raises(PowerError, match="no respondió"):
        client_with(slow, tmp_path, timeout_s=2).daily(39.68, -116.03, START, END)
    assert not (tmp_path / "cache").exists()  # un fallo no deja caché


def test_http_error_raises_power_error(tmp_path: Path) -> None:
    with pytest.raises(PowerError, match="503"):
        client_with(lambda r: httpx.Response(503), tmp_path).daily(39.68, -116.03, START, END)


def test_unexpected_payload_raises_power_error(tmp_path: Path) -> None:
    with pytest.raises(PowerError):
        client_with(lambda r: httpx.Response(200, json={"messages": ["x"]}), tmp_path).daily(
            39.68, -116.03, START, END
        )
    with pytest.raises(PowerError):
        client_with(lambda r: httpx.Response(200, text="<html>"), tmp_path).daily(
            39.68, -116.03, START, END
        )


def test_invalid_arguments(tmp_path: Path) -> None:
    client = client_with(FakePower(), tmp_path)
    with pytest.raises(ValueError):
        client.daily(95.0, 0.0, START, END)
    with pytest.raises(ValueError):
        client.daily(0.0, 0.0, END, START)
    with pytest.raises(ValueError):
        client.daily(0.0, 0.0, START, END, [])
