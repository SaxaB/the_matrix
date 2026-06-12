"""Router de modelos (diseño §5ter.1): resuelve tarea -> modelo concreto.

La política vive en infra/models.yaml; este módulo solo la interpreta.
Cheap-first: cada tarea declara su modelo; el código nunca elige "a dedo".
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


class UnknownTaskError(KeyError):
    """La tarea no está declarada en models.yaml (las tareas son contrato)."""


@dataclass(frozen=True)
class ModelSpec:
    task: str
    provider: str
    model: str
    max_tokens: int
    temperature: float
    cost_budget_usd: float
    cost_input_per_mtok: float
    cost_output_per_mtok: float
    fallback: "ModelSpec | None" = None

    def estimate_cost_usd(self, input_tokens: int, output_tokens: int) -> float:
        return (
            input_tokens * self.cost_input_per_mtok
            + output_tokens * self.cost_output_per_mtok
        ) / 1_000_000


class ModelRouter:
    def __init__(self, models_config: dict[str, Any]):
        self._defaults: dict[str, Any] = models_config.get("defaults", {})
        self._models: dict[str, Any] = models_config.get("models", {})
        self._tasks: dict[str, Any] = models_config.get("tasks", {})

    def resolve(self, task: str) -> ModelSpec:
        if task not in self._tasks:
            raise UnknownTaskError(
                f"Tarea '{task}' no declarada en infra/models.yaml; "
                f"declara su fila (cheap-first) antes de usarla."
            )
        return self._build(task, self._tasks[task], allow_fallback=True)

    def _build(self, task: str, task_cfg: dict[str, Any], allow_fallback: bool) -> ModelSpec:
        model_key = task_cfg.get("model")
        if model_key not in self._models:
            raise UnknownTaskError(
                f"Tarea '{task}' referencia el modelo '{model_key}', "
                f"que no existe en models.yaml#models."
            )
        model_cfg = self._models[model_key]

        fallback_spec = None
        fallback_key = task_cfg.get("fallback")
        if allow_fallback and fallback_key:
            # El fallback hereda la config de la tarea, cambiando solo el modelo
            fallback_cfg = dict(task_cfg, model=fallback_key)
            fallback_cfg.pop("fallback", None)
            fallback_spec = self._build(task, fallback_cfg, allow_fallback=False)

        return ModelSpec(
            task=task,
            provider=model_cfg.get("provider", self._defaults.get("provider", "anthropic")),
            model=model_cfg["model"],
            max_tokens=int(task_cfg.get("max_tokens", self._defaults.get("max_tokens", 1024))),
            temperature=float(
                task_cfg.get("temperature", self._defaults.get("temperature", 0.3))
            ),
            cost_budget_usd=float(
                task_cfg.get("cost_budget_usd", self._defaults.get("cost_budget_usd", 0.5))
            ),
            cost_input_per_mtok=float(model_cfg.get("cost_input_per_mtok", 0.0)),
            cost_output_per_mtok=float(model_cfg.get("cost_output_per_mtok", 0.0)),
            fallback=fallback_spec,
        )
