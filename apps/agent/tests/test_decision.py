"""Grafo de decisión §9bis.4: orden garantizado, interrupt rojo y resume humano.

Sin red ni Postgres: LLM guionizado y pool falso que sirve velas sintéticas.
"""

from dataclasses import dataclass
from datetime import date, timedelta

import pytest

from saxa.core.budget import BudgetTracker
from saxa.core.llm import LlmClient
from saxa.core.router import ModelRouter
from saxa.domains.finance.decision import DecisionGraph

# ---------------- fakes ----------------

PLAN_ID = "11111111-2222-3333-4444-555555555555"
APPROVAL_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"


class FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def fetchone(self):
        return self._rows[0] if self._rows else None

    def fetchall(self):
        return self._rows


class FakeConn:
    def __init__(self, log):
        self._log = log
        self.row_factory = None

    def execute(self, sql, params=None):
        self._log.append((" ".join(sql.split()), params))
        s = sql.lower()
        today = date.today()
        if "from market.yahoo_eod_bars" in s and "trade_date, close" in s:
            # technical_snapshot: desc
            rows = [
                (today - timedelta(days=i), 100 * (1.002 ** (260 - i)))
                for i in range(260)
            ]
            return FakeResult(rows)
        if "select close, low from market.yahoo_eod_bars" in s:
            rows = [
                (100 * (1.002 ** (260 - i)), 99 * (1.002 ** (260 - i)))
                for i in range(260)
            ]
            return FakeResult(rows)
        if "from market.yahoo_asset_snapshot" in s:
            return FakeResult([(50_000_000_000, 25.0, "Technology", 30, None, 2_000_000)])
        if "insert into finance.trade_plans" in s:
            return FakeResult([(PLAN_ID,)])
        if "insert into agent.approvals" in s:
            return FakeResult([(APPROVAL_ID,)])
        if "update finance.trade_plans" in s or "update agent.approvals" in s:
            return FakeResult([])
        if "from finance.portfolio_operations" in s:
            return FakeResult([(0, None)])
        # portfolio_report y demás: sin datos -> que el caller lo declare omitido
        raise RuntimeError(f"query no soportada por el fake: {s[:80]}")

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


class FakePool:
    def __init__(self):
        self.log = []

    def connection(self):
        return FakeConn(self.log)


@dataclass
class FakeLlmResult:
    text: str
    input_tokens: int = 200
    output_tokens: int = 150
    model: str = "fake"
    cost_usd: float = 0.002


class FakeProvider:
    def __init__(self):
        self.calls = 0

    def complete(self, spec, system, user):
        self.calls += 1
        return FakeLlmResult(
            "<b>NVDA</b>: tesis basada en los datos del bundle. Plan citado. "
            "Pendiente de aprobación humana — nada se ejecuta solo."
        )


# ---------------- tests ----------------

@pytest.fixture()
def graph(models_config):
    pool = FakePool()
    provider = FakeProvider()
    g = DecisionGraph(
        pool,
        LlmClient({"anthropic": provider}),
        ModelRouter(models_config),
        BudgetTracker(10.0),
    )
    return g, pool, provider


def test_runs_to_interrupt_and_registers_approval(graph):
    g, pool, provider = graph
    state = g.start("nvda", "¿entramos?", thread_id="t1")

    # Orden garantizado: todos los nodos previos corrieron
    assert state["market_data"]["snapshot"]["sector"] == "Technology"
    assert state["historical_context"]["omitted"] is True       # F6 declarado
    assert state["trade_plan"]["ticker"] == "NVDA"
    assert state["gate_result"]["ok"] is True
    assert "aprobación humana" in state["synthesis"].lower()
    assert provider.calls == 1

    # Interrupt: aún sin estado final, aprobación roja registrada
    assert "final_status" not in state
    assert state["approval_id"] == APPROVAL_ID
    assert any("insert into agent.approvals" in q for q, _ in pool.log)
    # Nada publicado antes de la decisión humana
    assert not any("update finance.trade_plans" in q for q, _ in pool.log)


def test_resume_approved_publishes(graph):
    g, pool, _ = graph
    g.start("nvda", "¿entramos?", thread_id="t2")
    state = g.resume("t2", "approved", decided_by="alex")
    assert state["final_status"] == "published"
    updates = [(q, p) for q, p in pool.log if "update finance.trade_plans" in q]
    assert updates and updates[0][1] == ("published", PLAN_ID)
    assert any("update agent.approvals" in q for q, _ in pool.log)


def test_resume_rejected_does_not_publish(graph):
    g, pool, _ = graph
    g.start("nvda", "¿entramos?", thread_id="t3")
    state = g.resume("t3", "rejected", decided_by="alex")
    assert state["final_status"] == "rejected"
    updates = [(q, p) for q, p in pool.log if "update finance.trade_plans" in q]
    assert updates and updates[0][1] == ("rejected", PLAN_ID)


def test_resume_requires_valid_decision(graph):
    g, _, _ = graph
    g.start("nvda", "x", thread_id="t4")
    with pytest.raises(ValueError):
        g.resume("t4", "maybe", decided_by="alex")
