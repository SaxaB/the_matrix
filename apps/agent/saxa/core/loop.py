"""Runner de loops (diseño §5quater): la unidad de trabajo es el loop, no el prompt.

Hard stops obligatorios en cada vuelta:
  - max_iterations / max_tool_calls
  - wall_clock_timeout_s
  - no_progress_limit (N vueltas sin cambio de estado -> parar y avisar)
  - presupuesto (lo aplica BudgetTracker antes de cada llamada a modelo)
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable

from .budget import BudgetExceededError


class StopReason(str, Enum):
    DONE = "done"
    MAX_ITERATIONS = "max_iterations"
    MAX_TOOL_CALLS = "max_tool_calls"
    TIMEOUT = "wall_clock_timeout"
    NO_PROGRESS = "no_progress"
    BUDGET = "budget_exceeded"
    ERROR = "error"


@dataclass
class LoopLimits:
    max_iterations: int = 5
    max_tool_calls: int = 20
    wall_clock_timeout_s: float = 300.0
    no_progress_limit: int = 2

    @classmethod
    def from_config(cls, loops_config: dict[str, Any], loop_name: str) -> "LoopLimits":
        defaults = loops_config.get("defaults", {})
        loop_cfg = loops_config.get("loops", {}).get(loop_name, {})
        merged = {**defaults, **loop_cfg}
        return cls(
            max_iterations=int(merged.get("max_iterations", 5)),
            max_tool_calls=int(merged.get("max_tool_calls", 20)),
            wall_clock_timeout_s=float(merged.get("wall_clock_timeout_s", 300)),
            no_progress_limit=int(merged.get("no_progress_limit", 2)),
        )


@dataclass
class LoopState:
    """Estado observable de una ejecución; `fingerprint` detecta no-progreso."""

    iteration: int = 0
    tool_calls: int = 0
    fingerprint: str = ""
    result: Any = None
    extras: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class LoopOutcome:
    stop_reason: StopReason
    state: LoopState
    error: str | None = None


def run_loop(
    step: Callable[[LoopState], bool],
    limits: LoopLimits,
    *,
    clock: Callable[[], float] = time.monotonic,
) -> LoopOutcome:
    """Ejecuta `step` hasta hard stop. `step` devuelve True cuando terminó.

    `step` muta el LoopState (incrementa tool_calls, actualiza fingerprint
    y deja `result`). El runner aplica los hard stops; el step aplica gates.
    """
    state = LoopState()
    started = clock()
    stale_rounds = 0
    last_fingerprint = state.fingerprint

    while True:
        if state.iteration >= limits.max_iterations:
            return LoopOutcome(StopReason.MAX_ITERATIONS, state)
        if state.tool_calls >= limits.max_tool_calls:
            return LoopOutcome(StopReason.MAX_TOOL_CALLS, state)
        if clock() - started >= limits.wall_clock_timeout_s:
            return LoopOutcome(StopReason.TIMEOUT, state)

        state.iteration += 1
        try:
            done = step(state)
        except BudgetExceededError as e:
            return LoopOutcome(StopReason.BUDGET, state, error=str(e))
        except Exception as e:  # noqa: BLE001 — el loop reporta, no oculta
            return LoopOutcome(StopReason.ERROR, state, error=str(e))

        if done:
            return LoopOutcome(StopReason.DONE, state)

        if state.fingerprint == last_fingerprint:
            stale_rounds += 1
            if stale_rounds >= limits.no_progress_limit:
                return LoopOutcome(StopReason.NO_PROGRESS, state)
        else:
            stale_rounds = 0
            last_fingerprint = state.fingerprint
