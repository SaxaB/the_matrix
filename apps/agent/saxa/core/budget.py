"""Presupuesto de coste (diseño §5ter.2).

- Tope por ejecución de tarea (`cost_budget_usd` del ModelSpec).
- Tope diario agregado (`daily_budget_usd` de models.yaml).
- El gasto se persiste en `agent.llm_spend` (migración 0004) para sobrevivir
  reinicios y dar atribución por tarea.

Si no hay conexión a Postgres (tests, dry-run) funciona en memoria.
"""

from __future__ import annotations

from datetime import date


class BudgetExceededError(RuntimeError):
    def __init__(self, scope: str, spent: float, limit: float):
        self.scope = scope
        self.spent = spent
        self.limit = limit
        super().__init__(
            f"Presupuesto agotado ({scope}): {spent:.4f} USD >= {limit:.4f} USD. "
            f"El agente se pausa; revisa el gasto antes de subir el tope."
        )


class BudgetTracker:
    def __init__(self, daily_budget_usd: float, store: "SpendStore | None" = None):
        self.daily_budget_usd = daily_budget_usd
        self._store = store or InMemorySpendStore()

    def check_task(self, task: str, task_budget_usd: float) -> None:
        """Lanza si la tarea ya agotó su presupuesto de hoy o el tope diario."""
        today = date.today()
        task_spent = self._store.spent_for_task(task, today)
        if task_spent >= task_budget_usd:
            raise BudgetExceededError(f"tarea {task}", task_spent, task_budget_usd)
        total = self._store.spent_total(today)
        if total >= self.daily_budget_usd:
            raise BudgetExceededError("tope diario", total, self.daily_budget_usd)

    def record(self, task: str, model: str, cost_usd: float,
               input_tokens: int = 0, output_tokens: int = 0) -> None:
        self._store.record(date.today(), task, model, cost_usd, input_tokens, output_tokens)

    def spent_today(self) -> float:
        return self._store.spent_total(date.today())


class SpendStore:
    """Contrato de persistencia del gasto."""

    def record(self, day: date, task: str, model: str, cost_usd: float,
               input_tokens: int, output_tokens: int) -> None:
        raise NotImplementedError

    def spent_for_task(self, task: str, day: date) -> float:
        raise NotImplementedError

    def spent_total(self, day: date) -> float:
        raise NotImplementedError


class InMemorySpendStore(SpendStore):
    def __init__(self) -> None:
        self._rows: list[tuple[date, str, float]] = []

    def record(self, day: date, task: str, model: str, cost_usd: float,
               input_tokens: int, output_tokens: int) -> None:
        self._rows.append((day, task, cost_usd))

    def spent_for_task(self, task: str, day: date) -> float:
        return sum(c for d, t, c in self._rows if d == day and t == task)

    def spent_total(self, day: date) -> float:
        return sum(c for d, _, c in self._rows if d == day)


class PostgresSpendStore(SpendStore):
    """Persistencia real en agent.llm_spend (una fila por llamada)."""

    def __init__(self, pool) -> None:  # psycopg_pool.ConnectionPool
        self._pool = pool

    def record(self, day: date, task: str, model: str, cost_usd: float,
               input_tokens: int, output_tokens: int) -> None:
        with self._pool.connection() as conn:
            conn.execute(
                """
                insert into agent.llm_spend
                  (day, task, model, cost_usd, input_tokens, output_tokens)
                values (%s, %s, %s, %s, %s, %s)
                """,
                (day, task, model, cost_usd, input_tokens, output_tokens),
            )

    def spent_for_task(self, task: str, day: date) -> float:
        with self._pool.connection() as conn:
            row = conn.execute(
                "select coalesce(sum(cost_usd), 0) from agent.llm_spend"
                " where day = %s and task = %s",
                (day, task),
            ).fetchone()
        return float(row[0])

    def spent_total(self, day: date) -> float:
        with self._pool.connection() as conn:
            row = conn.execute(
                "select coalesce(sum(cost_usd), 0) from agent.llm_spend where day = %s",
                (day,),
            ).fetchone()
        return float(row[0])
