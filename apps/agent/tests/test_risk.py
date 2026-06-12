"""risk_gate: defensa en código, no confianza en el LLM (§9bis.2)."""

import pytest

from saxa.domains.finance.risk import TradePlan, load_rules, risk_gate

# Plan de referencia (el JSON del diseño §9bis.2, NVDA long)
GOOD_PLAN = dict(
    ticker="NVDA",
    conviction=0.62,
    position_pct_target=4.0,
    entries=[{"px": 168.0, "weight": 0.5}, {"px": 158.0, "weight": 0.5}],
    stop_loss=149.0,
    take_profits=[{"px": 198.0, "weight": 0.5}, {"px": 230.0, "weight": 0.5}],
    r_multiple_target=3.64,
    max_loss_pct_portfolio=1.0,
    risk_score=41,
)


@pytest.fixture(scope="module")
def rules():
    return load_rules()


def make_plan(**overrides):
    return TradePlan(**{**GOOD_PLAN, **overrides})


def test_good_plan_passes(rules):
    plan = make_plan()
    # R calculado: avg_entry 163, avg_tp 214, riesgo 14 -> R = 51/14 ≈ 3.64
    assert plan.computed_r_multiple == pytest.approx(3.64, abs=0.01)
    verdict = risk_gate(plan, rules=rules)
    assert verdict["ok"] is True, verdict["violations"]


def test_weights_must_sum_one(rules):
    plan = make_plan(entries=[{"px": 168.0, "weight": 0.5}, {"px": 158.0, "weight": 0.3}])
    verdict = risk_gate(plan, rules=rules)
    assert any("suman" in v for v in verdict["violations"])


def test_single_entry_rejected(rules):
    plan = make_plan(entries=[{"px": 168.0, "weight": 1.0}])
    verdict = risk_gate(plan, rules=rules)
    assert any("escaladas" in v for v in verdict["violations"])


def test_stop_above_entry_rejected_for_long(rules):
    plan = make_plan(stop_loss=180.0, r_multiple_target=None)
    verdict = risk_gate(plan, rules=rules)
    assert any("stop loss incoherente" in v for v in verdict["violations"])


def test_invented_r_rejected(rules):
    plan = make_plan(r_multiple_target=9.9)
    verdict = risk_gate(plan, rules=rules)
    assert any("no cuadra" in v for v in verdict["violations"])


def test_poor_r_rejected(rules):
    # TP medio apenas por encima de la entrada: R ≈ 0.14
    plan = make_plan(
        take_profits=[{"px": 165.0, "weight": 1.0}],
        r_multiple_target=None,
    )
    verdict = risk_gate(plan, rules=rules)
    assert any("R calculado" in v for v in verdict["violations"])


def test_high_risk_score_caps_position(rules):
    # risk_score 80 => tope 3.0% según infra/risk-rules.yaml
    plan = make_plan(risk_score=80, position_pct_target=4.0)
    verdict = risk_gate(plan, rules=rules)
    assert any("excede el tope" in v for v in verdict["violations"])


def test_loss_at_stop_capped(rules):
    # Posición 8% con riesgo 8.6% del precio => pérdida a SL ≈ 0.69% OK;
    # subir a stop lejano dispara el tope del 1% del NAV
    plan = make_plan(stop_loss=120.0, position_pct_target=4.0, r_multiple_target=None)
    verdict = risk_gate(plan, rules=rules)
    assert any("pérdida a SL" in v for v in verdict["violations"])


def test_portfolio_limits(rules):
    portfolio = {
        "open_positions": 12,
        "totals": {"nav": 100000},
        "positions": [{"ticker": "NVDA", "weight_pct": 8.0}],
    }
    plan = make_plan()
    verdict = risk_gate(plan, portfolio=portfolio, rules=rules)
    assert any("posiciones" in v for v in verdict["violations"])      # tope nº posiciones
    assert any("exposición resultante" in v for v in verdict["violations"])  # 8+4 > 10


def test_no_portfolio_is_declared_not_silent(rules):
    verdict = risk_gate(make_plan(), portfolio=None, rules=rules)
    assert "omitted" in verdict["portfolio_checks"]


def test_short_side_stop_logic(rules):
    plan = make_plan(
        side="short",
        entries=[{"px": 100.0, "weight": 0.5}, {"px": 105.0, "weight": 0.5}],
        stop_loss=110.0,
        take_profits=[{"px": 80.0, "weight": 1.0}],
        r_multiple_target=None,
    )
    # avg_entry 102.5, riesgo 7.5, recompensa 22.5 -> R = 3.0
    assert plan.computed_r_multiple == pytest.approx(3.0, abs=0.01)
    verdict = risk_gate(plan, rules=rules)
    assert verdict["ok"] is True, verdict["violations"]
