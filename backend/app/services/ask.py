"""Enrutador determinista de preguntas (AGENTS.md sección 5).

No hay modelo de lenguaje. Unas reglas de palabras clave eligen la intención y
la respuesta se arma solo con campos de la evaluación: cada cifra sale de un
MetricValue con su ficha. Si ninguna regla aplica, lo dice.
"""

from __future__ import annotations

import unicodedata
from typing import Any

Evaluation = dict[str, Any]

# El orden importa: gana la primera intención con una palabra en la pregunta.
INTENT_KEYWORDS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("data_status", ("ejemplo", "fixture", "datos reales", "real data", "sample", "inventad")),
    ("viability", ("viable", "descart", "ruled out", "opcion", "option", "se puede", "feasible")),
    ("risks", ("riesgo", "risk", "revisar", "review", "cuidado")),
    ("gaps", ("falta", "no se sabe", "missing", "gap", "unknown", "desconoc")),
    ("benefits", ("beneficio", "ventaja", "benefit", "advantage")),
    ("evidence", ("evidencia", "evidence", "respald", "support", "prueba")),
    ("models", ("modelo", "model", "confianza", "metrica", "metric", "accuracy")),
    ("frost", ("helada", "frost", "frio", "cold")),
    ("heat", ("calor", "heat")),
    ("soil", ("suelo cubierto", "cobertura", "soil cover", "cubierto", "covered")),
    ("water", ("agua", "riego", "water", "irrigat")),
    ("why", ("por que", "porque", "why", "razon", "reason", "suger", "suggest")),
)

STRATEGY_KEYWORDS: dict[str, tuple[str, ...]] = {
    "current": ("actual", "current", "lo de hoy", "como estoy"),
    "less_water": ("menos agua", "less water"),
    "more_soil": ("mas suelo", "more soil"),
}

METRIC_BY_INTENT = {
    "water": "annual_water_mm",
    "frost": "frost_risk_days_year",
    "heat": "heat_risk_days_year",
    "soil": "soil_cover_months_36m",
}
CARD_BY_INTENT = {
    "why": "why_suggested",
    "evidence": "supporting_evidence",
    "benefits": "benefits",
    "gaps": "information_gaps",
    "risks": "local_review_risks",
}
# Con todo descartado no se habla de ventajas: se explica el descarte (regla 3).
REDIRECT_WHEN_NOTHING_VIABLE = {"why", "evidence", "benefits"}

TYPE_LABELS = {
    "es": {
        "observed": "observado",
        "modeled": "modelado",
        "assumed": "supuesto",
        "fixture": "dato de ejemplo",
    },
    "en": {
        "observed": "observed",
        "modeled": "modeled",
        "assumed": "assumed",
        "fixture": "example data",
    },
}

TEXT = {
    "es": {
        "unknown": "No sé responder eso con los datos de esta evaluación. Puedo hablar de "
        "agua, heladas, calor, suelo cubierto, por qué se sugiere cada rotación, su "
        "evidencia, beneficios, riesgos, qué información falta, si es viable y qué "
        "modelos se usaron.",
        "fixture": "Datos de ejemplo. ",
        "no_data": "sin dato",
        "none_viable": "Ninguna rotación es viable con las restricciones declaradas.",
        "viable": "viable",
        "source": "fuente",
        "date": "fecha",
        "scale": "escala",
        "real": "Estos datos son reales: cada cifra trae su fuente, fecha y escala.",
    },
    "en": {
        "unknown": "I cannot answer that with the data in this evaluation. I can talk about "
        "water, frost, heat, soil cover, why each rotation is suggested, its evidence, "
        "benefits, risks, what information is missing, whether it is viable and which "
        "models were used.",
        "fixture": "Example data. ",
        "no_data": "no data",
        "none_viable": "No rotation is viable under the declared constraints.",
        "viable": "viable",
        "source": "source",
        "date": "date",
        "scale": "scale",
        "real": "This data is real: every figure carries its source, date and scale.",
    },
}


