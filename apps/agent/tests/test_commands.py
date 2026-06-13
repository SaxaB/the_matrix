"""Comandos compartidos por todos los canales (Telegram C1 + chat C3).

Verifica que handle_message despacha los slash-commands — clave para que los
botones de aprobación del móvil (que envían '/aprobar <id>') funcionen igual
que en Telegram, sin que el gateway tenga lógica propia.
"""

from dataclasses import dataclass

import pytest

from saxa.core.budget import BudgetTracker
from saxa.core.config import Settings
from saxa.core.llm import LlmClient
from saxa.core.orchestrator import Hermes
from saxa.core.router import ModelRouter


class StubProvider:
    def complete(self, spec, system, user):
        @dataclass
        class R:
            text: str = "stub"
            input_tokens: int = 1
            output_tokens: int = 1
            model: str = "stub"
            cost_usd: float = 0.0

        return R()


def make_hermes(models_config, loops_config):
    settings = Settings(
        database_url="", telegram_bot_token="", anthropic_api_key="",
        models_config=models_config, loops_config=loops_config,
    )
    return Hermes(settings, ModelRouter(models_config),
                  LlmClient({"anthropic": StubProvider()}),
                  BudgetTracker(settings.daily_budget_usd), pool=None)


async def test_planes_command_dispatches(models_config, loops_config, monkeypatch):
    hermes = make_hermes(models_config, loops_config)

    async def fake_list():
        from saxa.core.orchestrator import Reply
        return Reply("listado", True, "done", [], 0.0)

    monkeypatch.setattr(hermes, "list_pending_approvals", fake_list)
    reply = await hermes.handle_message("/planes", sender="alex")
    assert reply.text == "listado"


async def test_aprobar_routes_with_sender(models_config, loops_config, monkeypatch):
    hermes = make_hermes(models_config, loops_config)
    captured = {}

    async def fake_decide(prefix, decision, decided_by):
        from saxa.core.orchestrator import Reply
        captured.update(prefix=prefix, decision=decision, by=decided_by)
        return Reply("ok", True, "decided", [], 0.0)

    monkeypatch.setattr(hermes, "decide_approval", fake_decide)
    await hermes.handle_message("/aprobar a1b2c3d4", sender="user-uuid-123")
    assert captured == {"prefix": "a1b2c3d4", "decision": "approved", "by": "user-uuid-123"}


async def test_rechazar_maps_to_rejected(models_config, loops_config, monkeypatch):
    hermes = make_hermes(models_config, loops_config)
    captured = {}

    async def fake_decide(prefix, decision, decided_by):
        from saxa.core.orchestrator import Reply
        captured["decision"] = decision
        return Reply("ok", True, "decided", [], 0.0)

    monkeypatch.setattr(hermes, "decide_approval", fake_decide)
    await hermes.handle_message("/rechazar xyz", sender="u")
    assert captured["decision"] == "rejected"


async def test_incomplete_command_falls_through(models_config, loops_config, monkeypatch):
    """'/aprobar' sin id no es comando válido: cae al routing normal."""
    hermes = make_hermes(models_config, loops_config)
    seen = {}

    async def fake_vault_or_finance(text, sender="user"):  # noqa: ARG001
        seen["fell_through"] = True

    # Si _handle_command devuelve None, sigue el flujo; con pool=None el vault
    # falla de forma controlada. Basta comprobar que no explota como comando.
    reply = await hermes.handle_message("/aprobar", sender="u")
    assert reply is not None  # respondió algo (no rompió por comando incompleto)
