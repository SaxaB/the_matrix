"""Research pipeline del dominio finanzas (reescritura, diseño §5).

Espec de origen: tools/scripts/research_pipeline.py de financial-freedom.
Misma filosofía:
  - Determinista: mismo tipo de pregunta ⇒ mismo set de fuentes, en paralelo.
  - El pipeline NO decide nada operativo; recopila un bundle estructurado.
  - Step 0 SIEMPRE primero (aquí: cartera real desde Postgres).
  - Fuente que falla o no existe aún ⇒ entrada `omitted` con motivo (REGLA #6).

Cambios respecto al original: sin subprocess a scripts del repo viejo; las
fuentes son tools del paquete (Postgres, HTTP). Las fuentes sociales
(x_stonks, reddit_retail, citrini, carpatos) entran en F4+; mientras tanto
se declaran omitidas, nunca se inventan.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any

import httpx

from ...gates.source_gate import load_policy
from ...tools import carpatos, citrini, finnhub, reddit, x_lists
from ...tools.technical import technical_snapshot
from .portfolio import portfolio_report
from .step0 import load_portfolio_snapshot

# Fuentes aún no portadas: el bundle las declara omitidas explícitamente
PENDING_SOURCES: dict[str, str] = {}


def _omitted(name: str, reason: str) -> dict[str, Any]:
    return {"tool": name, "omitted": True, "reason": reason}


async def build_bundle(
    pool,
    question_type: str,
    tickers: list[str],
) -> dict[str, Any]:
    """Bundle estructurado para que la capa de síntesis redacte con datos."""
    bundle: dict[str, Any] = {
        "question_type": question_type,
        "tickers": tickers,
        "built_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }

    # Step 0 obligatorio
    try:
        bundle["step0_portfolio"] = await asyncio.to_thread(load_portfolio_snapshot, pool)
    except Exception as e:  # noqa: BLE001 — fallback declarado
        bundle["step0_portfolio"] = _omitted("step0_portfolio", f"error leyendo Postgres: {e}")

    portfolio_tickers: list[str] = (
        bundle["step0_portfolio"].get("tickers", [])
        if isinstance(bundle["step0_portfolio"], dict)
        else []
    )

    if question_type == "market_briefing":
        targets = portfolio_tickers[:8]
    elif question_type in ("single_ticker", "technical", "position_mgmt"):
        targets = tickers or portfolio_tickers[:3]
    else:
        targets = tickers[:3]

    social_cfg = (load_policy().get("pipeline_defaults") or {})

    async with httpx.AsyncClient() as client:
        quote_tasks = [finnhub.quote(client, t) for t in targets]
        news_tasks = [finnhub.company_news(client, t) for t in targets[:4]]
        tech_tasks = [asyncio.to_thread(technical_snapshot, pool, t) for t in targets]

        gathered: list[Any] = [
            asyncio.gather(*quote_tasks),
            asyncio.gather(*news_tasks),
            asyncio.gather(*tech_tasks),
        ]

        social_enabled = question_type == "market_briefing"
        if social_enabled:
            reddit_cfg = social_cfg.get("reddit_retail") or {}
            x_cfg = social_cfg.get("x_stonks") or {}
            citrini_cfg = social_cfg.get("citrini_substack") or {}
            query_terms = " ".join(targets[:5]) or "stocks market"
            gathered += [
                carpatos.latest_digest(),
                reddit.retail_digest(
                    client,
                    f"{query_terms} {' '.join(reddit_cfg.get('extra_terms', []))}".strip(),
                    subreddits=reddit_cfg.get("subreddits"),
                    limit_per_subreddit=int(reddit_cfg.get("limit_per_subreddit", 15)),
                ),
                x_lists.list_tweets_digest(
                    client,
                    x_cfg.get("list_url", ""),
                    max_results=int(x_cfg.get("max_results", 50)),
                ),
                citrini.citrini_digest(
                    client,
                    citrini_cfg.get("query"),
                    max_articles=int(citrini_cfg.get("max_articles", 3)),
                ),
            ]

        results = await asyncio.gather(*gathered)

    bundle["quotes"] = list(results[0])
    bundle["news"] = list(results[1])
    bundle["technical"] = list(results[2])

    if social_enabled:
        bundle["carpatos"] = results[3]
        bundle["reddit_retail"] = results[4]
        bundle["x_stonks"] = results[5]
        bundle["citrini_substack"] = results[6]
        if PENDING_SOURCES:
            bundle["pending_sources"] = {
                name: _omitted(name, reason) for name, reason in PENDING_SOURCES.items()
            }

    if question_type == "position_mgmt":
        try:
            bundle["portfolio_report"] = await asyncio.to_thread(portfolio_report, pool)
        except Exception as e:  # noqa: BLE001 — fallback declarado
            bundle["portfolio_report"] = _omitted("portfolio_report", f"error: {e}")

    return bundle
