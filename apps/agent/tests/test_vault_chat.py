"""vault_gate (§14.9), routing de dominio y saneo de metadatos."""

from saxa.domains.vault.handler import is_vault_question
from saxa.gates.vault_gate import ALLOWED_FIELDS, check_payload, sanitize_document


# ---------- vault_gate: allowlist ----------

def test_sanitize_strips_sensitive_fields():
    row = {
        "title": "Pasaporte ES",
        "doc_type": "identity",
        "holder": "alex",
        "expiry_date": "2031-03-12",
        "tags": ["pasaporte", "es"],
        # nada de esto puede llegar al LLM:
        "doc_number_last4": "1234",
        "storage_ref": "minio://vault/abc123.pdf",
        "storage_backend": "minio",
        "notes": "número completo P1234567 por si acaso",
        "user_id": "uuid-secreto",
    }
    clean = sanitize_document(row)
    assert set(clean) <= ALLOWED_FIELDS
    assert "storage_ref" not in clean and "notes" not in clean
    assert "doc_number_last4" not in clean and "user_id" not in clean
    assert clean["title"] == "Pasaporte ES"
    assert clean["expiry_date"] == "2031-03-12"


def test_check_payload_blocks_base64_and_pdf():
    assert check_payload("hola " + "QmFzZTY0" * 64)["ok"] is False
    assert check_payload("%PDF-1.7 ...contenido...")["ok"] is False


def test_check_payload_blocks_ocr_hints():
    verdict = check_payload("P<ESPMARIN<<ALEX<<< mrz capturada del escaneo")
    assert verdict["ok"] is False


def test_check_payload_allows_clean_metadata():
    assert check_payload('{"title": "Pasaporte ES", "expiry_date": "2031-03-12"}')["ok"] is True


# ---------- routing multi-dominio ----------

def test_vault_keywords_route_to_vault():
    assert is_vault_question("¿cuándo caduca mi pasaporte?")
    assert is_vault_question("busca el contrato de alquiler en el vault")
    assert is_vault_question("cuando vence el visado de Tailandia")


def test_finance_questions_do_not_route_to_vault():
    assert not is_vault_question("qué pasa hoy en el mercado?")
    assert not is_vault_question("qué tal NVDA")
    assert not is_vault_question("qué hago con mi corto de INTC")
