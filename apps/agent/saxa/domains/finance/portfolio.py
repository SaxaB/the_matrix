"""Tool `portfolio` (diseño §9bis.1): cartera sobre Postgres, cálculo en vivo.

Amplía Step 0 con PnL abierto, exposición por sector, % de cartera y R abierto
por posición (si hay trade plan publicado con stop). Lectura pura: idempotente.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from psycopg.rows import dict_row


def _open_r(side: str, current: float, avg: float, stop: float | None) -> float | None:
    """R abierto: beneficio no realizado medido en unidades de riesgo inicial."""
    if not stop or not current or not avg:
        return None
    risk_per_share = (avg - stop) if side == "long" else (stop - avg)
    if risk_per_share <= 0:
        return None
    pnl_per_share = (current - avg) if side == "long" else (avg - current)
    return round(pnl_per_share / risk_per_share, 2)


def portfolio_report(pool) -> dict[str, Any]:
    out: dict[str, Any] = {
        "tool": "portfolio",
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    with pool.connection() as conn:
        conn.row_factory = dict_row
        positions = conn.execute(
            """
            select
              h.ticker,
              sum(h.quantity)             as quantity,
              avg(h.avg_price)            as avg_price,
              max(h.current_price)        as current_price,
              max(h.sector)               as sector,
              max(h.currency)             as currency,
              max(s.finai_risk_score)     as risk_score
            from finance.holdings h
            left join market.yahoo_asset_snapshot s on s.ticker = h.ticker
            group by h.ticker
            """
        ).fetchall()
        cash = conn.execute(
            "select currency, sum(amount) as amount from finance.cash_balances group by currency"
        ).fetchall()
        plans = conn.execute(
            """
            select distinct on (ticker) ticker, side, stop_loss
            from finance.trade_plans
            where status = 'published'
            order by ticker, created_at desc
            """
        ).fetchall()

    stops = {p["ticker"]: p for p in plans}
    total_value = sum(float(p["quantity"]) * float(p["current_price"] or 0) for p in positions)
    cash_total = sum(float(c["amount"]) for c in cash)
    nav = total_value + cash_total

    rows = []
    sector_exposure: dict[str, float] = {}
    for p in positions:
        qty = float(p["quantity"])
        avg = float(p["avg_price"])
        cur = float(p["current_price"] or 0)
        value = qty * cur
        plan = stops.get(p["ticker"])
        sector = p["sector"] or "Other"
        sector_exposure[sector] = sector_exposure.get(sector, 0.0) + value
        rows.append(
            {
                "ticker": p["ticker"],
                "quantity": qty,
                "avg_price": avg,
                "current_price": cur,
                "value": round(value, 2),
                "weight_pct": round(100 * value / nav, 2) if nav else None,
                "pnl_open": round((cur - avg) * qty, 2),
                "pnl_open_pct": round(100 * (cur / avg - 1), 2) if avg else None,
                "sector": sector,
                "risk_score": p["risk_score"],
                "open_r": _open_r(
                    (plan or {}).get("side", "long"),
                    cur,
                    avg,
                    float(plan["stop_loss"]) if plan else None,
                ),
            }
        )

    rows.sort(key=lambda r: -(r["value"] or 0))
    out["positions"] = rows
    out["cash"] = [{"currency": c["currency"], "amount": float(c["amount"])} for c in cash]
    out["totals"] = {
        "positions_value": round(total_value, 2),
        "cash": round(cash_total, 2),
        "nav": round(nav, 2),
        "pnl_open": round(sum(r["pnl_open"] for r in rows), 2),
    }
    out["sector_exposure_pct"] = {
        s: round(100 * v / nav, 2) for s, v in sorted(sector_exposure.items(), key=lambda kv: -kv[1])
    } if nav else {}
    out["open_positions"] = len(rows)
    return out
