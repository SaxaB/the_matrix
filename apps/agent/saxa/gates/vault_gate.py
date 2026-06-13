"""vault_gate (diseño §14.9): los documentos del vault NUNCA van a un LLM.

Defensa en código, mismo patrón que source_gate/risk_gate:

1. `sanitize_document(row)`: proyección con ALLOWLIST de campos de metadatos.
   Todo lo que no esté en la lista no existe para el modelo (storage_ref,
   notes libres, números completos...).
2. `check_payload(text)`: última barrera antes de una llamada a API de modelo;
   bloquea si el payload contiene binario/base64 largo o texto tipo OCR de
   documento (heurísticas deliberadamente conservadoras).
"""

from __future__ import annotations

import re
from typing import Any

# Únicos campos de vault.documents que pueden viajar a un LLM (§14.9:
# "el LLM ve solo metadatos acordados, no el PDF")
ALLOWED_FIELDS = frozenset({
    "title",
    "doc_type",
    "holder",
    "country",
    "issuer",
    "issue_date",
    "expiry_date",
    "tags",
    "status",
})

# Señales de contenido que no debe salir del host
_BASE64_RE = re.compile(r"[A-Za-z0-9+/=]{300,}")
_PDF_MAGIC = "%PDF-"
_OCR_HINTS = (
    "machine readable zone", "mrz", "<<<",       # pasaportes
    "iban ", "swift/bic",
)


def sanitize_document(row: dict[str, Any]) -> dict[str, Any]:
    """Proyección allowlist; los valores se acotan y serializan a tipos simples."""
    out: dict[str, Any] = {}
    for field in ALLOWED_FIELDS:
        if field not in row or row[field] is None:
            continue
        value = row[field]
        if isinstance(value, (list, tuple)):
            out[field] = [str(v)[:80] for v in value][:20]
        else:
            out[field] = str(value)[:200]
    return out


def check_payload(text: str) -> dict[str, Any]:
    """Veredicto sobre un payload que va a salir hacia una API de modelo."""
    if _PDF_MAGIC in text[:4096] or _BASE64_RE.search(text):
        return {
            "ok": False,
            "gate": "vault_gate",
            "message": (
                "VAULT_GATE bloquea la llamada: el payload contiene contenido "
                "binario/base64. Los ficheros del vault no salen del host (§14.9); "
                "envía solo metadatos saneados con sanitize_document()."
            ),
        }
    lowered = text.lower()
    if any(h in lowered for h in _OCR_HINTS):
        return {
            "ok": False,
            "gate": "vault_gate",
            "message": (
                "VAULT_GATE bloquea la llamada: el payload parece contener texto "
                "OCR de un documento (MRZ/IBAN). Solo metadatos allowlisted."
            ),
        }
    return {"ok": True, "gate": "vault_gate"}
