"""Tool `finnhub` — quote y noticias por ticker (port de finnhub_query.py).

Datos, no modelo: usa FINNHUB_API_KEY (tier gratuito). Contrato idempotente
y fallback declarado: si falla o no hay key, devuelve `omitted` con motivo
(REGLA #6 de financial-freedom: omitido, no inventado).
"""

from __future__ import annotations

import os
from datetime import date, datetime, timedelta, timezone
from typing import Any

import httpx

BASE = "https://finnhub.io/api/v1"


def _key() -> str | None:
    return os.environ.get("FINNHUB_API_KEY") or None


async def quote(client: httpx.AsyncClient, ticker: str) -> dict[str, Any]:
    t = ticker.strip().upper()
    key = _key()
    if not key:
        return {"tool": "finnhub.quote", "ticker": t, "omitted": True,
                "reason": "FINNHUB_API_KEY no configurada"}
    try:
        r = await client.get(f"{BASE}/quote", params={"symbol": t, "token": key}, timeout=15)
        r.raise_for_status()
        d = r.json()
        if not d.get("c"):
            return {"tool": "finnhub.quote", "ticker": t, "omitted": True,
                    "reason": "sin datos para el ticker"}
        return {
            "tool": "finnhub.quote",
            "ticker": t,
            "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "current": d.get("c"),
            "change": d.get("d"),
            "change_pct": d.get("dp"),
            "high": d.get("h"),
            "low": d.get("l"),
            "open": d.get("o"),
            "prev_close": d.get("pc"),
        }
    except httpx.HTTPError as e:
        return {"tool": "finnhub.quote", "ticker": t, "omitted": True,
                "reason": f"error HTTP: {e}"}


async def company_news(
    client: httpx.AsyncClient, ticker: str, days: int = 3, limit: int = 8
) -> dict[str, Any]:
    t = ticker.strip().upper()
    key = _key()
    if not key:
        return {"tool": "finnhub.news", "ticker": t, "omitted": True,
                "reason": "FINNHUB_API_KEY no configurada"}
    frm = (date.today() - timedelta(days=days)).isoformat()
    to = date.today().isoformat()
    try:
        r = await client.get(
            f"{BASE}/company-news",
            params={"symbol": t, "from": frm, "to": to, "token": key},
            timeout=20,
        )
        r.raise_for_status()
        items = r.json()[:limit]
        return {
            "tool": "finnhub.news",
            "ticker": t,
            "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "items": [
                {
                    "headline": i.get("headline"),
                    "source": i.get("source"),
                    "datetime": datetime.fromtimestamp(
                        i.get("datetime", 0), tz=timezone.utc
                    ).isoformat(timespec="seconds"),
                    "url": i.get("url"),
                }
                for i in items
            ],
        }
    except httpx.HTTPError as e:
        return {"tool": "finnhub.news", "ticker": t, "omitted": True,
                "reason": f"error HTTP: {e}"}
