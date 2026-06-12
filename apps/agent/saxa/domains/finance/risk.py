"""risk_engine + risk_gate (diseño §9bis.2): el riesgo como reglas ejecutables.

- `TradePlan`: contrato del plan (pydantic; el JSON de §9bis.2).
- `risk_gate`: valida un plan contra infra/risk-rules.yaml y el estado real de
  la cartera. Si no cumple, NO se publica: vuelve con los motivos (mismo patrón
  que source_gate). Ejecutar es siempre humano (L2, §8.2).
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Literal

import yaml
from pydantic import BaseModel, Field, field_validator

RULES_PATH = Path(__file__).resolve().parents[4].parent / "infra" / "risk-rules.yaml"


def load_rules(path: Path | None = None) -> dict[str, Any]:
    with (path or RULES_PATH).open("r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


class PricePoint(BaseModel):
    px: float = Field(gt=0)
    weight: float = Field(gt=0, le=1)


class TradePlan(BaseModel):
    ticker: str
    side: Literal["long", "short"] = "long"
    thesis_ref: str | None = None
    conviction: float | None = Field(default=None, ge=0, le=1)
    position_pct_target: float = Field(gt=0)
    entries: list[PricePoint]
    stop_loss: float = Field(gt=0)
    take_profits: list[PricePoint]
    r_multiple_target: float | None = None
    max_loss_pct_portfolio: float | None = None
    risk_score: int | None = Field(default=None, ge=0, le=100)

    @field_validator("ticker")
    @classmethod
    def _upper(cls, v: str) -> str:
        return v.strip().upper()

    # ---- derivadas deterministas (el modelo no las "estima": se calculan) ----

    @property
    def avg_entry(self) -> float:
        return sum(p.px * p.weight for p in self.entries)

    @property
    def avg_take_profit(self) -> float:
        return sum(p.px * p.weight for p in self.take_profits)

    @property
    def risk_per_share(self) -> float:
        if self.side == "long":
            return self.avg_entry - self.stop_loss
        return self.stop_loss - self.avg_entry

    @property
    def reward_per_share(self) -> float:
        if self.side == "long":
            return self.avg_take_profit - self.avg_entry
        return self.avg_entry - self.avg_take_profit

    @property
    def computed_r_multiple(self) -> float | None:
        if self.risk_per_share <= 0:
            return None
        return self.reward_per_share / self.risk_per_share


def _position_cap_for_risk(rules: dict[str, Any], risk_score: int | None) -> float:
    cap = float(rules.get("max_position_pct", 100.0))
    if risk_score is None:
        return cap
    for tier in rules.get("position_pct_by_risk", []):
        if risk_score <= int(tier["max_risk_score"]):
            return min(cap, float(tier["max_position_pct"]))
    return cap


def risk_gate(
    plan: TradePlan,
    portfolio: dict[str, Any] | None = None,
    rules: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Valida el plan. Devuelve {"ok", "violations": [...], "computed": {...}}.

    `portfolio` es el report de portfolio_report() (o None si no hay cartera:
    los límites de cartera se omiten y queda registrado).
    """
    rules = rules or load_rules()
    violations: list[str] = []
    tol = float(rules.get("weight_sum_tolerance", 0.001))

    # --- estructura: entradas/salidas escaladas, pesos que suman 1.0 ---
    entry_sum = sum(p.weight for p in plan.entries)
    tp_sum = sum(p.weight for p in plan.take_profits)
    if abs(entry_sum - 1.0) > tol:
        violations.append(f"pesos de entradas suman {entry_sum:.3f}, deben sumar 1.0")
    if abs(tp_sum - 1.0) > tol:
        violations.append(f"pesos de take profits suman {tp_sum:.3f}, deben sumar 1.0")
    if rules.get("require_scaled_entries", True) and len(plan.entries) < 2:
        violations.append("entradas escaladas obligatorias (mínimo 2 tramos)")
    if len(plan.take_profits) < int(rules.get("min_take_profits", 1)):
        violations.append("falta al menos un take profit")

    # --- coherencia del stop ---
    if plan.risk_per_share <= 0:
        side_txt = "por debajo" if plan.side == "long" else "por encima"
        violations.append(
            f"stop loss incoherente: en un {plan.side} debe estar {side_txt} "
            f"de la entrada media ({plan.avg_entry:.2f})"
        )

    # --- R múltiple calculado, no inventado ---
    computed_r = plan.computed_r_multiple
    min_r = float(rules.get("min_r_multiple", 1.5))
    if computed_r is not None:
        if computed_r < min_r:
            violations.append(f"R calculado {computed_r:.2f} < mínimo {min_r}")
        if plan.r_multiple_target is not None:
            if abs(computed_r - plan.r_multiple_target) > float(rules.get("r_tolerance", 0.15)):
                violations.append(
                    f"R declarado {plan.r_multiple_target:.2f} no cuadra con el "
                    f"calculado {computed_r:.2f} (no se aceptan R inventados)"
                )

    # --- sizing por riesgo ---
    cap = _position_cap_for_risk(rules, plan.risk_score)
    if plan.position_pct_target > cap:
        violations.append(
            f"posición {plan.position_pct_target:.1f}% excede el tope {cap:.1f}% "
            f"para risk_score={plan.risk_score}"
        )
    max_loss_cap = float(rules.get("max_loss_pct_portfolio", 1.0))
    if plan.risk_per_share > 0 and plan.avg_entry > 0:
        loss_at_stop_pct = plan.position_pct_target * (plan.risk_per_share / plan.avg_entry)
        if loss_at_stop_pct > max_loss_cap + 1e-9:
            violations.append(
                f"pérdida a SL {loss_at_stop_pct:.2f}% del NAV excede el tope "
                f"{max_loss_cap}% (reduce tamaño o acerca el stop)"
            )
    else:
        loss_at_stop_pct = None

    # --- límites de cartera (si hay snapshot) ---
    portfolio_checks = "applied"
    if portfolio:
        open_positions = int(portfolio.get("open_positions", 0))
        if open_positions >= int(rules.get("max_open_positions", 99)):
            violations.append(
                f"cartera ya tiene {open_positions} posiciones "
                f"(tope {rules.get('max_open_positions')})"
            )
        nav = float(portfolio.get("totals", {}).get("nav") or 0)
        ticker_weight = next(
            (
                float(p.get("weight_pct") or 0)
                for p in portfolio.get("positions", [])
                if p.get("ticker") == plan.ticker
            ),
            0.0,
        )
        max_ticker = float(rules.get("max_exposure_per_ticker_pct", 100))
        if ticker_weight + plan.position_pct_target > max_ticker:
            violations.append(
                f"exposición resultante en {plan.ticker} "
                f"{ticker_weight + plan.position_pct_target:.1f}% excede el tope {max_ticker}%"
            )
        if nav <= 0:
            portfolio_checks = "partial: NAV=0"
    else:
        portfolio_checks = "omitted: sin snapshot de cartera"

    return {
        "ok": not violations,
        "gate": "risk_gate",
        "violations": violations,
        "portfolio_checks": portfolio_checks,
        "computed": {
            "avg_entry": round(plan.avg_entry, 4),
            "avg_take_profit": round(plan.avg_take_profit, 4),
            "risk_per_share": round(plan.risk_per_share, 4),
            "r_multiple": round(computed_r, 3) if computed_r is not None else None,
            "loss_at_stop_pct_nav": (
                round(loss_at_stop_pct, 3) if loss_at_stop_pct is not None else None
            ),
            "position_cap_pct": cap,
        },
    }


def persist_trade_plan(pool, plan: TradePlan, gate_result: dict[str, Any]) -> str:
    """Guarda el plan con su veredicto. status: gated si pasa, rejected si no.

    Publicar (status='published') es decisión humana (ámbar, §8.2); el agente
    deja el plan en 'gated' como recomendación L2.
    """
    import json

    status = "gated" if gate_result["ok"] else "rejected"
    with pool.connection() as conn:
        row = conn.execute(
            """
            insert into finance.trade_plans
              (ticker, side, thesis_ref, conviction, position_pct_target, entries,
               stop_loss, take_profits, r_multiple_target, max_loss_pct_portfolio,
               risk_score, status, gate_result)
            values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            returning id
            """,
            (
                plan.ticker, plan.side, plan.thesis_ref, plan.conviction,
                plan.position_pct_target,
                json.dumps([p.model_dump() for p in plan.entries]),
                plan.stop_loss,
                json.dumps([p.model_dump() for p in plan.take_profits]),
                plan.r_multiple_target, plan.max_loss_pct_portfolio,
                plan.risk_score, status, json.dumps(gate_result),
            ),
        ).fetchone()
    return str(row[0])
