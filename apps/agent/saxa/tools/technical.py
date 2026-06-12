"""Tool `technical` — indicadores deterministas desde Postgres.

Adaptación de tools/scripts/technical.py de financial-freedom: en vez de
pedir velas a un proveedor externo, calcula sobre `market.yahoo_eod_bars`
(ya pobladas por apps/etl). Contrato idempotente: mismos datos ⇒ mismo output.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


def _sma(closes: list[float], window: int) -> float | None:
    if len(closes) < window:
        return None
    return round(sum(closes[-window:]) / window, 4)


def _rsi(closes: list[float], period: int = 14) -> float | None:
    """RSI de Wilder."""
    if len(closes) < period + 1:
        return None
    gains, losses = [], []
    for prev, cur in zip(closes[:-1], closes[1:]):
        delta = cur - prev
        gains.append(max(delta, 0.0))
        losses.append(max(-delta, 0.0))
    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period
    for g, l in zip(gains[period:], losses[period:]):
        avg_gain = (avg_gain * (period - 1) + g) / period
        avg_loss = (avg_loss * (period - 1) + l) / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return round(100 - 100 / (1 + rs), 2)


def technical_snapshot(pool, ticker: str, lookback_days: int = 260) -> dict[str, Any]:
    """RSI(14), SMA 20/50/200, distancia a máximos/mínimos 52w, retornos."""
    t = ticker.strip().upper()
    with pool.connection() as conn:
        rows = conn.execute(
            """
            select trade_date, close from market.yahoo_eod_bars
            where ticker = %s
            order by trade_date desc limit %s
            """,
            (t, lookback_days),
        ).fetchall()

    if not rows:
        return {
            "tool": "technical",
            "ticker": t,
            "omitted": True,
            "reason": "sin velas EOD en market.yahoo_eod_bars (¿corrió etl:yahoo?)",
        }

    rows.reverse()  # ascendente
    closes = [float(r[1]) for r in rows]
    last_close = closes[-1]
    high_52w = max(closes)
    low_52w = min(closes)

    def _ret(days: int) -> float | None:
        if len(closes) <= days:
            return None
        return round(100 * (last_close / closes[-1 - days] - 1), 2)

    return {
        "tool": "technical",
        "ticker": t,
        "as_of": rows[-1][0].isoformat(),
        "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "last_close": last_close,
        "rsi_14": _rsi(closes),
        "sma_20": _sma(closes, 20),
        "sma_50": _sma(closes, 50),
        "sma_200": _sma(closes, 200),
        "pct_from_52w_high": round(100 * (last_close / high_52w - 1), 2),
        "pct_from_52w_low": round(100 * (last_close / low_52w - 1), 2),
        "ret_5d": _ret(5),
        "ret_20d": _ret(20),
        "ret_60d": _ret(60),
        "bars": len(closes),
    }
