"""Handler de consultas del dominio vault ("¿cuándo caduca mi pasaporte?").

Pipeline determinista mínimo: detectar intención por keywords → consultar
metadatos (tools) → respuesta con modelo barato. El payload al modelo pasa
por vault_gate.check_payload como última barrera (§14.9).
"""

from __future__ import annotations

import json
from typing import Any

from ...gates.vault_gate import check_payload
from .tools import list_expiring, search_documents

VAULT_KEYWORDS = (
    "caduca", "caducidad", "expira", "vence", "vencimiento",
    "pasaporte", "passport", "visado", "visa", "dni", "nie", "tie",
    "documento", "documentos", "permiso de residencia", "carnet", "carné",
    "póliza", "poliza", "seguro médico", "seguro medico", "contrato de alquiler",
    "vault",
)

VAULT_SYSTEM = """Eres saxa respondiendo sobre los documentos personales del usuario.
Recibes SOLO metadatos (título, tipo, titular, fechas, tags) — nunca el contenido.
Responde en español, breve, formato Telegram HTML. Si no hay documentos que
encajen, dilo claramente y sugiere subirlo al vault. Fechas siempre explícitas."""


def is_vault_question(message: str) -> bool:
    lower = message.lower()
    return any(kw in lower for kw in VAULT_KEYWORDS)


def handle_vault_query(pool, llm, router, budget, message: str) -> str:
    lower = message.lower()
    data: dict[str, Any]
    if any(kw in lower for kw in ("caduca", "caducidad", "expira", "vence", "vencimiento")):
        data = list_expiring(pool, days=365)
    else:
        # término más informativo del mensaje como query simple
        terms = [w for w in lower.split() if len(w) > 3 and w not in VAULT_KEYWORDS]
        data = search_documents(pool, terms[0] if terms else "documento")

    payload = json.dumps({"question": message, "metadata": data},
                         ensure_ascii=False, default=str)
    verdict = check_payload(payload)
    if not verdict["ok"]:
        # No debería ocurrir (los tools ya sanean), pero la barrera es la barrera
        return f"⚠️ {verdict['message']}"

    spec = router.resolve("classify_intent")  # barato: respuesta corta sobre metadatos
    budget.check_task(spec.task, spec.cost_budget_usd)
    result = llm.complete(spec, VAULT_SYSTEM, payload)
    budget.record(spec.task, result.model, result.cost_usd,
                  result.input_tokens, result.output_tokens)
    return result.text.strip()
