from dataclasses import dataclass

from saxa.core.router import ModelRouter
from saxa.domains.finance.intent import detect_intent, detect_intent_keywords
from saxa.gates import source_gate
from saxa.gates.telegram_md_lint import lint


# ---------- intent (keywords primero, cheap-first) ----------

def test_briefing_keywords():
    intent = detect_intent_keywords("qué pasa hoy en el mercado?")
    assert intent.type == "market_briefing"


def test_single_ticker():
    intent = detect_intent_keywords("qué tal NVDA y AMD?")
    assert intent.type == "single_ticker"
    assert intent.tickers == ["NVDA", "AMD"]


def test_technical_has_priority_over_ticker():
    intent = detect_intent_keywords("RSI y soportes de QQQ")
    assert intent.type == "technical"
    assert "QQQ" in intent.tickers


def test_position_mgmt():
    intent = detect_intent_keywords("qué hago con mi corto de INTC")
    assert intent.type == "position_mgmt"


def test_stop_tickers_filtered():
    intent = detect_intent_keywords("OK el EUR y USD no son tickers")
    assert intent.tickers == []


@dataclass
class FakeResult:
    text: str
    input_tokens: int = 10
    output_tokens: int = 5
    model: str = "fake"
    cost_usd: float = 0.0001


class FakeLlm:
    def __init__(self, text: str):
        self._text = text
        self.calls = 0

    def complete(self, spec, system, user):
        self.calls += 1
        return FakeResult(self._text)


def test_llm_only_called_when_keywords_fail(models_config):
    router = ModelRouter(models_config)
    llm = FakeLlm('{"type": "single_ticker", "tickers": ["NVDA"]}')

    # Keywords deciden: el modelo NO se llama (cheap-first de verdad)
    detect_intent("briefing por favor", llm, router)
    assert llm.calls == 0

    # Keywords no deciden: entra el modelo barato
    intent = detect_intent("oye y la de las gráficas esa?", llm, router)
    assert llm.calls == 1
    assert intent.type == "single_ticker"
    assert intent.via == "llm"


# ---------- source_gate ----------

def test_briefing_without_sources_blocked():
    text = "Briefing completo de mercado: SPX +1%, NVDA sube. Todo bien."
    verdict = source_gate.evaluate(text)
    assert verdict["gated"] is True
    assert verdict["ok"] is False
    assert "SOURCE_GATE" in verdict["message"]


def test_casual_message_not_gated():
    verdict = source_gate.evaluate("NVDA ha presentado resultados esta tarde")
    assert verdict["gated"] is False
    assert verdict["ok"] is True


def test_valuation_claim_without_source_blocked():
    verdict = source_gate.evaluate("El fair value de MU me sale en $120, compra clara")
    assert verdict["ok"] is False
    assert verdict["gate"] == "valuation_claims"


def test_valuation_claim_with_source_passes():
    verdict = source_gate.evaluate(
        "Según dcf_manual.py el fair value de MU es $120 (escenario base)"
    )
    assert verdict.get("gate") != "valuation_claims"


# ---------- telegram_md_lint ----------

def test_lint_clean_text():
    assert lint("hola *mundo* sin problemas") == []


def test_lint_catches_unescaped_tilde():
    issues = lint("Mercado (~4h sesion US)")
    assert issues, "el ~ y los paréntesis sin escapar deben detectarse"
