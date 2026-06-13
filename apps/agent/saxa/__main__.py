"""Entrypoints de saxa.

  saxa run        — gateway Telegram (long polling) 24/7
  saxa briefing   — genera el briefing una vez y lo imprime (disparo n8n/manual)
  saxa check      — valida config (router, policy, conexión a Postgres si hay)
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys

from .core.budget import BudgetTracker, PostgresSpendStore
from .core.config import Settings, load_settings
from .core.db import get_pool
from .core.llm import build_default_client
from .core.orchestrator import Hermes
from .core.router import ModelRouter
from .gateway.telegram import TelegramGateway


def build_hermes(settings: Settings) -> Hermes:
    from .core.observability import ObservedLlmClient

    pool = get_pool(settings.database_url)
    router = ModelRouter(settings.models_config)
    llm = ObservedLlmClient(build_default_client(settings.anthropic_api_key))
    budget = BudgetTracker(settings.daily_budget_usd, PostgresSpendStore(pool))
    return Hermes(settings, router, llm, budget, pool)


def cmd_run(settings: Settings) -> int:
    """Arranca los canales: Telegram (grupo, C1) + chat personal (C3).

    Cada canal es opcional según config; ambos hablan con el mismo Hermes (§6).
    """
    from .gateway.chat import ChatChannel

    hermes = build_hermes(settings)
    channels = []
    if settings.telegram_bot_token:
        channels.append(TelegramGateway(settings.telegram_bot_token, hermes).run_forever())
    if settings.database_url:
        pool = get_pool(settings.database_url)
        channels.append(ChatChannel(pool, hermes).run_forever())
    if not channels:
        print("Sin canales configurados (ni TELEGRAM_BOT_TOKEN ni DATABASE_URL)")
        return 1

    async def _run_all():
        await asyncio.gather(*channels)

    asyncio.run(_run_all())
    return 0


def cmd_briefing(settings: Settings) -> int:
    hermes = build_hermes(settings)
    reply = asyncio.run(hermes.run_briefing())
    print(reply.text)
    return 0 if reply.ok else 1


def cmd_compact(settings: Settings) -> int:
    """Compactación nocturna de la wiki (§9bis.5): disparo n8n o manual."""
    from .core.observability import ObservedLlmClient
    from .domains.finance.wiki import compact_portfolio_pages

    pool = get_pool(settings.database_url)
    router = ModelRouter(settings.models_config)
    llm = ObservedLlmClient(build_default_client(settings.anthropic_api_key))
    budget = BudgetTracker(settings.daily_budget_usd, PostgresSpendStore(pool))
    result = compact_portfolio_pages(pool, llm, router, budget)
    print(f"Compactadas: {', '.join(result['compacted']) or 'ninguna'}")
    print(f"Sin eventos nuevos: {', '.join(result['skipped_no_events']) or 'ninguna'}")
    return 0


def cmd_radar(settings: Settings) -> int:
    """Radar semanal (§9bis.3): disparo manual o desde n8n (domingo)."""
    from .domains.finance.radar import run_radar

    pool = get_pool(settings.database_url)
    result = run_radar(pool)
    print(f"Radar {result['run_id'][:8]}: universo {result['universe']}, "
          f"elegibles {result['eligible']}")
    for c in result["candidates"]:
        flag = "✓" if c["plan_ok"] else "✗ gate"
        print(f"  #{c['rank']:>2} {c['ticker']:<6} {c['score']:.2f}  {flag}")
    return 0


def cmd_check(settings: Settings) -> int:
    from .gates.source_gate import load_policy

    router = ModelRouter(settings.models_config)
    for task in (settings.models_config.get("tasks") or {}):
        spec = router.resolve(task)
        print(f"  task {task:24s} -> {spec.provider}:{spec.model}"
              f" (budget {spec.cost_budget_usd} USD)")
    policy = load_policy()
    print(f"  source-policy v{policy.get('version')} ({len(policy.get('groups', {}))} grupos)")
    print(f"  tope diario: {settings.daily_budget_usd} USD")
    print(f"  telegram token: {'sí' if settings.telegram_bot_token else 'NO'}")
    print(f"  anthropic key: {'sí' if settings.anthropic_api_key else 'NO'}")
    if settings.database_url:
        try:
            pool = get_pool(settings.database_url)
            with pool.connection() as conn:
                conn.execute("select 1")
            print("  postgres: conectado")
        except Exception as e:  # noqa: BLE001
            print(f"  postgres: NO conectado ({e})")
    else:
        print("  postgres: DATABASE_URL no configurada")
    print("check OK")
    return 0


def main() -> int:
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s"
    )
    parser = argparse.ArgumentParser(prog="saxa")
    parser.add_argument("command", choices=["run", "briefing", "radar", "compact", "check"])
    args = parser.parse_args()

    settings = load_settings()
    if args.command == "run":
        return cmd_run(settings)
    if args.command == "briefing":
        return cmd_briefing(settings)
    if args.command == "radar":
        return cmd_radar(settings)
    if args.command == "compact":
        return cmd_compact(settings)
    return cmd_check(settings)


if __name__ == "__main__":
    sys.exit(main())
