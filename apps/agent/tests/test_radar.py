"""Radar semanal: scoring determinista y planes preliminares (§9bis.3)."""

import pytest

from saxa.domains.finance.radar import (
    TickerInputs,
    load_radar_rules,
    passes_filters,
    preliminary_plan,
    score_ticker,
)
from saxa.domains.finance.risk import risk_gate


@pytest.fixture(scope="module")
def rules():
    return load_radar_rules()


def uptrend_ticker(ticker: str = "GOOD", n: int = 260) -> TickerInputs:
    # Subida suave del 0,2% por sesión: momentum positivo, por encima de SMA200
    closes = [100 * (1.002 ** i) for i in range(n)]
    return TickerInputs(
        ticker=ticker,
        closes=closes,
        lows=[c * 0.99 for c in closes],
        market_cap=50e9,
        avg_volume=2e6,
        risk_score=30,
        revenue_yoy_pct=20.0,
        net_income_positive=True,
    )


def downtrend_ticker(ticker: str = "BAD", n: int = 260) -> TickerInputs:
    closes = [100 * (0.998 ** i) for i in range(n)]
    return TickerInputs(
        ticker=ticker,
        closes=closes,
        lows=[c * 0.99 for c in closes],
        market_cap=50e9,
        avg_volume=2e6,
        risk_score=75,
        revenue_yoy_pct=-10.0,
        net_income_positive=False,
    )


def test_filters(rules):
    assert passes_filters(uptrend_ticker(), rules)
    microcap = uptrend_ticker()
    microcap.market_cap = 100e6
    assert not passes_filters(microcap, rules)
    stressed = uptrend_ticker()
    stressed.risk_score = 95
    assert not passes_filters(stressed, rules)
    short_history = uptrend_ticker(n=50)
    assert not passes_filters(short_history, rules)


def test_scoring_is_deterministic_and_ordered(rules):
    good = score_ticker(uptrend_ticker(), rules)
    bad = score_ticker(downtrend_ticker(), rules)
    assert good.total > bad.total
    # determinista: misma entrada, mismo score
    assert good.total == score_ticker(uptrend_ticker(), rules).total
    assert set(good.components) == {"technical", "fundamental", "risk", "narrative"}


def test_preliminary_plan_passes_risk_gate(rules):
    inputs = uptrend_ticker()
    scored = score_ticker(inputs, rules)
    plan = preliminary_plan(inputs, scored, rules)

    # estructura §9bis.2: entradas escaladas, pesos 1.0, SL bajo entrada, R objetivo
    assert len(plan.entries) == 2
    assert sum(e.weight for e in plan.entries) == pytest.approx(1.0)
    assert plan.stop_loss < plan.avg_entry
    assert plan.computed_r_multiple == pytest.approx(plan.r_multiple_target, abs=0.15)

    verdict = risk_gate(plan)
    assert verdict["ok"] is True, verdict["violations"]


def test_narrative_component(rules):
    quiet = uptrend_ticker()
    loud = uptrend_ticker()
    loud.narrative_mentions = 6
    assert score_ticker(loud, rules).total > score_ticker(quiet, rules).total
