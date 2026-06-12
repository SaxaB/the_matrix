"""Síntesis con gates usando LLM fake (sin red, sin Postgres)."""

from dataclasses import dataclass

from saxa.core.budget import BudgetTracker
from saxa.core.config import Settings
from saxa.core.llm import LlmClient
from saxa.core.orchestrator import Hermes
from saxa.core.router import ModelRouter

BRIEFING_OK = """<b>Briefing de mercado</b>
Cartera (step 0): NVDA 40%, MU 20%. Cárpatos: sin sesión. Sectorial US: tech lidera.
Cross-asset: dólar plano, crudo -1%, oro estable, bonos sin cambios.
Noticias por ticker: NVDA presenta resultados.
X stonks: omitido (fuente no portada aún). Reddit retail: omitido (fuente no portada aún).
Citrini Substack: omitido (fuente no portada aún).
<b>Fuentes consultadas / omitidas</b>: portfolio, cárpatos, sectorial, cross-asset, noticias; omitidas X, Reddit y Citrini."""

BRIEFING_SIN_FUENTES = "<b>Briefing completo</b>: todo sube, compra todo."


@dataclass
class FakeResult:
    text: str
    input_tokens: int = 100
    output_tokens: int = 50
    model: str = "fake-model"
    cost_usd: float = 0.001


class ScriptedProvider:
    """Devuelve respuestas en orden; simula el modelo corrigiendo tras un gate."""

    def __init__(self, replies: list[str]):
        self._replies = list(replies)
        self.calls = 0

    def complete(self, spec, system, user):
        self.calls += 1
        text = self._replies.pop(0) if self._replies else "sin más respuestas"
        return FakeResult(text)


def make_hermes(models_config, loops_config, replies):
    settings = Settings(
        database_url="", telegram_bot_token="", anthropic_api_key="",
        models_config=models_config, loops_config=loops_config,
    )
    provider = ScriptedProvider(replies)
    llm = LlmClient({"anthropic": provider})
    budget = BudgetTracker(settings.daily_budget_usd)
    return Hermes(settings, ModelRouter(models_config), llm, budget, pool=None), provider, budget


def test_briefing_passes_gate_first_try(models_config, loops_config):
    hermes, provider, budget = make_hermes(models_config, loops_config, [BRIEFING_OK])
    reply = hermes._synthesize_with_gates(
        "briefing", {"question_type": "market_briefing"}, "briefing_synthesis", "briefing_diario"
    )
    assert reply.ok is True
    assert provider.calls == 1
    assert budget.spent_today() > 0


def test_gate_blocks_and_model_retries(models_config, loops_config):
    hermes, provider, _ = make_hermes(
        models_config, loops_config, [BRIEFING_SIN_FUENTES, BRIEFING_OK]
    )
    reply = hermes._synthesize_with_gates(
        "briefing", {"question_type": "market_briefing"}, "briefing_synthesis", "briefing_diario"
    )
    assert reply.ok is True
    assert provider.calls == 2
    assert len(reply.gate_failures) == 1


def test_gate_never_passes_returns_honest_failure(models_config, loops_config):
    hermes, provider, _ = make_hermes(
        models_config, loops_config, [BRIEFING_SIN_FUENTES] * 5
    )
    reply = hermes._synthesize_with_gates(
        "briefing", {"question_type": "market_briefing"}, "briefing_synthesis", "briefing_diario"
    )
    assert reply.ok is False
    # max_iterations=3 del loop briefing_diario
    assert provider.calls == 3
    assert "No he podido generar" in reply.text
