"""LLM Wiki §9bis.5: la página se actualiza (no se reconstruye) y la
compactación usa el modelo barato con presupuesto."""

import json
from dataclasses import dataclass

import pytest

from saxa.core.budget import BudgetTracker
from saxa.core.llm import LlmClient
from saxa.core.router import ModelRouter
from saxa.domains.finance.decision import build_checkpointer
from saxa.domains.finance.wiki import compact_page, get_page, ticker_slug


class FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def fetchone(self):
        return self._rows[0] if self._rows else None

    def fetchall(self):
        return self._rows


class FakeConn:
    def __init__(self, store, log):
        self._store = store  # dict slug -> row dict
        self._log = log
        self.row_factory = None

    def execute(self, sql, params=None):
        s = " ".join(sql.lower().split())
        self._log.append((s, params))
        if "select * from finance.knowledge_pages" in s:
            row = self._store.get(params[0])
            return FakeResult([row] if row else [])
        if "insert into finance.knowledge_pages" in s:
            slug = params[0]
            prev = self._store.get(slug)
            self._store[slug] = {
                "slug": slug, "kind": params[1], "title": params[2],
                "content_md": params[3], "confidence": params[4],
                "drivers": params[5], "links": "[]",
                "open_questions": params[6], "sources": params[7],
                "version": (prev["version"] + 1) if prev else 1,
            }
            return FakeResult([])
        raise RuntimeError(f"query no soportada: {s[:80]}")

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


class FakePool:
    def __init__(self):
        self.store = {}
        self.log = []

    def connection(self):
        return FakeConn(self.store, self.log)


@dataclass
class FakeLlmResult:
    text: str
    input_tokens: int = 300
    output_tokens: int = 200
    model: str = "fake"
    cost_usd: float = 0.001


class CompactProvider:
    def __init__(self):
        self.last_user = None

    def complete(self, spec, system, user):
        self.last_user = user
        return FakeLlmResult(json.dumps({
            "content_md": "## NVDA\nTesis actualizada con los eventos nuevos.",
            "confidence": 0.7,
            "drivers": [{"driver": "HBM", "direction": "up", "evidence": "guidance"}],
            "open_questions": ["¿margen 2027?"],
        }))


def test_compact_creates_then_updates(models_config):
    pool = FakePool()
    provider = CompactProvider()
    llm = LlmClient({"anthropic": provider})
    router = ModelRouter(models_config)
    budget = BudgetTracker(10.0)
    slug = ticker_slug("NVDA")

    page1 = compact_page(pool, llm, router, budget, slug, "ticker", "NVDA",
                         new_info="[2026-06-10] (earnings) NVDA bate estimaciones")
    assert page1.version == 1
    assert page1.confidence == pytest.approx(0.7)
    # la página existente viaja en el prompt: se ACTUALIZA, no se reconstruye
    assert "página nueva" in provider.last_user

    page2 = compact_page(pool, llm, router, budget, slug, "ticker", "NVDA",
                         new_info="[2026-06-11] (guidance) sube guidance HBM")
    assert page2.version == 2
    assert "Tesis actualizada" in provider.last_user  # contenido previo incluido

    # presupuesto: dos llamadas registradas en la tarea barata
    assert budget.spent_today() == pytest.approx(0.002)


def test_compact_unparseable_raises(models_config):
    class BadProvider:
        def complete(self, spec, system, user):
            return FakeLlmResult("esto no es json")

    pool = FakePool()
    llm = LlmClient({"anthropic": BadProvider()})
    with pytest.raises(RuntimeError, match="no parseable"):
        compact_page(pool, llm, ModelRouter(models_config), BudgetTracker(10.0),
                     ticker_slug("MU"), "ticker", "MU", new_info="x")
    # y NO se ha escrito nada a medias
    assert pool.store == {}


def test_get_page_missing_is_none():
    assert get_page(FakePool(), "ticker:nadie") is None


def test_checkpointer_fallback_without_db():
    from langgraph.checkpoint.memory import InMemorySaver

    saver = build_checkpointer(None)
    assert isinstance(saver, InMemorySaver)
    # URL inválida: degrada a memoria avisando, nunca revienta el arranque
    saver = build_checkpointer("postgres://nadie:nada@localhost:1/x")
    assert isinstance(saver, InMemorySaver)