def normalize(text: str) -> str:
    stripped = unicodedata.normalize("NFKD", text.lower())
    return "".join(ch for ch in stripped if not unicodedata.combining(ch))


def detect_intent(question: str) -> str | None:
    q = normalize(question)
    for intent, keywords in INTENT_KEYWORDS:
        if any(keyword in q for keyword in keywords):
            return intent
    return None


def detect_strategy(question: str) -> str | None:
    q = normalize(question)
    for strategy_id, keywords in STRATEGY_KEYWORDS.items():
        if any(keyword in q for keyword in keywords):
            return strategy_id
    return None


def format_metric(metric: dict[str, Any], lang: str) -> str:
    t = TEXT[lang]
    value = t["no_data"] if metric["value"] is None else f"{metric['value']:g} {metric['unit']}"
    return (
        f"{value} ({TYPE_LABELS[lang][metric['type']]}; {t['source']}: {metric['source']}; "
        f"{t['date']}: {metric['date']}; {t['scale']}: {metric['native_scale']})"
    )


def answer(evaluation: Evaluation, question: str, lang: str) -> dict[str, Any]:
    t = TEXT[lang]
    intent = detect_intent(question)
    is_fixture = evaluation["data_status"] == "fixture"
    lines: list[str] = []
    sources: list[dict[str, Any]] = []

    if intent and not evaluation["has_viable_options"] and intent in REDIRECT_WHEN_NOTHING_VIABLE:
        intent = "viability"

    wanted = detect_strategy(question)
    strategies = [
        (index, s)
        for index, s in enumerate(evaluation["strategies"])
        if wanted is None or s["id"] == wanted
    ]

    if intent is None:
        lines.append(t["unknown"])
    elif intent == "data_status":
        if is_fixture and "fixture_disclaimer" in evaluation:
            lines.append(evaluation["fixture_disclaimer"][lang])
            sources.append(
                {"path": "/fixture_disclaimer", "text": evaluation["fixture_disclaimer"][lang]}
            )
        elif not is_fixture:
            lines.append(t["real"])
        sources.append({"path": "/data_status", "text": evaluation["data_status"]})
    elif intent == "viability":
        if not evaluation["has_viable_options"]:
            lines.append(t["none_viable"])
            sources.append({"path": "/has_viable_options", "text": "false"})
        for index, strategy in strategies:
            reason = strategy["rejection_reason"]
            verdict = reason[lang] if reason else t["viable"]
            lines.append(f"{strategy['title'][lang]}: {verdict}")
            field = "rejection_reason" if reason else "viable"
            sources.append({"path": f"/strategies/{index}/{field}", "text": verdict})
    elif intent in METRIC_BY_INTENT:
        key = METRIC_BY_INTENT[intent]
        for index, strategy in strategies:
            metric = strategy["metrics"][key]
            lines.append(f"{strategy['title'][lang]}: {format_metric(metric, lang)}")
            sources.append({"path": f"/strategies/{index}/metrics/{key}", "metric": metric})
    elif intent in CARD_BY_INTENT:
        key = CARD_BY_INTENT[intent]
        for index, strategy in strategies:
            entry = strategy["evidence_card"][key]
            texts = [entry[lang]] if isinstance(entry, dict) else [item[lang] for item in entry]
            lines.append(f"{strategy['title'][lang]}: {' '.join(texts)}")
            sources.append(
                {"path": f"/strategies/{index}/evidence_card/{key}", "text": " ".join(texts)}
            )
    elif intent == "models":
        for name, report in evaluation["models"].items():
            note = report["active_mode_note"][lang]
            lines.append(f"{name} ({report['status']}): {note}")
            sources.append({"path": f"/models/{name}/active_mode_note", "text": note})

    answered = intent is not None and bool(lines)
    if not answered:
        lines = [t["unknown"]]
        sources = []
    prefix = t["fixture"] if is_fixture and answered and intent != "data_status" else ""
    return {
        "answered": answered,
        "intent": intent if answered else None,
        "lang": lang,
        "answer": prefix + "\n".join(lines),
        "data_status": evaluation["data_status"],
        "sources": sources,
    }
