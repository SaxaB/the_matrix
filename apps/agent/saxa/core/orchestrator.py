"""Hermes — orquestador de saxa (diseño §5).

Flujo por mensaje: clasificar intención (cheap-first) → dominio → research
pipeline (bundle determinista) → síntesis (router de modelos) → gates →
respuesta. El modelo es una subrutina del loop, no el loop (§5quater).

Autonomía: L2 máximo (recomienda, nunca ejecuta; §8). Nada de órdenes.
"""

from __future__ import annotations

import asyncio
import json
import os
from dataclasses import dataclass
from typing import Any

from ..domains.finance import intent as finance_intent
from ..domains.finance.pipeline import build_bundle
from ..gates import source_gate
from ..gates.telegram_md_lint import lint as md_lint
from .budget import BudgetTracker
from .config import Settings
from .llm import LlmClient
from .loop import LoopLimits, LoopState, StopReason, run_loop
from .router import ModelRouter

SYNTHESIS_SYSTEM = """Eres saxa, el agente de finanzas de un grupo pequeño de inversores.
Recibes un bundle JSON con datos recopilados por un pipeline determinista
(cartera real, cotizaciones, noticias, técnico). Redactas la respuesta en
español, formato Telegram HTML (etiquetas <b>, <i>, <code>; sin Markdown).

Reglas duras (no negociables):
- Solo recomiendas; NUNCA ejecutas ni prometes ejecutar órdenes (autonomía L2).
- Cada cifra sale del bundle. Si una fuente aparece como "omitted", la declaras
  como omitida con su motivo; jamás inventas su contenido.
- Si el bundle trae step0_portfolio, enmarca la respuesta contra las posiciones
  reales (pesos, riesgo), no genéricamente.
- Briefings completos terminan con un bloque "Fuentes consultadas / omitidas".
- No des valoraciones DCF/fair value salvo que el bundle traiga una tool de
  valoración ejecutada y citada.
- Sé conciso: esto se lee en el móvil."""


@dataclass(frozen=True)
class Reply:
    text: str
    ok: bool
    stop_reason: str
    gate_failures: list[str]
    cost_usd: float


