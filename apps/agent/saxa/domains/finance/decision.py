"""Grafo de decisión de inversión garantizado (diseño §9bis.4, LangGraph).

    market_data -> historical_context -> risk_sizing -> tax_impact
        -> synthesis -> human_approval (INTERRUPT, rojo §8.2)

- Orden garantizado por el grafo, no por el modelo.
- `human_approval` interrumpe SIEMPRE: el plan queda en `agent.approvals` y
  nada se publica hasta decisión humana explícita (resume_decision).
- Checkpointer persiste el estado entre interrupt y resume.
"""

from __future__ import annotations

import json
import logging
from typing import Any, TypedDict

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, StateGraph

log = logging.getLogger("saxa.decision")


def build_checkpointer(database_url: str | None):
    """Checkpointer Postgres si hay BD (sobrevive reinicios entre /decidir y
    /aprobar); fallback a memoria para tests/dry-run. Las tablas de langgraph
    viven en el schema `agent` (search_path)."""
    if not database_url:
        return InMemorySaver()
    try:
        from psycopg import Connection
        from langgraph.checkpoint.postgres import PostgresSaver

        conn = Connection.connect(
            database_url,
            autocommit=True,
            prepare_threshold=0,
            options="-c search_path=agent,public",
        )
        saver = PostgresSaver(conn)
        saver.setup()
        return saver
    except Exception as e:  # noqa: BLE001 — degradación declarada, no silenciosa
        log.warning("checkpointer Postgres no disponible (%s); usando memoria", e)
        return InMemorySaver()

from ...core.budget import BudgetTracker
from ...core.llm import LlmClient
from ...core.router import ModelRouter
from ...tools.technical import technical_snapshot
from .portfolio import portfolio_report
from .radar import TickerInputs, load_radar_rules, preliminary_plan, score_ticker
from .risk import TradePlan, persist_trade_plan, risk_gate

DECISION_SYSTEM = """Eres saxa redactando una RECOMENDACIÓN de inversión (autonomía L2:
recomiendas, jamás ejecutas). Recibes datos de mercado, contexto, un trade plan
ya validado por risk_gate y el impacto fiscal estimado. Redacta en español,
formato Telegram HTML, conciso:
1. Tesis en 2-3 frases ancladas a los datos recibidos.
2. El plan: entradas, stop, take profit, tamaño, R (cita las cifras EXACTAS del plan).
3. Riesgos principales y qué lo invalidaría.
4. Cierra SIEMPRE con: "Pendiente de aprobación humana — nada se ejecuta solo."
Si una sección de datos viene omitida, decláralo; no la inventes."""


class DecisionState(TypedDict, total=False):
    ticker: str
    question: str
    market_data: dict[str, Any]
    historical_context: dict[str, Any]
    trade_plan: dict[str, Any]
    gate_result: dict[str, Any]
    trade_plan_id: str | None
    tax_impact: dict[str, Any]
    synthesis: str
    approval_id: str | None
    decision: str | None          # approved | rejected (lo fija el humano)
    final_status: str


