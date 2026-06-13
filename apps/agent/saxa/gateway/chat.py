"""Canal de chat personal C3 (diseño §14.6) — Postgres como bus.

El cliente (móvil/web) inserta su mensaje en chat.messages con status
'pending'; este servicio lo recoge, lo pasa por Hermes (mismo cerebro que
Telegram: el canal está desacoplado, §6) y escribe la respuesta. Realtime
empuja ambas filas al cliente.

Polling ligero a Postgres local (sin red externa); claim atómico con
`for update skip locked` por si algún día hay más de un worker.
"""

from __future__ import annotations

import asyncio
import logging

from ..core.orchestrator import Hermes

log = logging.getLogger("saxa.chat")

POLL_INTERVAL_S = 2.0


class ChatChannel:
    def __init__(self, pool, hermes: Hermes):
        self._pool = pool
        self._hermes = hermes

    async def run_forever(self) -> None:
        log.info("canal de chat C3: escuchando chat.messages")
        while True:
            try:
                processed = await self._process_pending()
                if not processed:
                    await asyncio.sleep(POLL_INTERVAL_S)
            except Exception as e:  # noqa: BLE001 — el canal no se cae por un mensaje
                log.warning("error en canal de chat: %s; sigo en %ss", e, POLL_INTERVAL_S)
                await asyncio.sleep(POLL_INTERVAL_S)

    async def _process_pending(self) -> bool:
        msg = await asyncio.to_thread(self._claim_next)
        if msg is None:
            return False
        msg_id, user_id, content = msg
        log.info("chat: mensaje %s de %s", msg_id[:8], user_id[:8])
        try:
            # sender = user_id: las aprobaciones quedan atribuidas al usuario real
            reply = await self._hermes.handle_message(content, sender=user_id)
            await asyncio.to_thread(
                self._write_reply, msg_id, user_id, reply.text, "finance", None
            )
        except Exception as e:  # noqa: BLE001 — fallo honesto, visible en el chat
            await asyncio.to_thread(
                self._write_reply, msg_id, user_id,
                f"⚠️ No he podido procesar el mensaje: {e}", None, str(e),
            )
        return True

    # ------------------------------------------------------------------

    def _claim_next(self):
        with self._pool.connection() as conn:
            row = conn.execute(
                """
                update chat.messages set status = 'processing'
                where id = (
                  select id from chat.messages
                  where status = 'pending' and role = 'user'
                  order by created_at
                  for update skip locked
                  limit 1
                )
                returning id::text, user_id::text, content
                """
            ).fetchone()
        return row

    def _write_reply(self, msg_id: str, user_id: str, text: str,
                     domain: str | None, error: str | None) -> None:
        status = "error" if error else "done"
        with self._pool.connection() as conn:
            conn.execute(
                "update chat.messages set status = %s, error = %s where id = %s",
                (status, error, msg_id),
            )
            conn.execute(
                """
                insert into chat.messages (user_id, role, content, domain, status)
                values (%s, 'assistant', %s, %s, 'done')
                """,
                (user_id, text, domain),
            )