class Hermes:
    def __init__(
        self,
        settings: Settings,
        router: ModelRouter,
        llm: LlmClient,
        budget: BudgetTracker,
        pool,
    ):
        self._settings = settings
        self._router = router
        self._llm = llm
        self._budget = budget
        self._pool = pool
        self._decision_graph = None  # perezoso: langgraph solo si se usa

    # ------------------------- comandos (todos los canales) -------------------------

    async def _handle_command(self, text: str, sender: str) -> "Reply | None":
        """Comandos slash compartidos por Telegram y chat. None si no aplica."""
        parts = text.split()
        cmd = parts[0].split("@")[0].lower()
        if cmd == "/decidir" and len(parts) >= 2:
            ticker = parts[1]
            question = " ".join(parts[2:]) or f"¿Entramos en {ticker.upper()}?"
            return await self.start_decision(ticker, question)
        if cmd == "/planes":
            return await self.list_pending_approvals()
        if cmd == "/tm47":
            return await self.tm47_status()
        if cmd in ("/aprobar", "/rechazar") and len(parts) >= 2:
            decision = "approved" if cmd == "/aprobar" else "rejected"
            return await self.decide_approval(parts[1], decision, sender)
        return None

    # ------------------------- decisión HITL (§9bis.4) -------------------------

    def _get_decision_graph(self):
        if self._decision_graph is None:
            from ..domains.finance.decision import DecisionGraph, build_checkpointer

            self._decision_graph = DecisionGraph(
                self._pool, self._llm, self._router, self._budget,
                checkpointer=build_checkpointer(self._settings.database_url),
            )
        return self._decision_graph

    async def start_decision(self, ticker: str, question: str) -> Reply:
        """/decidir: corre el grafo hasta el approval gate (rojo, §8.2)."""
        import uuid

        thread_id = str(uuid.uuid4())
        try:
            state = await asyncio.to_thread(
                self._get_decision_graph().start, ticker, question, thread_id
            )
        except Exception as e:  # noqa: BLE001 — fallo honesto
            return Reply(f"⚠️ No he podido evaluar {ticker.upper()}: {e}",
                         False, "error", [], 0.0)
        short = (state.get("approval_id") or "")[:8]
        text = (
            f"{state.get('synthesis', '(sin síntesis)')}\n\n"
            f"🔴 Aprobación pendiente <code>{short}</code> — responde "
            f"/aprobar {short} o /rechazar {short}"
        )
        return Reply(text, True, "awaiting_approval", [], 0.0)

    async def decide_approval(self, approval_prefix: str, decision: str,
                              decided_by: str) -> Reply:
        """/aprobar | /rechazar: despacha por action_kind (multi-dominio §14.3).

        - trade_plan_publish → resume del grafo de decisión (finanzas)
        - tm47_submit        → envío del 90-day report (travel) tras aprobar
        """
        row = await asyncio.to_thread(self._find_pending_approval, approval_prefix)
        if row is None:
            return Reply(
                f"No hay aprobación pendiente que empiece por <code>{approval_prefix}</code>.",
                False, "not_found", [], 0.0,
            )
        approval_id, payload = row
        action_kind = payload.get("action_kind") or (
            "trade_plan_publish" if "thread_id" in payload else "unknown"
        )

        if action_kind == "tm47_submit":
            return await self._decide_tm47(approval_id, payload, decision, decided_by)
        return await self._decide_trade_plan(approval_id, payload, decision, decided_by)

    async def _decide_trade_plan(self, approval_id, payload, decision, decided_by) -> Reply:
        thread_id = payload.get("thread_id")
        try:
            state = await asyncio.to_thread(
                self._get_decision_graph().resume, thread_id, decision, decided_by
            )
        except Exception as e:  # noqa: BLE001
            return Reply(
                f"⚠️ No he podido aplicar la decisión sobre <code>{approval_id[:8]}</code>: {e}.",
                False, "error", [], 0.0,
            )
        verbo = "aprobado y publicado" if decision == "approved" else "rechazado"
        return Reply(
            f"Plan de <b>{payload.get('ticker')}</b> {verbo} "
            f"(estado final: {state.get('final_status')}).",
            True, "decided", [], 0.0,
        )

    async def _decide_tm47(self, approval_id, payload, decision, decided_by) -> Reply:
        await asyncio.to_thread(self._close_approval, approval_id, decision, decided_by)
        if decision != "approved":
            await asyncio.to_thread(
                self._set_report_status, payload.get("report_id"), "cancelled"
            )
            return Reply("90-day report <b>rechazado</b>; no se ha enviado nada.",
                         True, "decided", [], 0.0)
        # Aprobado: enviar de verdad (browser en el EQR6)
        from ..domains.travel.browser import Tm47Browser
        from ..domains.travel.service import submit_report

        email = os.environ.get("TM47_PORTAL_EMAIL", "")
        password = os.environ.get("TM47_PORTAL_PASSWORD", "")
        try:
            result = await submit_report(
                self._pool, payload, lambda: Tm47Browser(), email, password
            )
        except Exception as e:  # noqa: BLE001 — fallo honesto, no se finge envío
            return Reply(
                f"⚠️ Aprobado, pero el envío al portal falló: {e}. "
                f"El report queda pendiente; reintenta cuando el portal esté accesible.",
                False, "error", [], 0.0,
            )
        return Reply(
            f"✅ 90-day report <b>enviado</b> (report {result['report_id'][:8]}). "
            f"Te aviso cuando el portal lo marque aprobado.",
            True, "decided", [], 0.0,
        )

    def _close_approval(self, approval_id: str, decision: str, decided_by: str) -> None:
        with self._pool.connection() as conn:
            conn.execute(
                """
                update agent.approvals
                set decided_at = now(), decision = %s, decided_by = %s
                where id = %s
                """,
                (decision, decided_by, approval_id),
            )

    def _set_report_status(self, report_id: str | None, status: str) -> None:
        if not report_id:
            return
        with self._pool.connection() as conn:
            conn.execute(
                "update travel.tm47_reports set status = %s where id = %s",
                (status, report_id),
            )

    def _find_pending_approval(self, prefix: str):
        with self._pool.connection() as conn:
            row = conn.execute(
                """
                select id::text, payload from agent.approvals
                where decided_at is null and id::text like %s
                order by requested_at desc limit 1
                """,
                (f"{prefix}%",),
            ).fetchone()
        if row is None:
            return None
        payload = row[1] if isinstance(row[1], dict) else json.loads(row[1])
        return row[0], payload

    async def tm47_status(self) -> Reply:
        """/tm47: estado del 90-day report (próximo vencimiento / ventana)."""
        from ..domains.travel.service import check_due

        try:
            result = await asyncio.to_thread(check_due, self._pool)
        except Exception as e:  # noqa: BLE001
            return Reply(f"⚠️ No pude consultar el TM47: {e}", False, "error", [], 0.0)
        if not result.get("known"):
            return Reply(
                "Aún no hay datos del TM47 (sube tu perfil y la última entrada/aprobado).",
                True, "done", [], 0.0,
            )
        return Reply(result["summary"], True, "done", [], 0.0)

    async def list_pending_approvals(self) -> Reply:
        def _query():
            with self._pool.connection() as conn:
                return conn.execute(
                    """
                    select id::text, payload->>'ticker', requested_at::date::text
                    from agent.approvals where decided_at is null
                    order by requested_at desc limit 10
                    """
                ).fetchall()

        rows = await asyncio.to_thread(_query)
        if not rows:
            return Reply("Sin aprobaciones pendientes.", True, "done", [], 0.0)
        lines = [
            f"• <code>{r[0][:8]}</code> {r[1]} ({r[2]})" for r in rows
        ]
        return Reply(
            "<b>Aprobaciones pendientes</b> (rojo, §8.2):\n" + "\n".join(lines),
            True, "done", [], 0.0,
        )

    async def handle_message(self, text: str, sender: str = "user") -> Reply:
        """Punto de entrada de TODOS los canales (Telegram C1, chat C3).

        Orden: comandos slash → routing multi-dominio (§14.4: vault por
        keywords primero, resto a finanzas). Al estar aquí (no en el gateway),
        los comandos y las tarjetas de aprobación funcionan en cualquier canal.
        """
        if text.startswith("/"):
            command_reply = await self._handle_command(text, sender)
            if command_reply is not None:
                return command_reply

        from ..domains.vault.handler import handle_vault_query, is_vault_question

        if is_vault_question(text):
            try:
                reply_text = await asyncio.to_thread(
                    handle_vault_query, self._pool, self._llm, self._router,
                    self._budget, text,
                )
                return Reply(reply_text, True, "done", [], 0.0)
            except Exception as e:  # noqa: BLE001 — fallo honesto
                return Reply(f"⚠️ Vault no disponible: {e}", False, "error", [], 0.0)

        intent = await asyncio.to_thread(
            finance_intent.detect_intent, text, self._llm, self._router, self._budget
        )
        bundle = await build_bundle(self._pool, intent.type, intent.tickers)

        loop_name = "briefing_diario" if intent.type == "market_briefing" else "consulta_chat"
        task = "briefing_synthesis" if intent.type == "market_briefing" else "chat_reply"
        return await asyncio.to_thread(
            self._synthesize_with_gates, text, bundle, task, loop_name
        )

    async def run_briefing(self) -> Reply:
        """Loop briefing_diario disparado por n8n/manual (sin mensaje de usuario)."""
        bundle = await build_bundle(self._pool, "market_briefing", [])
        return await asyncio.to_thread(
            self._synthesize_with_gates,
            "Briefing diario programado del mercado US.",
            bundle,
            "briefing_synthesis",
            "briefing_diario",
        )

    # ------------------------------------------------------------------
    def _synthesize_with_gates(
        self, question: str, bundle: dict[str, Any], task: str, loop_name: str
    ) -> Reply:
        """Loop síntesis→gates con hard stops del catálogo (§5quater)."""
        limits = LoopLimits.from_config(self._settings.loops_config, loop_name)
        spec = self._router.resolve(task)
        gate_failures: list[str] = []
        total_cost = 0.0

        user_prompt = (
            f"Pregunta/disparador: {question}\n\n"
            f"Bundle de research (JSON):\n{json.dumps(bundle, ensure_ascii=False, default=str)}"
        )

        def step(state: LoopState) -> bool:
            nonlocal total_cost
            self._budget.check_task(spec.task, spec.cost_budget_usd)
            prompt = user_prompt
            if gate_failures:
                prompt += (
                    "\n\nTu borrador anterior fue bloqueado por un gate. Corrige "
                    "exactamente esto y reescribe completo:\n- " + "\n- ".join(gate_failures[-2:])
                )
            result = self._llm.complete(spec, SYNTHESIS_SYSTEM, prompt)
            state.tool_calls += 1
            total_cost += result.cost_usd
            self._budget.record(spec.task, result.model, result.cost_usd,
                                result.input_tokens, result.output_tokens)

            draft = result.text.strip()
            state.fingerprint = draft[:120]

            verdict = source_gate.evaluate(draft)
            if not verdict.get("ok", False) and verdict.get("gated", False):
                gate_failures.append(verdict["message"])
                return False

            state.result = draft
            return True

        outcome = run_loop(step, limits)
        if outcome.stop_reason is StopReason.DONE:
            return Reply(outcome.state.result, True, outcome.stop_reason.value,
                         gate_failures, total_cost)

        # Fallback honesto: no salió nada publicable; se dice, no se inventa
        reason = outcome.error or outcome.stop_reason.value
        detail = f" Último gate: {gate_failures[-1]}" if gate_failures else ""
        return Reply(
            f"⚠️ No he podido generar una respuesta publicable ({reason}).{detail}",
            False,
            outcome.stop_reason.value,
            gate_failures,
            total_cost,
        )


def check_markdown_v2(text: str) -> list[str]:
    """Expone el lint para payloads MarkdownV2 (el gateway envía HTML por defecto)."""
    return [f"L{i.line}C{i.col} {i.reason}" for i in md_lint(text)]
