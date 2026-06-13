"""Tools del dominio vault (P9, §14.9): consultas sobre METADATOS.

Independientes de la decisión #10 (backend de blobs): leen vault.documents.
Todo lo que sale hacia un LLM pasa por vault_gate.sanitize_document.
Allowlist de dominio (§14.3): estas tools no tocan finance ni viceversa.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from psycopg.rows import dict_row

from ...gates.vault_gate import sanitize_document


def list_expiring(pool, user_id: str | None = None, days: int = 90) -> dict[str, Any]:
    """Documentos activos que caducan en <= days (recordatorios proactivos, verde)."""
    sql = """
        select * from vault.documents
        where status = 'active' and expiry_date is not null
          and expiry_date <= current_date + %s::int
    """
    params: list[Any] = [days]
    if user_id:
        sql += " and user_id = %s"
        params.append(user_id)
    sql += " order by expiry_date"

    with pool.connection() as conn:
        conn.row_factory = dict_row
        rows = conn.execute(sql, params).fetchall()

    return {
        "tool": "vault.list_expiring",
        "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "window_days": days,
        "documents": [
            {
                **sanitize_document(r),
                "days_left": (r["expiry_date"] - datetime.now(timezone.utc).date()).days,
            }
            for r in rows
        ],
    }


def search_documents(pool, query: str, user_id: str | None = None,
                     limit: int = 10) -> dict[str, Any]:
    """Búsqueda simple por título/tipo/emisor/tags (metadatos, verde)."""
    like = f"%{query.strip()}%"
    sql = """
        select * from vault.documents
        where status = 'active' and (
          title ilike %s or issuer ilike %s or doc_type ilike %s
          or holder ilike %s or %s = any(tags)
        )
    """
    params: list[Any] = [like, like, like, like, query.strip().lower()]
    if user_id:
        sql += " and user_id = %s"
        params.append(user_id)
    sql += " order by expiry_date nulls last limit %s"
    params.append(limit)

    with pool.connection() as conn:
        conn.row_factory = dict_row
        rows = conn.execute(sql, params).fetchall()

    return {
        "tool": "vault.search",
        "query": query,
        "documents": [sanitize_document(r) for r in rows],
    }
