"""Modelos de petición y respuesta que no son parte del contrato de evaluación.

La evaluación en sí (`Evaluation`) se genera desde /contracts/schema.json en
contract.py; aquí solo está lo que la envuelve.
"""

from __future__ import annotations

from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

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
    """Un punto del mapa y, si se quiere, el área exacta del campo.

    Sin `polygon` se analiza un círculo de 250 m alrededor del punto. Con `polygon`
    (lista de [lon, lat]: una figura predeterminada o dibujada) se analiza esa área.
    """

    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    polygon: list[tuple[float, float]] | None = Field(default=None, max_length=201)


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


GuideStep = Literal[
    "parcela", "retrato", "restricciones", "rotaciones", "evidencia", "compartir", "revision"
]
GuideId = Annotated[str, StringConstraints(pattern=r"^[a-z0-9][a-z0-9._-]{0,63}$")]
FieldKey = Annotated[str, StringConstraints(min_length=1, max_length=120)]
FieldValue = Annotated[str, StringConstraints(max_length=400)] | float | int | bool | None


class GuideItem(StrictModel):
    """Texto de la capa 1 (escrito por el equipo) de un elemento visible."""

    id: GuideId
    text: str = Field(min_length=1, max_length=600)


class GuideProfile(BaseModel):
    """Perfil de lectura. Se ignoran los ajustes que el backend no usa."""

    model_config = ConfigDict(extra="ignore")

    plain_language: bool = False


class GuideRequest(StrictModel):
    """Pregunta a la Guía sobre la pantalla actual.

    `fields` son los campos del contrato que la pantalla muestra (ruta → valor).
    Son, junto con los textos de `guide_items`, la pregunta y la transcripción,
    lo único de donde la respuesta puede sacar una cifra.
    """

    screen: GuideStep
    question: str = Field(min_length=1, max_length=500)
    lang: Lang = "es"
    visible_guide_ids: list[GuideId] = Field(default_factory=list, max_length=80)
    guide_items: list[GuideItem] = Field(default_factory=list, max_length=80)
    fields: dict[FieldKey, FieldValue] = Field(default_factory=dict, max_length=80)
    glossary_ids: list[GuideId] = Field(default_factory=list, max_length=40)
    transcript: str | None = Field(default=None, max_length=500)
    profile: GuideProfile = Field(default_factory=GuideProfile)
    session_id: str | None = Field(default=None, min_length=1, max_length=80)


class WaterLimitHeard(StrictModel):
    value: float
    unit: Literal["mm", "in", "acre_ft"]
    value_mm: float


class SetConstraint(StrictModel):
    """Límite que dijo la persona. Se confirma antes de aplicarlo en /simulate."""

    max_water_mm_year: WaterLimitHeard | None = None
    crops_without_buyer: list[str] = Field(default_factory=list)
    heard: str
    needs_confirmation: Literal[True] = True


class GuideResponse(StrictModel):
    answer: str
    highlight: list[str]
    go_to_step: GuideStep | None
    terms: list[str]
    set_constraint: SetConstraint | None = None
    source: Literal["llm", "rules"]
    lang: Lang


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
