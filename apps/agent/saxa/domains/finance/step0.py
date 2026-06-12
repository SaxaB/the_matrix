"""Step 0 obligatorio del dominio finanzas (diseño §5).

Antes de cualquier pipeline se carga la exposición real del usuario/grupo.
Cambio clave respecto a financial-freedom: se lee la cartera REAL de Postgres
(finance.holdings + market.*), no prosa de bitacora/.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from psycopg.rows import dict_row


def load_portfolio_snapshot(pool) -> dict[str, Any]:
    """Devuelve resumen estructurado de cartera para enmarcar el briefing.

    Agrega todas las posiciones (el dominio finanzas sirve al grupo); el
    detalle por usuario queda para la web. Enriquecida con el risk score
    y el próximo earnings del snapshot de mercado si existe.
    """
    out: dict[str, Any] = {
        "loaded_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "postgres:finance.holdings",
    }
    with pool.connection() as conn:
        conn.row_factory = dict_row
        positions = conn.execute(
            """
            select
              h.ticker,
              sum(h.quantity)                              as quantity,
              avg(h.avg_price)                             as avg_price,
              max(h.current_price)                         as current_price,
              max(h.asset_class::text)                     as asset_class,
              max(h.sector)                                as sector,
              max(s.finai_risk_score)                      as risk_score,
              max(s.earnings_next_date)                    as earnings_next_date
            from finance.holdings h
            left join market.yahoo_asset_snapshot s on s.ticker = h.ticker
            group by h.ticker
            order by sum(h.quantity * h.current_price) desc
            """
        ).fetchall()

    total_value = sum(
        float(p["quantity"]) * float(p["current_price"] or 0) for p in positions
    )
    out["positions"] = [
        {
            "ticker": p["ticker"],
            "quantity": float(p["quantity"]),
            "avg_price": float(p["avg_price"]),
            "current_price": float(p["current_price"] or 0),
            "value": round(float(p["quantity"]) * float(p["current_price"] or 0), 2),
            "weight_pct": (
                round(
                    100 * float(p["quantity"]) * float(p["current_price"] or 0) / total_value,
                    2,
                )
                if total_value
                else None
            ),
            "asset_class": p["asset_class"],
            "sector": p["sector"],
            "risk_score": p["risk_score"],
            "earnings_next_date": (
                p["earnings_next_date"].isoformat() if p["earnings_next_date"] else None
            ),
        }
        for p in positions
    ]
    out["total_value"] = round(total_value, 2)
    out["tickers"] = [p["ticker"] for p in positions]
    return out
