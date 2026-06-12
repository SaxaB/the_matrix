import pytest

from saxa.core.router import ModelRouter, UnknownTaskError


def test_resolves_declared_tasks(models_config):
    router = ModelRouter(models_config)
    spec = router.resolve("classify_intent")
    assert spec.provider == "anthropic"
    assert "haiku" in spec.model
    assert spec.max_tokens == 256
    assert spec.temperature == 0.0


def test_briefing_uses_strong_model_with_fallback(models_config):
    router = ModelRouter(models_config)
    spec = router.resolve("briefing_synthesis")
    assert "sonnet" in spec.model
    assert spec.fallback is not None
    assert "haiku" in spec.fallback.model
    # El fallback hereda config de la tarea, no encadena más fallbacks
    assert spec.fallback.fallback is None


def test_unknown_task_is_contract_violation(models_config):
    router = ModelRouter(models_config)
    with pytest.raises(UnknownTaskError):
        router.resolve("tarea_inventada")


def test_cost_estimate(models_config):
    spec = ModelRouter(models_config).resolve("classify_intent")
    # haiku: 1 USD in / 5 USD out por MTok
    cost = spec.estimate_cost_usd(1_000_000, 1_000_000)
    assert cost == pytest.approx(6.0)
