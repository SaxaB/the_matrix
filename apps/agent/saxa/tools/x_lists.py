"""Tool `x_stonks` — tweets de una lista de X vía Apify (port de x_lists_fetch.py).

Actor scrape.badger/twitter-lists-scraper (~$0.20/1000 results). Pool de keys
con fallback automático en 401/402/403/429 (APIFY_KEYS=k1,k2 o APIFY_TOKEN).
Fallback declarado si no hay keys o todas fallan.
"""

from __future__ import annotations

import os
import re
from collections import Counter
from datetime import datetime, timezone
from typing import Any

import httpx

APIFY_BASE = "https://api.apify.com/v2"
ACTOR_ID = "scrape.badger~twitter-lists-scraper"
FALLBACK_CODES = {401, 402, 403, 429}
NOISE_TICKERS = {"YOLO", "DD", "CEO", "CFO", "EPS", "ETF", "USD", "US", "AI", "ATH", "RT"}


def _tokens() -> list[str]:
    pool = os.environ.get("APIFY_KEYS", "")
    if pool.strip():
        return [t.strip() for t in pool.split(",") if t.strip()]
    single = os.environ.get("APIFY_TOKEN", "").strip()
    return [single] if single else []


def extract_list_id(list_url_or_id: str) -> str:
    m = re.search(r"lists/(\d+)", list_url_or_id)
    return m.group(1) if m else list_url_or_id.strip()


def _engagement(t: dict) -> int:
    return sum(
        int(t.get(k) or 0)
        for k in ("favorite_count", "retweet_count", "reply_count", "bookmark_count")
    )


async def list_tweets_digest(
    client: httpx.AsyncClient, list_url: str, max_results: int = 50
) -> dict[str, Any]:
    tokens = _tokens()
    if not tokens:
        return {"tool": "x_stonks", "omitted": True,
                "reason": "APIFY_KEYS/APIFY_TOKEN no configuradas"}

    payload = {
        "mode": "Get List Tweets",
        "id": extract_list_id(list_url),
        "max_results": max_results,
    }
    url = f"{APIFY_BASE}/acts/{ACTOR_ID}/run-sync-get-dataset-items"

    last_error: str | None = None
    data: list[dict] | None = None
    for idx, token in enumerate(tokens):
        try:
            r = await client.post(url, params={"token": token}, json=payload, timeout=180)
        except httpx.HTTPError as e:
            last_error = f"red: {e}"
            continue
        if r.status_code in FALLBACK_CODES and idx < len(tokens) - 1:
            last_error = f"HTTP {r.status_code} (key agotada), probando siguiente"
            continue
        if r.status_code >= 400:
            last_error = f"HTTP {r.status_code}: {r.text[:200]}"
            break
        body = r.json() if r.text else []
        data = body if isinstance(body, list) else [body]
        break

    if data is None:
        return {"tool": "x_stonks", "omitted": True,
                "reason": f"todas las keys Apify fallaron ({last_error})"}

    tickers: Counter[str] = Counter()
    tweets = []
    for t in data:
        text = t.get("full_text") or t.get("text") or ""
        tickers.update(re.findall(r"\$([A-Z]{1,5})\b", text))
        tweets.append({
            "author": (t.get("user") or {}).get("screen_name") or t.get("author"),
            "text": text[:400],
            "engagement": _engagement(t),
            "created_at": t.get("created_at"),
        })
    for noise in NOISE_TICKERS:
        tickers.pop(noise, None)
    tweets.sort(key=lambda x: -(x["engagement"] or 0))

    return {
        "tool": "x_stonks",
        "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "list": extract_list_id(list_url),
        "tweets_analyzed": len(data),
        "top_cashtags": tickers.most_common(15),
        "top_tweets": tweets[:12],
    }
