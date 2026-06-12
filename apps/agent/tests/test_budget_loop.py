import pytest

from saxa.core.budget import BudgetExceededError, BudgetTracker
from saxa.core.loop import LoopLimits, StopReason, run_loop


def test_task_budget_blocks():
    tracker = BudgetTracker(daily_budget_usd=10.0)
    tracker.record("briefing", "sonnet", 0.5)
    with pytest.raises(BudgetExceededError):
        tracker.check_task("briefing", task_budget_usd=0.5)
    # Otra tarea sigue pudiendo gastar
    tracker.check_task("classify", task_budget_usd=0.05)


def test_daily_cap_blocks_everything():
    tracker = BudgetTracker(daily_budget_usd=1.0)
    tracker.record("a", "m", 0.6)
    tracker.record("b", "m", 0.5)
    with pytest.raises(BudgetExceededError) as e:
        tracker.check_task("c", task_budget_usd=99.0)
    assert "tope diario" in str(e.value)


def test_loop_done():
    outcome = run_loop(lambda s: True, LoopLimits())
    assert outcome.stop_reason is StopReason.DONE
    assert outcome.state.iteration == 1


def test_loop_max_iterations():
    def never_done(state):
        state.fingerprint = f"iter{state.iteration}"  # progresa, pero no acaba
        return False

    outcome = run_loop(never_done, LoopLimits(max_iterations=3, no_progress_limit=99))
    assert outcome.stop_reason is StopReason.MAX_ITERATIONS
    assert outcome.state.iteration == 3


def test_loop_no_progress():
    outcome = run_loop(lambda s: False, LoopLimits(max_iterations=10, no_progress_limit=2))
    assert outcome.stop_reason is StopReason.NO_PROGRESS


def test_loop_budget_stop():
    def step(state):
        raise BudgetExceededError("tarea x", 1.0, 0.5)

    outcome = run_loop(step, LoopLimits())
    assert outcome.stop_reason is StopReason.BUDGET
    assert "Presupuesto" in (outcome.error or "")


def test_limits_from_config(loops_config):
    limits = LoopLimits.from_config(loops_config, "briefing_diario")
    assert limits.max_iterations == 3
    assert limits.wall_clock_timeout_s == 600
    # Hereda defaults no sobreescritos
    assert limits.no_progress_limit == 2
