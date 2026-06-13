"""LLM Wiki (diseño §9bis.5): knowledge_pages que se actualizan, no se reconstruyen.

- `get_page` / `upsert_page`: acceso CRUD determinista.
- `compact_page`: compactación con modelo (tarea summarize_source, barata §5ter):
  fusiona la página existente + información nueva en una síntesis actualizada.
  La página anterior nunca se pierde sin más: la versión se incrementa y la
  procedencia queda en `sources`.

Saneo de PII (§9): a la API solo van contenido de mercado y texto de fuentes
públicas; nunca posiciones nominativas ni datos personales.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from psycopg.rows import dict_row

COMPACT_SYSTEM = """Mantienes una página de conocimiento viva sobre un valor/tema de inversión.
Recibes la página actual (markdown + metadatos) e información nueva. Devuelve SOLO JSON:
{"content_md": "...", "confidence": 0.0-1.0, "drivers": [{"driver": "...", "direction": "up|down|mixed", "evidence": "..."}],
 "open_questions": ["..."]}
Reglas:
- ACTUALIZA la página: integra lo nuevo, elimina lo obsoleto, conserva lo vigente.
- Markdown conciso (< 500 palabras): tesis, drivers, riesgos, hitos.
- confidence refleja la solidez de la tesis con la evidencia disponible.
- No inventes datos que no estén en la página o en la información nueva."""


@dataclass(frozen=True)
class KnowledgePage:
    slug: str
    kind: str
    title: str
    content_md: str
    confidence: float | None
    drivers: list[dict[str, Any]]
    links: list[dict[str, Any]]
    open_questions: list[str]
    version: int


def _row_to_page(row: dict[str, Any]) -> KnowledgePage:
    def _j(v):
        return v if isinstance(v, (list, dict)) else json.loads(v or "[]")

    return KnowledgePage(
        slug=row["slug"],
        kind=row["kind"],
        title=row["title"],
        content_md=row["content_md"],
        confidence=float(row["confidence"]) if row["confidence"] is not None else None,
        drivers=_j(row["drivers"]),
        links=_j(row["links"]),
        open_questions=_j(row["open_questions"]),
        version=row["version"],
    )


def ticker_slug(ticker: str) -> str:
    return f"ticker:{ticker.strip().lower()}"


def get_page(pool, slug: str) -> KnowledgePage | None:
    with pool.connection() as conn:
        conn.row_factory = dict_row
        row = conn.execute(
            "select * from finance.knowledge_pages where slug = %s", (slug,)
        ).fetchone()
    return _row_to_page(row) if row else None


def upsert_page(
    pool,
    slug: str,
    kind: str,
    title: str,
    content_md: str,
    *,
    confidence: float | None = None,
    drivers: list[dict[str, Any]] | None = None,
    open_questions: list[str] | None = None,
    sources: list[str] | None = None,
) -> None:
    with pool.connection() as conn:
        conn.execute(
            """
            insert into finance.knowledge_pages
              (slug, kind, title, content_md, confidence, drivers, open_questions, sources)
            values (%s, %s, %s, %s, %s, %s, %s, %s)
            on conflict (slug) do update set
              title = excluded.title,
              content_md = excluded.content_md,
              confidence = excluded.confidence,
              drivers = excluded.drivers,
              open_questions = excluded.open_questions,
              sources = excluded.sources,
              version = finance.knowledge_pages.version + 1
            """,
            (
                slug, kind, title, content_md, confidence,
                json.dumps(drivers or []), json.dumps(open_questions or []),
                json.dumps(sources or []),
            ),
        )


def compact_page(
    pool, llm, router, budget, slug: str, kind: str, title: str, new_info: str,
    sources: list[str] | None = None,
) -> KnowledgePage:
    """Fusiona página existente + información nueva con el modelo barato."""
    current = get_page(pool, slug)
    spec = router.resolve("summarize_source")
    budget.check_task(spec.task, spec.cost_budget_usd)

    payload = {
        "page": {
            "title": title,
            "content_md": current.content_md if current else "(página nueva, sin contenido)",
            "confidence": current.confidence if current else None,
            "drivers": current.drivers if current else [],
            "open_questions": current.open_questions if current else [],
        },
        "new_info": new_info[:8000],
    }
    result = llm.complete(spec, COMPACT_SYSTEM, json.dumps(payload, ensure_ascii=False))
    budget.record(spec.task, result.model, result.cost_usd,
                  result.input_tokens, result.output_tokens)

    text = result.text.strip().strip("`").removeprefix("json").strip()
    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"compactación no parseable para {slug}: {e}") from e

    upsert_page(
        pool, slug, kind, title,
        content_md=str(data.get("content_md", "")),
        confidence=data.get("confidence"),
        drivers=data.get("drivers") or [],
        open_questions=data.get("open_questions") or [],
        sources=sources or [],
    )
    page = get_page(pool, slug)
    assert page is not None
    return page


def compact_portfolio_pages(pool, llm, router, budget) -> dict[str, Any]:
    """Loop compactacion_wiki: actualiza la página de cada ticker en cartera
    con sus eventos de mercado recientes (memoria episódica → síntesis viva)."""
    with pool.connection() as conn:
        conn.row_factory = dict_row
        tickers = [
            r["ticker"]
            for r in conn.execute(
                "select distinct ticker from finance.holdings order by ticker"
            ).fetchall()
        ]
        events = conn.execute(
            """
            select ticker, kind, headline, detail, occurred_at::date::text as day
            from finance.market_events
            where occurred_at > now() - interval '8 days' and ticker is not null
            order by occurred_at desc
            """
        ).fetchall()

    events_by_ticker: dict[str, list[dict[str, Any]]] = {}
    for e in events:
        events_by_ticker.setdefault(e["ticker"], []).append(e)

    compacted, skipped = [], []
    for ticker in tickers:
        recent = events_by_ticker.get(ticker, [])
        if not recent:
            skipped.append(ticker)
            continue
        new_info = "\n".join(
            f"[{e['day']}] ({e['kind']}) {e['headline']}: {e.get('detail') or ''}"
            for e in recent
        )
        compact_page(
            pool, llm, router, budget,
            slug=ticker_slug(ticker), kind="ticker", title=ticker.upper(),
            new_info=new_info,
            sources=[f"market_events últimos 8 días ({len(recent)})"],
        )
        compacted.append(ticker)

    return {"compacted": compacted, "skipped_no_events": skipped}
