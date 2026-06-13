"""Gateway de Telegram (long polling, diseño §6).

Long polling en vez de webhook: no necesita URL pública ni tunnel (decisión
F3; el webhook puede activarse en el futuro sin tocar Hermes). Solo responde
en los chats de la allowlist (TELEGRAM_ALLOWED_CHAT_IDS) — el blast radius
de un bot público apuntando a tu agente es inaceptable sin esto.
"""

from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

import httpx

from ..core.orchestrator import Hermes

log = logging.getLogger("saxa.telegram")

TELEGRAM_MAX_LEN = 4096


def allowed_chat_ids() -> set[int]:
    raw = os.environ.get("TELEGRAM_ALLOWED_CHAT_IDS", "")
    ids = set()
    for part in raw.replace(";", ",").split(","):
        part = part.strip()
        if part.lstrip("-").isdigit():
            ids.add(int(part))
    return ids


def chunk_message(text: str, limit: int = TELEGRAM_MAX_LEN) -> list[str]:
    if len(text) <= limit:
        return [text]
    chunks: list[str] = []
    rest = text
    while rest:
        if len(rest) <= limit:
            chunks.append(rest)
            break
        cut = rest.rfind("\n", 0, limit)
        if cut < limit // 2:
            cut = limit
        chunks.append(rest[:cut])
        rest = rest[cut:].lstrip("\n")
    return chunks


class TelegramGateway:
    def __init__(self, token: str, hermes: Hermes):
        if not token:
            raise RuntimeError("TELEGRAM_BOT_TOKEN no configurado")
        self._base = f"https://api.telegram.org/bot{token}"
        self._hermes = hermes
        self._allowed = allowed_chat_ids()
        self._offset: int | None = None

    async def run_forever(self) -> None:
        log.info("gateway telegram: long polling iniciado (allowlist=%s)", self._allowed or "VACÍA")
        if not self._allowed:
            log.warning(
                "TELEGRAM_ALLOWED_CHAT_IDS vacía: el bot ignorará TODOS los mensajes."
            )
        async with httpx.AsyncClient(timeout=70) as client:
            while True:
                try:
                    updates = await self._get_updates(client)
                    for update in updates:
                        await self._handle_update(client, update)
                except httpx.HTTPError as e:
                    log.warning("telegram long poll error: %s; reintento en 5s", e)
                    await asyncio.sleep(5)

    async def _get_updates(self, client: httpx.AsyncClient) -> list[dict[str, Any]]:
        params: dict[str, Any] = {"timeout": 60, "allowed_updates": '["message"]'}
        if self._offset is not None:
            params["offset"] = self._offset
        r = await client.get(f"{self._base}/getUpdates", params=params)
        r.raise_for_status()
        updates = r.json().get("result", [])
        if updates:
            self._offset = updates[-1]["update_id"] + 1
        return updates

    async def _handle_update(self, client: httpx.AsyncClient, update: dict[str, Any]) -> None:
        message = update.get("message") or {}
        chat_id = (message.get("chat") or {}).get("id")
        text = (message.get("text") or "").strip()
        if not text or chat_id is None:
            return
        if chat_id not in self._allowed:
            log.info("mensaje ignorado de chat no permitido: %s", chat_id)
            return

        sender = str((message.get("from") or {}).get("username")
                     or (message.get("from") or {}).get("id") or "desconocido")
        # Comandos y routing viven en Hermes: comunes a Telegram y chat (C3).
        reply = await self._hermes.handle_message(text, sender=sender)
        log.info(
            "respuesta chat=%s ok=%s stop=%s coste=%.4f USD",
            chat_id, reply.ok, reply.stop_reason, reply.cost_usd,
        )
        await self.send(client, chat_id, reply.text)

    async def send(self, client: httpx.AsyncClient, chat_id: int, text: str) -> None:
        for chunk in chunk_message(text):
            r = await client.post(
                f"{self._base}/sendMessage",
                json={
                    "chat_id": chat_id,
                    "text": chunk,
                    "parse_mode": "HTML",
                    "disable_web_page_preview": True,
                },
            )
            if r.status_code != 200:
                # Reintento sin parse_mode: el contenido manda, el formato no
                log.warning("sendMessage HTML falló (%s); reintento en texto plano", r.text[:200])
                await client.post(
                    f"{self._base}/sendMessage",
                    json={"chat_id": chat_id, "text": chunk},
                )
