"""source_gate — gate determinista de cobertura de fuentes (portado de financial-freedom).

Si un mensaje saliente parece un briefing completo, exige que declare cobertura
de las fuentes obligatorias según `apps/agent/data/source-policy.yaml`; si cita
DCF/fair value, exige fuente ejecutada (valuation_gate). Sin cobertura, bloquea.

Cambios del trasplante: se elimina el modo hook de Claude Code (parsing de
comandos telegram-send); aquí el gate es una función que el loop llama antes
de publicar (diseño §5quater: "publicar sin gate = loop roto").
"""

from __future__ import annotations

import html
import re
from pathlib import Path
from typing import Any

import yaml

DEFAULT_POLICY_PATH = Path(__file__).resolve().parents[2] / "data" / "source-policy.yaml"

VALUATION_TERMS = [
    "dcf",
    "fair value",
    "valor razonable",
    "valor justo",
    "fair / share",
    "fair per share",
]

VALUATION_SOURCE_TERMS = [
    "dcf_manual.py",
    "valuation.py",
    "tools/scripts/dcf_manual.py",
    "tools/scripts/valuation.py",
    "dcf manual",
]

META_MARKERS = (
    "no es un briefing", "no es briefing", "esto no es", "no es un informe",
    "regla #", "regla dura",
    "va a continuacion", "mas abajo", " abajo",
)

COMPLETE_PHRASES = (
    "briefing completo", "briefing de mercado", "briefing us",
    "briefing pre", "briefing intra", "briefing post", "briefing v",
)


def load_policy(path: Path | None = None) -> dict[str, Any]:
    with (path or DEFAULT_POLICY_PATH).open("r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def normalize(text: str) -> str:
    text = html.unescape(text or "")
    text = re.sub(r"<[^>]+>", " ", text)
    text = text.lower()
    text = (text.replace("á", "a").replace("é", "e").replace("í", "i")
                .replace("ó", "o").replace("ú", "u").replace("ü", "u")
                .replace("ñ", "n"))
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _terms_present(text_norm: str, terms: list[str]) -> bool:
    return any(normalize(t) in text_norm for t in terms)


def should_gate(text: str, source_name: str, policy: dict[str, Any]) -> bool:
    text_norm = normalize(f"{source_name}\n{text}")
    req = policy["request_types"]["briefing_completo"]
    if _terms_present(text_norm, policy.get("override_terms", [])):
        return False
    if any(m in text_norm for m in META_MARKERS):
        return False
    filename_trigger = bool(
        re.search(r"\bbriefing[^/\s]*\.(html|md|txt)\b", source_name.lower())
    )
    term_trigger = _terms_present(text_norm, req.get("trigger_terms", []))
    complete_trigger = any(p in text_norm for p in COMPLETE_PHRASES)
    return filename_trigger or term_trigger or complete_trigger


def evaluate_valuation_claims(text: str, source_name: str = "") -> dict[str, Any] | None:
    """Bloquea claims de DCF/fair value sin fuente ejecutada (incidente MU 2026-05-27)."""
    text_norm = normalize(f"{source_name}\n{text}")
    if "#valuation-gate-override" in text_norm:
        return None
    if not _terms_present(text_norm, VALUATION_TERMS):
        return None
    has_ticker_like = bool(re.search(r"\b[A-Z]{1,5}\b", text))
    has_money = bool(
        re.search(r"[$€]\s*\d|\b\d+[,.]?\d*\s*(?:usd|eur|dolares|dólares)\b", text_norm)
    )
    if not (has_ticker_like or has_money):
        return None
    if _terms_present(text_norm, VALUATION_SOURCE_TERMS):
        return None
    return {
        "ok": False,
        "gated": True,
        "gate": "valuation_claims",
        "message": (
            "VALUATION_GATE bloquea el envio: el mensaje contiene DCF/fair value/valor "
            "razonable con cifras o tickers, pero no cita `dcf_manual.py` ni `valuation.py`. "
            "Ejecuta la tool y cita la fuente, o añade #valuation-gate-override si es una "
            "discusion meta sin claim operativo."
        ),
    }


def group_has_coverage(text_norm: str, group_name: str, policy: dict[str, Any]) -> bool:
    group = policy["groups"][group_name]
    aliases = group.get("aliases", []) + [group_name, group.get("label", "")]
    if _terms_present(text_norm, aliases):
        return True
    # Permite omisión explícita: el grupo aparece cerca de un término de omisión
    omission_terms = [normalize(t) for t in policy.get("omission_terms", [])]
    alias_norms = [normalize(a) for a in aliases if a]
    for alias in alias_norms:
        if not alias or alias not in text_norm:
            continue
        idx = text_norm.find(alias)
        window = text_norm[max(0, idx - 120): idx + len(alias) + 180]
        if any(term in window for term in omission_terms):
            return True
    return False


def build_message(
    missing: list[str], any_missing: list[dict[str, Any]], policy: dict[str, Any]
) -> str:
    if not missing and not any_missing:
        return "source_gate OK"
    labels = []
    for item in missing:
        if item == "bloque_fuentes_consultadas":
            labels.append("bloque explicito 'Fuentes consultadas / omitidas'")
        else:
            labels.append(policy["groups"].get(item, {}).get("label", item))
    for item in any_missing:
        labels.append(f"{item['name']}: al menos {item['min']} de {', '.join(item['labels'])}")
    return (
        "SOURCE_GATE bloquea el envio: el mensaje parece un briefing completo "
        "pero falta cobertura declarada de fuentes: "
        + "; ".join(labels)
        + ". Solucion: correr esas fuentes, declarar omision con motivo, "
        "o titularlo 'briefing parcial'."
    )


def evaluate(
    text: str, source_name: str = "", policy: dict[str, Any] | None = None
) -> dict[str, Any]:
    policy = policy or load_policy()
    valuation_result = evaluate_valuation_claims(text, source_name)
    if valuation_result is not None:
        return valuation_result

    if not should_gate(text, source_name, policy):
        return {"ok": True, "gated": False, "reason": "no aplica gate briefing completo"}

    text_norm = normalize(text)
    req = policy["request_types"]["briefing_completo"]
    missing: list[str] = []
    covered: list[str] = []

    for group_name in req.get("required_groups", []):
        if group_has_coverage(text_norm, group_name, policy):
            covered.append(group_name)
        else:
            missing.append(group_name)

    any_missing: list[dict[str, Any]] = []
    any_covered: dict[str, list[str]] = {}
    for gate_name, gate in (req.get("require_any") or {}).items():
        groups = gate.get("groups", [])
        found = [g for g in groups if group_has_coverage(text_norm, g, policy)]
        min_required = int(gate.get("min", 1))
        any_covered[gate_name] = found
        if len(found) < min_required:
            labels = [policy["groups"][g]["label"] for g in groups]
            any_missing.append({"name": gate_name, "min": min_required, "labels": labels})

    coverage_terms_ok = _terms_present(text_norm, policy.get("coverage_terms", []))
    if not coverage_terms_ok:
        missing.append("bloque_fuentes_consultadas")

    ok = not missing and not any_missing
    return {
        "ok": ok,
        "gated": True,
        "covered": covered,
        "missing": missing,
        "require_any_covered": any_covered,
        "require_any_missing": any_missing,
        "message": build_message(missing, any_missing, policy),
    }