class DecisionGraph:
    """Construye el grafo con sus dependencias inyectadas (testable sin red)."""

    def __init__(
        self,
        pool,
        llm: LlmClient,
        router: ModelRouter,
        budget: BudgetTracker,
        checkpointer=None,
    ):
        self._pool = pool
        self._llm = llm
        self._router = router
        self._budget = budget
        self.graph = self._build(checkpointer or InMemorySaver())

    # ------------------------------- nodos -------------------------------

    def _market_data(self, state: DecisionState) -> DecisionState:
        ticker = state["ticker"]
        data: dict[str, Any] = {"technical": technical_snapshot(self._pool, ticker)}
        try:
            with self._pool.connection() as conn:
                row = conn.execute(
                    """
                    select market_cap, trailing_pe, sector, finai_risk_score,
                           earnings_next_date, average_volume
                    from market.yahoo_asset_snapshot where ticker = %s
                    """,
                    (ticker,),
                ).fetchone()
            if row:
                data["snapshot"] = {
                    "market_cap": row[0], "trailing_pe": float(row[1]) if row[1] else None,
                    "sector": row[2], "risk_score": row[3],
                    "earnings_next_date": str(row[4]) if row[4] else None,
                    "average_volume": row[5],
                }
            else:
                data["snapshot"] = {"omitted": True, "reason": "ticker sin snapshot en market"}
        except Exception as e:  # noqa: BLE001
            data["snapshot"] = {"omitted": True, "reason": str(e)}
        return {"market_data": data}

    def _historical_context(self, state: DecisionState) -> DecisionState:
        """Recupera la página de conocimiento del ticker (LLM Wiki, §9bis.5)."""
        from .wiki import get_page, ticker_slug

        try:
            page = get_page(self._pool, ticker_slug(state["ticker"]))
        except Exception as e:  # noqa: BLE001 — omisión declarada, no inventada
            return {"historical_context": {"omitted": True, "reason": f"wiki inaccesible: {e}"}}
        if page is None:
            return {
                "historical_context": {
                    "omitted": True,
                    "reason": f"sin página de conocimiento para {state['ticker']} todavía",
                }
            }
        return {
            "historical_context": {
                "slug": page.slug,
                "title": page.title,
                "content_md": page.content_md,
                "confidence": page.confidence,
                "drivers": page.drivers,
                "open_questions": page.open_questions,
                "version": page.version,
            }
        }

    def _risk_sizing(self, state: DecisionState) -> DecisionState:
        ticker = state["ticker"]
        tech = state["market_data"].get("technical", {})
        snapshot = state["market_data"].get("snapshot", {})
        if tech.get("omitted"):
            raise RuntimeError(f"sin velas EOD para {ticker}: no se puede dimensionar")

        with self._pool.connection() as conn:
            rows = conn.execute(
                """
                select close, low from market.yahoo_eod_bars
                where ticker = %s order by trade_date desc limit 260
                """,
                (ticker,),
            ).fetchall()
        rows.reverse()
        closes = [float(r[0]) for r in rows]
        lows = [float(r[1]) for r in rows if r[1] is not None]

        rules = load_radar_rules()
        inputs = TickerInputs(
            ticker=ticker, closes=closes, lows=lows,
            risk_score=snapshot.get("risk_score"),
        )
        scored = score_ticker(inputs, rules)
        plan = preliminary_plan(inputs, scored, rules)

        try:
            portfolio = portfolio_report(self._pool)
        except Exception:  # noqa: BLE001
            portfolio = None
        verdict = risk_gate(plan, portfolio=portfolio)
        plan_id = persist_trade_plan(self._pool, plan, verdict)
        return {
            "trade_plan": json.loads(plan.model_dump_json()),
            "gate_result": verdict,
            "trade_plan_id": plan_id,
        }

    def _tax_impact(self, state: DecisionState) -> DecisionState:
        # Estimación informativa (España): plusvalías al 19-28%; FIFO por lotes.
        # El detalle por lotes llegará de portfolio_operations cuando haya histórico.
        try:
            with self._pool.connection() as conn:
                row = conn.execute(
                    """
                    select count(*), min(executed_at) from finance.portfolio_operations
                    where ticker = %s and kind = 'buy'
                    """,
                    (state["ticker"],),
                ).fetchone()
            ops, first_buy = (row or (0, None))
        except Exception:  # noqa: BLE001
            ops, first_buy = 0, None
        return {
            "tax_impact": {
                "note": (
                    "Compra nueva: sin evento fiscal hasta la venta. España: plusvalías "
                    "19-28% por tramos; método FIFO por lotes."
                ),
                "existing_buy_ops": ops,
                "first_buy_at": str(first_buy) if first_buy else None,
            }
        }

    def _synthesis(self, state: DecisionState) -> DecisionState:
        spec = self._router.resolve("decision_node")
        self._budget.check_task(spec.task, spec.cost_budget_usd)
        payload = {
            "question": state.get("question", ""),
            "ticker": state["ticker"],
            "market_data": state["market_data"],
            "historical_context": state["historical_context"],
            "trade_plan": state["trade_plan"],
            "gate_result": state["gate_result"],
            "tax_impact": state["tax_impact"],
        }
        result = self._llm.complete(
            spec, DECISION_SYSTEM, json.dumps(payload, ensure_ascii=False, default=str)
        )
        self._budget.record(spec.task, result.model, result.cost_usd,
                            result.input_tokens, result.output_tokens)
        return {"synthesis": result.text.strip()}

    def _human_approval(self, state: DecisionState) -> DecisionState:
        # Este nodo solo corre TRAS el resume con decisión humana ya fijada
        decision = state.get("decision")
        plan_id = state.get("trade_plan_id")
        if decision not in ("approved", "rejected"):
            raise RuntimeError("human_approval sin decisión: el grafo debe interrumpir antes")
        new_status = "published" if decision == "approved" else "rejected"
        if plan_id is not None and self._pool is not None:
            with self._pool.connection() as conn:
                conn.execute(
                    "update finance.trade_plans set status = %s where id = %s",
                    (new_status, plan_id),
                )
        return {"final_status": new_status}

    # ----------------------------------------------------------------------

    def _build(self, checkpointer):
        g = StateGraph(DecisionState)
        g.add_node("market_data", self._market_data)
        g.add_node("historical_context", self._historical_context)
        g.add_node("risk_sizing", self._risk_sizing)
        g.add_node("tax_impact", self._tax_impact)
        g.add_node("synthesis", self._synthesis)
        g.add_node("human_approval", self._human_approval)
        g.set_entry_point("market_data")
        g.add_edge("market_data", "historical_context")
        g.add_edge("historical_context", "risk_sizing")
        g.add_edge("risk_sizing", "tax_impact")
        g.add_edge("tax_impact", "synthesis")
        g.add_edge("synthesis", "human_approval")
        g.add_edge("human_approval", END)
        return g.compile(checkpointer=checkpointer, interrupt_before=["human_approval"])

    # ------------------------------ API ----------------------------------

    def start(self, ticker: str, question: str, thread_id: str) -> DecisionState:
        """Corre hasta el interrupt y registra la aprobación pendiente (roja)."""
        config = {"configurable": {"thread_id": thread_id}}
        state = self.graph.invoke(
            {"ticker": ticker.upper(), "question": question}, config
        )
        approval_id = None
        if self._pool is not None:
            with self._pool.connection() as conn:
                row = conn.execute(
                    """
                    insert into agent.approvals (domain, action_kind, severity, payload)
                    values ('finance', 'trade_plan_publish', 'red', %s)
                    returning id
                    """,
                    (json.dumps({
                        "thread_id": thread_id,
                        "ticker": ticker.upper(),
                        "trade_plan_id": state.get("trade_plan_id"),
                        "synthesis": state.get("synthesis"),
                    }, default=str),),
                ).fetchone()
            approval_id = str(row[0])
            self.graph.update_state(config, {"approval_id": approval_id})
            state["approval_id"] = approval_id
        return state

    def resume(self, thread_id: str, decision: str, decided_by: str) -> DecisionState:
        """Aplica la decisión humana y completa el grafo."""
        if decision not in ("approved", "rejected"):
            raise ValueError("decision debe ser approved|rejected")
        config = {"configurable": {"thread_id": thread_id}}
        self.graph.update_state(config, {"decision": decision})
        state = self.graph.invoke(None, config)
        if self._pool is not None and state.get("approval_id"):
            with self._pool.connection() as conn:
                conn.execute(
                    """
                    update agent.approvals
                    set decided_at = now(), decision = %s, decided_by = %s
                    where id = %s
                    """,
                    (decision, decided_by, state["approval_id"]),
                )
        return state
