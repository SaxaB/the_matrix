"""Radar / screener semanal (diseño §9bis.3).

Scoring DETERMINISTA sobre los datos ya ingestados (sin LLM en el núcleo):
  technical    momentum 60d + zona RSI + distancia a máximos (yahoo_eod_bars)
  fundamental  crecimiento de ingresos YoY + beneficio positivo (sec_edgar_metrics)
  risk         finai_risk_score invertido (yahoo_asset_snapshot)
  narrative    menciones en los digests sociales si se aportan (opcional)

Cada candidato del top N lleva un trade plan preliminar (§9bis.2) que pasa por
risk_gate antes de persistirse; la lista es recomendación L2.

La matemática de scoring está separada del I/O para poder testearla sin BD.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml

from ...tools.technical import _rsi, _sma  # reutiliza los cálculos deterministas
from .risk import PricePoint, TradePlan, risk_gate

RULES_PATH = Path(__file__).resolve().parents[4].parent / "infra" / "radar-rules.yaml"


def load_radar_rules(path: Path | None = None) -> dict[str, Any]:
    with (path or RULES_PATH).open("r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


# ---------------------------------------------------------------------------
# Entrada del scoring (una fila por ticker, ya recopilada del Postgres)
# ---------------------------------------------------------------------------

@dataclass
class TickerInputs:
    ticker: str
    closes: list[float]                  # ascendente; última = último cierre
    lows: list[float] = field(default_factory=list)
    market_cap: float | None = None
    avg_volume: float | None = None
    risk_score: int | None = None
    revenue_yoy_pct: float | None = None
    net_income_positive: bool | None = None
    narrative_mentions: int = 0


@dataclass(frozen=True)
class ScoredTicker:
    ticker: str
    total: float
    components: dict[str, float]
    last_close: float


def _clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))


def passes_filters(t: TickerInputs, rules: dict[str, Any]) -> bool:
    f = rules.get("filters", {})
    if len(t.closes) < int(f.get("min_bars", 0)):
        return False
    if t.market_cap is not None and t.market_cap < float(f.get("min_market_cap", 0)):
        return False
    if t.avg_volume is not None and t.avg_volume < float(f.get("min_avg_volume", 0)):
        return False
    if (
        t.risk_score is not None
        and t.risk_score > int(f.get("max_risk_score", 100))
    ):
        return False
    return True


def technical_score(t: TickerInputs, rules: dict[str, Any]) -> float:
    cfg = rules.get("technical", {})
    closes = t.closes
    last = closes[-1]

    days = int(cfg.get("momentum_days", 60))
    cap = float(cfg.get("momentum_cap_pct", 40))
    momentum = 0.0
    if len(closes) > days and closes[-1 - days] > 0:
        ret = 100 * (last / closes[-1 - days] - 1)
        momentum = _clamp01(ret / cap)

    rsi = _rsi(closes)
    lo, hi = float(cfg.get("rsi_sweet_low", 45)), float(cfg.get("rsi_sweet_high", 65))
    if rsi is None:
        rsi_score = 0.5
    elif lo <= rsi <= hi:
        rsi_score = 1.0
    else:
        dist = (lo - rsi) if rsi < lo else (rsi - hi)
        rsi_score = _clamp01(1 - dist / 25)

    high_52w = max(closes)
    pct_from_high = 100 * (1 - last / high_52w) if high_52w else 100.0
    max_dist = float(cfg.get("max_pct_from_52w_high", 25))
    proximity = _clamp01(1 - pct_from_high / max_dist) if max_dist else 0.0

    # tendencia: por encima de la SMA200 si hay historia
    sma200 = _sma(closes, 200)
    trend = 1.0 if (sma200 is not None and last > sma200) else (0.5 if sma200 is None else 0.0)

    return round((momentum + rsi_score + proximity + trend) / 4, 4)


def fundamental_score(t: TickerInputs, rules: dict[str, Any]) -> float:
    cfg = rules.get("fundamental", {})
    if t.revenue_yoy_pct is None:
        growth = 0.3  # sin datos: neutral-bajo, no se inventa
    else:
        floor = float(cfg.get("min_revenue_growth_pct", -5))
        cap = float(cfg.get("growth_cap_pct", 50))
        growth = _clamp01((t.revenue_yoy_pct - floor) / (cap - floor))
    income = 1.0 if t.net_income_positive else (0.5 if t.net_income_positive is None else 0.0)
    return round((growth * 0.7 + income * 0.3), 4)


def risk_component(t: TickerInputs) -> float:
    if t.risk_score is None:
        return 0.5
    # 5 (calma) -> ~1.0 ; 95 (estrés) -> ~0.0
    return round(_clamp01(1 - (t.risk_score - 5) / 90), 4)


def narrative_score(t: TickerInputs) -> float:
    # 0 menciones -> 0; 5+ menciones en digests -> 1
    return round(_clamp01(t.narrative_mentions / 5), 4)


def score_ticker(t: TickerInputs, rules: dict[str, Any]) -> ScoredTicker:
    w = rules.get("weights", {})
    components = {
        "technical": technical_score(t, rules),
        "fundamental": fundamental_score(t, rules),
        "risk": risk_component(t),
        "narrative": narrative_score(t),
    }
    total = sum(components[k] * float(w.get(k, 0)) for k in components)
    return ScoredTicker(t.ticker, round(total, 4), components, t.closes[-1])


# ---------------------------------------------------------------------------
# Trade plan preliminar por candidato (§9bis.3 último punto)
# ---------------------------------------------------------------------------

def preliminary_plan(
    t: TickerInputs, scored: ScoredTicker, rules: dict[str, Any]
) -> TradePlan:
    cfg = (rules.get("output") or {}).get("plan", {})
    last = scored.last_close

    discounts = [float(d) for d in cfg.get("entry_discounts_pct", [1.0, 4.0])]
    n = len(discounts)
    entries = [
        PricePoint(px=round(last * (1 - d / 100), 2), weight=round(1.0 / n, 4))
        for d in discounts
    ]
    # corrige el redondeo del último peso para que sumen exactamente 1.0
    entries[-1] = PricePoint(
        px=entries[-1].px, weight=round(1.0 - sum(e.weight for e in entries[:-1]), 4)
    )

    lookback = int(cfg.get("stop_lookback_days", 20))
    recent_lows = (t.lows or t.closes)[-lookback:]
    stop = round(min(recent_lows) * (1 - float(cfg.get("stop_buffer_pct", 2.0)) / 100), 2)

    avg_entry = sum(e.px * e.weight for e in entries)
    risk_per_share = avg_entry - stop
    target_r = float(cfg.get("target_r", 2.0))
    tp = round(avg_entry + risk_per_share * target_r, 2)

    return TradePlan(
        ticker=t.ticker,
        side="long",
        conviction=round(min(scored.total, 0.99), 3),
        position_pct_target=float(cfg.get("position_pct_target", 3.0)),
        entries=entries,
        stop_loss=stop,
        take_profits=[PricePoint(px=tp, weight=1.0)],
        r_multiple_target=round(target_r, 3),
        risk_score=t.risk_score,
    )


# ---------------------------------------------------------------------------
# I/O: recopilar inputs de Postgres y persistir resultados
# ---------------------------------------------------------------------------

def _collect_inputs(pool, rules: dict[str, Any]) -> list[TickerInputs]:
    from psycopg.rows import dict_row

    cfg = rules.get("fundamental", {})
    rev_concepts = [cfg.get("revenue_concept", "Revenues")] + list(
        cfg.get("revenue_fallback_concepts", [])
    )

    with pool.connection() as conn:
        conn.row_factory = dict_row
        snapshots = conn.execute(
            """
            select ticker, market_cap, average_volume, finai_risk_score
            from market.yahoo_asset_snapshot
            """
        ).fetchall()

        bars = conn.execute(
            """
            select ticker,
                   array_agg(close order by trade_date) as closes,
                   array_agg(low order by trade_date) as lows
            from (
              select ticker, trade_date, close, low
              from market.yahoo_eod_bars
              order by ticker, trade_date desc
            ) b
            group by ticker
            """
        ).fetchall()

        revenue = conn.execute(
            """
            select ticker, concept, period_end, value
            from market.sec_edgar_metrics
            where concept = any(%s) and fiscal_period in ('FY', 'Q4')
            order by ticker, period_end desc
            """,
            (rev_concepts,),
        ).fetchall()

        income = conn.execute(
            """
            select distinct on (ticker) ticker, value
            from market.sec_edgar_metrics
            where concept = %s
            order by ticker, period_end desc
            """,
            (cfg.get("income_concept", "NetIncomeLoss"),),
        ).fetchall()

    bars_by_ticker = {b["ticker"]: b for b in bars}
    income_by_ticker = {r["ticker"]: float(r["value"]) for r in income}

    rev_by_ticker: dict[str, list[float]] = {}
    for r in revenue:
        rev_by_ticker.setdefault(r["ticker"], []).append(float(r["value"]))

    inputs = []
    for snap in snapshots:
        ticker = snap["ticker"]
        b = bars_by_ticker.get(ticker)
        if not b:
            continue
        closes = [float(c) for c in b["closes"] if c is not None]
        lows = [float(low) for low in (b["lows"] or []) if low is not None]
        revs = rev_by_ticker.get(ticker, [])
        revenue_yoy = None
        if len(revs) >= 2 and revs[1]:
            revenue_yoy = 100 * (revs[0] / revs[1] - 1)
        ni = income_by_ticker.get(ticker)
        inputs.append(
            TickerInputs(
                ticker=ticker,
                closes=closes,
                lows=lows,
                market_cap=float(snap["market_cap"]) if snap["market_cap"] else None,
                avg_volume=float(snap["average_volume"]) if snap["average_volume"] else None,
                risk_score=snap["finai_risk_score"],
                revenue_yoy_pct=revenue_yoy,
                net_income_positive=(ni > 0) if ni is not None else None,
            )
        )
    return inputs


def run_radar(pool, rules: dict[str, Any] | None = None) -> dict[str, Any]:
    """Loop radar_semanal: puntúa el universo, persiste run + candidatos + planes."""
    from .portfolio import portfolio_report
    from .risk import persist_trade_plan

    rules = rules or load_radar_rules()
    inputs = _collect_inputs(pool, rules)
    eligible = [t for t in inputs if passes_filters(t, rules)]
    scored = sorted(
        (score_ticker(t, rules) for t in eligible), key=lambda s: -s.total
    )
    top_n = int((rules.get("output") or {}).get("top_n", 10))
    top = scored[:top_n]
    inputs_by_ticker = {t.ticker: t for t in inputs}

    try:
        portfolio = portfolio_report(pool)
    except Exception:  # noqa: BLE001 — sin cartera, el gate lo declara
        portfolio = None

    with pool.connection() as conn:
        run_row = conn.execute(
            """
            insert into finance.radar_runs (universe_size, scored, criteria)
            values (%s, %s, %s) returning id
            """,
            (len(inputs), len(eligible), json.dumps(rules)),
        ).fetchone()
        run_id = str(run_row[0])

    candidates = []
    for rank, s in enumerate(top, start=1):
        plan = preliminary_plan(inputs_by_ticker[s.ticker], s, rules)
        verdict = risk_gate(plan, portfolio=portfolio)
        plan_id = persist_trade_plan(pool, plan, verdict)
        summary = (
            f"score {s.total:.2f} (tec {s.components['technical']:.2f} / "
            f"fund {s.components['fundamental']:.2f} / riesgo {s.components['risk']:.2f})"
            + ("" if verdict["ok"] else " · plan rechazado por risk_gate")
        )
        with pool.connection() as conn:
            conn.execute(
                """
                insert into finance.radar_candidates
                  (run_id, rank, ticker, total_score, scores, summary, trade_plan_id)
                values (%s, %s, %s, %s, %s, %s, %s)
                """,
                (run_id, rank, s.ticker, s.total, json.dumps(s.components), summary, plan_id),
            )
        candidates.append(
            {"rank": rank, "ticker": s.ticker, "score": s.total,
             "plan_ok": verdict["ok"], "summary": summary}
        )

    return {
        "run_id": run_id,
        "ran_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "universe": len(inputs),
        "eligible": len(eligible),
        "candidates": candidates,
    }
