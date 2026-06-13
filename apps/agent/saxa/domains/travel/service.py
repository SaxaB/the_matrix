"""Servicio del dominio travel: orquesta el ciclo TM47 con HITL (§8.2 ámbar).

Flujo "saxa rellena → captura al chat → tú apruebas":
  1. `check_due(pool)` — ¿toca report y estamos en ventana? (recordatorio).
  2. `prepare_report(...)` — login + fill + screenshot (browser); crea la fila
     `tm47_reports` (awaiting_approval), la `agent.approvals` (ámbar) y un
     mensaje de chat con la captura y botones.
  3. `submit_report(...)` — se llama cuando la aprobación se decide a 'approved';
     pulsa enviar y cierra la fila.

La parte de navegador (pasos 2 y 3) corre en el EQR6; aquí queda cableada y la
lógica de estado/persistencia es testable con un browser falso.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import date
from typing import Any, Protocol

from psycopg.rows import dict_row

from .tm47 import (
    Tm47Profile,
    build_form_payload,
    due_status,
    payload_for_audit,
    profile_from_row,
    status_summary,
    validate_payload,
)

log = logging.getLogger("saxa.travel")


class ReportBrowser(Protocol):
    """Contrato mínimo que cumple Tm47Browser (y los fakes de test)."""

    async def __aenter__(self) -> "ReportBrowser": ...
    async def __aexit__(self, *exc) -> None: ...
    async def login(self, email: str, password: str) -> None: ...
    async def prepare_report(self, payload: dict[str, str], screenshot_dir: str): ...
    async def submit(self) -> dict[str, str]: ...


def _screenshot_public_url(path: str) -> str | None:
    """Construye la URL pública de la captura para la tarjeta del chat.

    Base configurable (SCREENSHOT_PUBLIC_BASE): en el EQR6 apunta al backend de
    blobs / ruta servida (atado a la decisión #10). Sin base, se omite imagen y
    la tarjeta muestra solo el resumen (la aprobación sigue funcionando)."""
    base = os.environ.get("SCREENSHOT_PUBLIC_BASE")
    if not base:
        return None
    return f"{base.rstrip('/')}/{os.path.basename(path)}"


def check_due(pool, today: date | None = None) -> dict[str, Any]:
    """Lee el último report aprobado y la última entrada; calcula el estado."""
    today = today or date.today()
    with pool.connection() as conn:
        conn.row_factory = dict_row
        last_report = conn.execute(
            """
            select filed_date from travel.tm47_reports
            where status = 'approved' and filed_date is not null
            order by filed_date desc limit 1
            """
        ).fetchone()
        last_entry = conn.execute(
            "select arrival_date from travel.entries order by arrival_date desc limit 1"
        ).fetchone()

    status = due_status(
        today,
        last_report["filed_date"] if last_report else None,
        last_entry["arrival_date"] if last_entry else None,
    )
    if status is None:
        return {"known": False, "reason": "sin reports ni entradas registrados todavía"}
    return {"known": True, "summary": status_summary(status), "status": status.__dict__}


async def prepare_report(
    pool,
    user_id: str,
    arrival_date: date,
    browser_factory,
    portal_email: str,
    portal_password: str,
) -> dict[str, Any]:
    """Login + fill + screenshot; deja todo pendiente de aprobación (ámbar)."""
    with pool.connection() as conn:
        conn.row_factory = dict_row
        prof = conn.execute(
            "select * from travel.tm47_profile where user_id = %s", (user_id,)
        ).fetchone()
    if not prof:
        return {"ok": False, "reason": "sin perfil TM47: sube tus datos primero"}

    profile: Tm47Profile = profile_from_row(prof)
    payload = build_form_payload(profile, arrival_date)
    missing = validate_payload(payload)
    if missing:
        return {"ok": False, "reason": f"faltan campos obligatorios: {', '.join(missing)}"}

    screenshot_dir = os.environ.get("TM47_SCREENSHOT_DIR", "/tmp/saxa-tm47")
    async with browser_factory() as browser:
        await browser.login(portal_email, portal_password)
        prepared = await browser.prepare_report(payload, screenshot_dir)

    image_url = _screenshot_public_url(prepared.screenshot_path)
    audit = payload_for_audit(payload)

    # Persistencia + aprobación + mensaje de chat, en una transacción lógica
    with pool.connection() as conn:
        report_row = conn.execute(
            """
            insert into travel.tm47_reports
              (user_id, due_date, channel, status, form_payload, screenshot_ref)
            values (%s, %s, 'online', 'awaiting_approval', %s, %s)
            returning id::text
            """,
            (user_id, arrival_date, json.dumps(audit), prepared.screenshot_path),
        ).fetchone()
        report_id = report_row[0]

        approval_row = conn.execute(
            """
            insert into agent.approvals (domain, action_kind, severity, payload)
            values ('travel', 'tm47_submit', 'amber', %s)
            returning id::text
            """,
            (json.dumps({
                "report_id": report_id,
                "user_id": user_id,
                "arrival_date": arrival_date.isoformat(),
                "filled_fields": prepared.filled_fields,
                "screenshot_ref": prepared.screenshot_path,
                "image_url": image_url,
            }),),
        ).fetchone()
        approval_id = approval_row[0]

        conn.execute(
            "update travel.tm47_reports set approval_id = %s where id = %s",
            (approval_id, report_id),
        )

        short = approval_id[:8]
        body = (
            "📋 <b>90-day report (TM47) listo para enviar</b>\n"
            f"He rellenado el formulario (entrada {arrival_date:%d/%m/%Y}). "
            "Revisa la captura y aprueba para enviarlo.\n"
            f"Aprobar: /aprobar {short} · Rechazar: /rechazar {short}"
        )
        conn.execute(
            """
            insert into chat.messages (user_id, role, content, domain, status, metadata)
            values (%s, 'assistant', %s, 'travel', 'done', %s)
            """,
            (user_id, body, json.dumps({
                "kind": "approval",
                "approval_id": approval_id,
                "action_kind": "tm47_submit",
                "image_url": image_url,
            })),
        )

    return {
        "ok": True,
        "report_id": report_id,
        "approval_id": approval_id,
        "filled_fields": prepared.filled_fields,
        "screenshot_ref": prepared.screenshot_path,
    }


async def submit_report(
    pool,
    approval_payload: dict[str, Any],
    browser_factory,
    portal_email: str,
    portal_password: str,
) -> dict[str, Any]:
    """Ejecuta el envío real tras la aprobación humana. Cierra la fila."""
    report_id = approval_payload["report_id"]
    async with browser_factory() as browser:
        await browser.login(portal_email, portal_password)
        # El navegador retoma la sesión donde el formulario quedó relleno;
        # en producción prepare+submit comparten contexto persistente.
        receipt = await browser.submit()

    with pool.connection() as conn:
        conn.execute(
            """
            update travel.tm47_reports
            set status = 'submitted', filed_date = current_date,
                receipt_ref = %s
            where id = %s
            """,
            (json.dumps(receipt), report_id),
        )
    return {"ok": True, "report_id": report_id, "receipt": receipt}
