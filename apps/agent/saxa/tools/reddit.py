"""Tool `reddit_retail` — sentimiento retail desde los endpoints JSON públicos.

Port de tools/scripts/reddit_retail.py (financial-freedom): sin guardado a
disco; devuelve el digest estructurado (tickers más mencionados + top posts)
para el bundle. Fallback declarado si Reddit bloquea.
"""

from __future__ import annotations

import re
from collections import Counter
from datetime import datetime, timezone
from typing import Any

import httpx

DEFAULT_SUBS = ["wallstreetbets", "stocks", "investing"]
USER_AGENT = "the_matrix-research-pipeline/0.1"
NOISE_TICKERS = {"YOLO", "DD", "CEO", "CFO", "EPS", "ETF", "USD", "US", "AI", "ATH"}


def _normalize_post(subreddit: str, post: dict) -> dict[str, Any]:
    permalink = post.get("permalink") or ""
    url = f"https://www.reddit.com{permalink}" if permalink.startswith("/") else permalink
    return {
        "subreddit": subreddit,
        "title": post.get("title"),
        "selftext": (post.get("selftext") or "")[:600],
        "score": post.get("score"),
        "num_comments": post.get("num_comments"),
        "url": url,
    }


async def retail_digest(
    client: httpx.AsyncClient,
    query: str,
    subreddits: list[str] | None = None,
    limit_per_subreddit: int = 15,
) -> dict[str, Any]:
    subs = subreddits or DEFAULT_SUBS
    posts: list[dict[str, Any]] = []
    errors: dict[str, str] = {}

    for sub in subs:
        try:
            r = await client.get(
                f"https://www.reddit.com/r/{sub}/search.json",
                params={
                    "q": query, "restrict_sr": "1", "sort": "new",
                    "t": "day", "limit": str(limit_per_subreddit),
                },
                headers={"User-Agent": USER_AGENT},
                timeout=20,
            )
            r.raise_for_status()
            children = r.json().get("data", {}).get("children", [])
            posts.extend(_normalize_post(sub, c.get("data", {})) for c in children if c.get("data"))
        except (httpx.HTTPError, ValueError) as e:
            errors[sub] = str(e)[:200]

    if not posts and errors:
        return {"tool": "reddit_retail", "omitted": True,
                "reason": f"Reddit bloqueó/falló en todos los subs: {errors}"}

    tickers: Counter[str] = Counter()
    for post in posts:
        blob = f"{post.get('title') or ''} {post.get('selftext') or ''}"
        tickers.update(re.findall(r"\$?([A-Z]{2,5})\b", blob))
    for noise in NOISE_TICKERS:
        tickers.pop(noise, None)

    top_posts = sorted(
        posts,
        key=lambda p: (p.get("score") or 0) + (p.get("num_comments") or 0),
        reverse=True,
    )[:12]

    return {
        "tool": "reddit_retail",
        "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "query": query,
        "posts_analyzed": len(posts),
        "errors": errors or None,
        "top_tickers": tickers.most_common(15),
        "top_posts": top_posts,
    }
