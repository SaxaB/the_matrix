"""Observabilidad (diseño §8): atribución de coste y trazas por tarea.

`ObservedLlmClient` envuelve cualquier LlmClient y, además del registro local
(agent.llm_spend vía BudgetTracker, que no cambia), emite *generations* a
Langfuse si el SDK está instalado (`pip install saxa[observability]`) y hay
credenciales en el entorno (LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY,
LANGFUSE_HOST). Sin credenciales: no-op silencioso, cero dependencias.

El host puede ser Langfuse self-hosted en el EQR6 (fase 2 del despliegue;
retención corta en ClickHouse) o el cloud de Langfuse si se prefiere.
"""

from __future__ import annotations

import logging
import os

from .llm import LlmClient, LlmResult
from .router import ModelSpec

log = logging.getLogger("saxa.observability")


def _maybe_langfuse():
    if not (os.environ.get("LANGFUSE_PUBLIC_KEY") and os.environ.get("LANGFUSE_SECRET_KEY")):
        return None
    try:
        from langfuse import Langfuse

        return Langfuse()  # lee LANGFUSE_* del entorno
    except ImportError:
        log.warning(
            "LANGFUSE_* configuradas pero el SDK no está instalado: "
            "pip install 'saxa[observability]'"
        )
        return None
    except Exception as e:  # noqa: BLE001
        log.warning("Langfuse no inicializado (%s); trazas desactivadas", e)
        return None


class ObservedLlmClient:
    """Mismo contrato que LlmClient; añade trazas sin tocar a los llamantes."""

    def __init__(self, inner: LlmClient):
        self._inner = inner
        self._langfuse = _maybe_langfuse()
        if self._langfuse:
            log.info("observabilidad Langfuse activa (%s)",
                     os.environ.get("LANGFUSE_HOST", "cloud"))

    def complete(self, spec: ModelSpec, system: str, user: str) -> LlmResult:
        result = self._inner.complete(spec, system, user)
        if self._langfuse is not None:
            try:
                self._langfuse.create_generation(
                    name=spec.task,
                    model=result.model,
                    input={"system": system[:2000], "user": user[:4000]},
                    output=result.text[:4000],
                    usage_details={
                        "input": result.input_tokens,
                        "output": result.output_tokens,
                    },
                    cost_details={"total": result.cost_usd},
                    metadata={"provider": spec.provider, "task": spec.task},
                )
            except Exception as e:  # noqa: BLE001 — la traza nunca rompe el flujo
                log.debug("traza Langfuse fallida: %s", e)
        return result
