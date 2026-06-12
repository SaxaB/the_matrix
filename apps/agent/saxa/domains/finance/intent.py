"""Detector de tipo de pregunta del dominio finanzas.

Cheap-first de verdad (§5ter.2): primero keywords deterministas (gratis,
portadas de research_pipeline.py); el modelo barato (tarea classify_intent)
solo entra si las keywords no deciden.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field

MARKET_BRIEFING_KEYWORDS = [
    "qué pasa", "que pasa", "qué ha pasado", "que ha pasado",
    "qué está pasando", "que esta pasando",
    "pasa hoy", "pasado hoy", "qué tal el mercado", "que tal el mercado",
    "punto informativo", "informativo", "briefing",
    "como va el mercado", "cómo va el mercado", "actualiza", "resumen del día",
    "resumen del dia", "qué cuentan", "que cuentan",
]

POSITION_KEYWORDS = [
    "mi corto", "mi largo", "mi posición", "mi posicion", "tengo en",
    "qué hago con", "que hago con", "cerrar el corto", "cerrar el largo",
    "mantener", "reducir", "aumentar",
]

TECHNICAL_KEYWORDS = [
    "técnico", "tecnico", "rsi", "macd", "bollinger", "adx", "soporte",
    "resistencia", "sma", "ema", "análisis técnico", "analisis tecnico",
    "niveles", "chart",
]

TICKER_PATTERN = re.compile(r"\b([A-Z]{1,5})\b")

STOP_TICKERS = {
    "I", "A", "AI", "OK", "AM", "PM", "US", "EU", "TV", "IT", "OR", "UP",
    "ESP", "ET", "USD", "EUR", "GBP", "RSI", "MACD", "BB", "ADX", "SMA", "EMA",
    "SPDR", "ETF", "TTM", "YTD", "FY", "EPS", "PE", "PEG", "PS", "ROE", "ROIC",
}

VALID_TYPES = {"market_briefing", "single_ticker", "position_mgmt", "technical", "unknown"}


@dataclass(frozen=True)
class Intent:
    type: str
    tickers: list[str] = field(default_factory=list)
    via: str = "keywords"  # keywords | llm


def extract_tickers(message: str) -> list[str]:
    raw = TICKER_PATTERN.findall(message)
    return [t for t in raw if len(t) >= 2 and t not in STOP_TICKERS]


def detect_intent_keywords(message: str) -> Intent:
    """Port determinista de detect_question_type (research_pipeline.py)."""
    lower = message.lower()
    tickers = extract_tickers(message)

    if any(kw in lower for kw in TECHNICAL_KEYWORDS):
        return Intent("technical", tickers)
    if any(kw in lower for kw in POSITION_KEYWORDS):
        return Intent("position_mgmt", tickers)
    if any(kw in lower for kw in MARKET_BRIEFING_KEYWORDS):
        return Intent("market_briefing", tickers)
    if tickers and len(tickers) <= 3:
        return Intent("single_ticker", tickers)
    return Intent("unknown", tickers)


CLASSIFY_SYSTEM = """Clasifica mensajes de un grupo de inversores. Responde SOLO JSON:
{"type": "market_briefing"|"single_ticker"|"position_mgmt"|"technical"|"unknown",
 "tickers": ["NVDA", ...]}
- market_briefing: pide el estado general del mercado hoy.
- single_ticker: pregunta por valores concretos.
- position_mgmt: pregunta qué hacer con una posición propia.
- technical: pide análisis técnico/niveles.
- unknown: nada de lo anterior."""


def detect_intent(message: str, llm=None, router=None, budget=None) -> Intent:
    """Keywords primero; modelo barato solo si unknown y hay cliente."""
    intent = detect_intent_keywords(message)
    if intent.type != "unknown" or llm is None or router is None:
        return intent

    spec = router.resolve("classify_intent")
    if budget is not None:
        budget.check_task(spec.task, spec.cost_budget_usd)
    result = llm.complete(spec, CLASSIFY_SYSTEM, message)
    if budget is not None:
        budget.record(spec.task, result.model, result.cost_usd,
                      result.input_tokens, result.output_tokens)
    try:
        payload = json.loads(result.text.strip().strip("`").removeprefix("json"))
        itype = payload.get("type", "unknown")
        if itype not in VALID_TYPES:
            itype = "unknown"
        tickers = [
            t for t in (payload.get("tickers") or [])
            if isinstance(t, str) and t.upper() not in STOP_TICKERS
        ]
        return Intent(itype, [t.upper() for t in tickers], via="llm")
    except (json.JSONDecodeError, AttributeError):
        return Intent("unknown", intent.tickers, via="llm")
