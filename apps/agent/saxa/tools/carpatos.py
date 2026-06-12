"""Tool `carpatos` — transcript del último vídeo de José Luis Cárpatos.

Port de youtube_transcript.py (financial-freedom): yt-dlp baja los subtítulos
automáticos en español del canal, se limpia el VTT (timestamps, tags,
duplicados de captioning) y se devuelve texto. Gratis, sin API key.
Fallback declarado si yt-dlp falla o no hay vídeo reciente.
"""

from __future__ import annotations

import asyncio
import re
from datetime import datetime, timezone
from typing import Any

CHANNEL_URL = "https://www.youtube.com/@JoseLuisCarpatos"
MAX_CHARS = 6000


def _clean_vtt(vtt: str) -> str:
    lines = []
    seen_tail = ""
    for raw in vtt.splitlines():
        line = raw.strip()
        if not line or line.startswith(("WEBVTT", "Kind:", "Language:", "NOTE")):
            continue
        if re.match(r"^\d{2}:\d{2}", line) or "-->" in line:
            continue
        line = re.sub(r"<[^>]+>", "", line)
        if not line:
            continue
        # dedupe del captioning incremental (cada línea repite la cola anterior)
        if line == seen_tail:
            continue
        lines.append(line)
        seen_tail = line
    text = " ".join(lines)
    return re.sub(r"\s+", " ", text).strip()


def _fetch_latest_transcript() -> dict[str, Any]:
    import yt_dlp  # import perezoso: tests sin red no lo necesitan

    # 1) localizar el último vídeo del canal
    with yt_dlp.YoutubeDL(
        {"quiet": True, "extract_flat": True, "playlist_items": "1"}
    ) as ydl:
        info = ydl.extract_info(f"{CHANNEL_URL}/videos", download=False)
    entries = info.get("entries") or []
    if not entries:
        raise RuntimeError("canal sin vídeos visibles")
    latest = entries[0]
    video_id = latest["id"]
    title = latest.get("title")

    # 2) bajar subtítulos automáticos es
    with yt_dlp.YoutubeDL(
        {
            "quiet": True,
            "skip_download": True,
            "writeautomaticsub": True,
            "subtitleslangs": ["es"],
            "subtitlesformat": "vtt",
        }
    ) as ydl:
        video = ydl.extract_info(
            f"https://www.youtube.com/watch?v={video_id}", download=False
        )
    subs = (video.get("automatic_captions") or {}).get("es") or []
    vtt_url = next((s.get("url") for s in subs if s.get("ext") == "vtt"), None)
    if not vtt_url:
        raise RuntimeError("vídeo sin subtítulos automáticos en español")

    import urllib.request

    with urllib.request.urlopen(vtt_url, timeout=30) as resp:  # noqa: S310 — URL de YouTube
        vtt = resp.read().decode("utf-8", errors="replace")
    text = _clean_vtt(vtt)
    return {
        "video_id": video_id,
        "title": title,
        "upload_date": video.get("upload_date"),
        "transcript": text[:MAX_CHARS],
        "transcript_chars_total": len(text),
    }


async def latest_digest() -> dict[str, Any]:
    try:
        data = await asyncio.to_thread(_fetch_latest_transcript)
    except Exception as e:  # noqa: BLE001 — fallback declarado (REGLA #6)
        return {"tool": "carpatos", "omitted": True,
                "reason": f"yt-dlp/transcript falló: {e}"}
    return {
        "tool": "carpatos",
        "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": CHANNEL_URL,
        **data,
    }
