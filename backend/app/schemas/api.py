"""Modelos de petición y respuesta que no son parte del contrato de evaluación.

La evaluación en sí (`Evaluation`) se genera desde /contracts/schema.json en
contract.py; aquí solo está lo que la envuelve.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.contract import Center, Evaluation, LocalizedText, MetricValue

Lang = Literal["es", "en"]
ParcelId = Field(min_length=1, max_length=80)


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class PlantingWindowIn(StrictModel):
    start_month: int = Field(ge=1, le=12)
    end_month: int = Field(ge=1, le=12)


class ConstraintsIn(StrictModel):
    """Lo que declara el agricultor. Se evalúa antes que cualquier modelo."""

    max_water_mm_year: float = Field(ge=0, le=5000)
    available_machinery: list[str] = Field(max_length=40)
    crops_without_buyer: list[str] = Field(max_length=40)
    planting_window: PlantingWindowIn


class EvaluateRequest(StrictModel):
    parcel_id: str = ParcelId
    constraints: ConstraintsIn | None = None


class AnalyzeRequest(StrictModel):
    """Un punto del mapa. Se analiza un círculo de 250 m de radio alrededor."""

    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)


class SimulateRequest(StrictModel):
    parcel_id: str = ParcelId
    constraints: ConstraintsIn


class AskRequest(StrictModel):
    parcel_id: str = ParcelId
    question: str = Field(min_length=1, max_length=500)
    lang: Lang = "es"
    constraints: ConstraintsIn | None = None


class AskSource(StrictModel):
    """Campo del contrato del que salió una parte de la respuesta."""

    path: str
    metric: MetricValue | None = None
    text: str | None = None


class AskResponse(StrictModel):
    answered: bool
    intent: str | None
    lang: Lang
    answer: str
    data_status: Literal["fixture", "real"]
    sources: list[AskSource]


class PilotSummary(StrictModel):
    id: str
    name: LocalizedText
    center: Center
    area_ha: MetricValue
    region_mode: Literal["labeled", "unlabeled"]
    has_viable_options: bool


class PilotsResponse(StrictModel):
    data_status: Literal["fixture", "real"]
    pilots: list[PilotSummary]


class ShareRequest(StrictModel):
    input: dict[str, Any] = Field(default_factory=dict)
    result: Evaluation


class ShareResponse(StrictModel):
    token: str
    path: str


class SharedEvaluation(StrictModel):
    token: str
    created_at: str
    input: dict[str, Any]
    result: dict[str, Any]


class ReviewIn(StrictModel):
    """Revisión del técnico local. Sin datos personales (AGENTS.md sección 7)."""

    verdict: Literal["approve", "correct", "discard"]
    comments: str | None = Field(default=None, max_length=2000)
    corrected_limits: ConstraintsIn | None = None


class Review(StrictModel):
    id: str
    verdict: Literal["approve", "correct", "discard"]
    comments: str | None = None
    corrected_limits: dict[str, Any] | None = None
    created_at: str


class ReviewsResponse(StrictModel):
    token: str
    reviews: list[Review]


class ErrorResponse(StrictModel):
    error: str
    message: LocalizedText
