"""Tool `citrini_substack` — posts recientes de Citrini Research vía Jina.

Port de citrini_digest.py (financial-freedom), sin subprocess: llama a la API
de Jina directo (s.jina.ai búsqueda + r.jina.ai lectura). JINA_KEYS opcional
(pool, coma-separado); sin key usa el tier anónimo con rate limit bajo.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

import httpx

DEFAULT_QUERY = (
    "site:citriniresearch.com OR site:citriniresearch.substack.com "
    "Citrini Research AI semiconductors supply chain"
)


def _keys() -> list[str]:
    pool = os.environ.get("JINA_KEYS", "")
    return [k.strip() for k in pool.split(",") if k.strip()]


async def _jina_get(client: httpx.AsyncClient, url: str) -> httpx.Response | None:
    keys = _keys() or [""]
    for key in keys:
        headers = {"Accept": "application/json"}
        if key:
            headers["Authorization"] = f"Bearer {key}"
        try:
            r = await client.get(url, headers=headers, timeout=45)
        except httpx.HTTPError:
            continue
        if r.status_code in (401, 402, 429) and key != keys[-1]:
            continue
        if r.status_code < 400:
            return r
    return None


async def citrini_digest(
    client: httpx.AsyncClient, query: str | None = None, max_articles: int = 3
) -> dict[str, Any]:
    q = query or DEFAULT_QUERY
    search = await _jina_get(client, f"https://s.jina.ai/{httpx.QueryParams({'q': q})['q']}")
    if search is None:
        return {"tool": "citrini_substack", "omitted": True,
                "reason": "búsqueda Jina falló (¿JINA_KEYS/rate limit?)"}

    try:
        results = (search.json().get("data") or [])[:max_articles]
    except ValueError:
        return {"tool": "citrini_substack", "omitted": True,
                "reason": "respuesta Jina no parseable"}
    if not results:
        return {"tool": "citrini_substack", "omitted": True,
                "reason": "sin resultados recientes en la búsqueda"}

    articles = []
    for item in results:
        url = item.get("url")
        body = None
        if url:
            page = await _jina_get(client, f"https://r.jina.ai/{url}")
            if page is not None:
                try:
                    body = (page.json().get("data") or {}).get("content")
                except ValueError:
                    body = page.text
        articles.append({
            "title": item.get("title"),
            "url": url,
            "snippet": (item.get("description") or "")[:300],
            "content": (body or "")[:2500],
        })

    return {
        "tool": "citrini_substack",
        "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "query": q,
        "articles": articles,
    }
