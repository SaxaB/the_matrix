"""Interfaz única de proveedores de modelo.

El resto del código habla con `LlmClient.complete(spec, ...)`; añadir un
proveedor (OpenAI, Ollama...) es implementar `Provider` y registrarlo, sin
tocar pipelines ni orquestador (diseño §5ter).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from .router import ModelSpec


@dataclass(frozen=True)
class LlmResult:
    text: str
    input_tokens: int
    output_tokens: int
    model: str
    cost_usd: float


class Provider(Protocol):
    def complete(
        self, spec: ModelSpec, system: str, user: str
    ) -> LlmResult: ...


class AnthropicProvider:
    """Proveedor Anthropic (API por token, diseño §5bis)."""

    def __init__(self, api_key: str):
        # Import perezoso: los tests no necesitan el SDK instalado/configurado
        from anthropic import Anthropic

        self._client = Anthropic(api_key=api_key)

    def complete(self, spec: ModelSpec, system: str, user: str) -> LlmResult:
        response = self._client.messages.create(
            model=spec.model,
            max_tokens=spec.max_tokens,
            temperature=spec.temperature,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        text = "".join(
            block.text for block in response.content if getattr(block, "type", "") == "text"
        )
        usage = response.usage
        cost = spec.estimate_cost_usd(usage.input_tokens, usage.output_tokens)
        return LlmResult(
            text=text,
            input_tokens=usage.input_tokens,
            output_tokens=usage.output_tokens,
            model=spec.model,
            cost_usd=cost,
        )


class LlmClient:
    """Fachada: enruta al proveedor del spec y aplica fallback declarado."""

    def __init__(self, providers: dict[str, Provider]):
        self._providers = providers

    def complete(self, spec: ModelSpec, system: str, user: str) -> LlmResult:
        try:
            return self._provider_for(spec).complete(spec, system, user)
        except Exception:
            if spec.fallback is None:
                raise
            return self._provider_for(spec.fallback).complete(spec.fallback, system, user)

    def _provider_for(self, spec: ModelSpec) -> Provider:
        if spec.provider not in self._providers:
            raise RuntimeError(
                f"Proveedor '{spec.provider}' no configurado (¿falta API key en .env?)"
            )
        return self._providers[spec.provider]


def build_default_client(anthropic_api_key: str) -> LlmClient:
    providers: dict[str, Provider] = {}
    if anthropic_api_key:
        providers["anthropic"] = AnthropicProvider(anthropic_api_key)
    return LlmClient(providers)
