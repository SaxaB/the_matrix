"""Carga de configuración de saxa.

Fuentes, por orden:
  1. Variables de entorno ya presentes (inyectadas por docker compose).
  2. `.env` de la raíz del monorepo (desarrollo local).
  3. `infra/models.yaml` e `infra/loops.yaml` (router y catálogo de loops).

Sin dependencias de framework: dict + dataclasses.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

# apps/agent/saxa/core/config.py -> raíz del monorepo
REPO_ROOT = Path(__file__).resolve().parents[3].parent


def load_dotenv(path: Path | None = None) -> None:
    """Aplica un .env sin pisar variables ya presentes en el entorno."""
    p = path or (REPO_ROOT / ".env")
    if not p.exists():
        return
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


@dataclass(frozen=True)
class Settings:
    """Settings del runtime; todo lo secreto viene del entorno."""

    database_url: str
    telegram_bot_token: str
    anthropic_api_key: str
    models_config: dict[str, Any] = field(default_factory=dict)
    loops_config: dict[str, Any] = field(default_factory=dict)

    @property
    def daily_budget_usd(self) -> float:
        return float(self.models_config.get("daily_budget_usd", 5.0))


def _read_yaml(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def load_settings(
    env_file: Path | None = None,
    models_yaml: Path | None = None,
    loops_yaml: Path | None = None,
) -> Settings:
    load_dotenv(env_file)

    database_url = os.environ.get("DATABASE_URL", "")
    if not database_url:
        host = os.environ.get("POSTGRES_HOST_LOCAL", "localhost")
        port = os.environ.get("POSTGRES_PORT", "5432")
        db = os.environ.get("POSTGRES_DB", "postgres")
        password = os.environ.get("POSTGRES_PASSWORD", "")
        if password:
            database_url = f"postgres://postgres:{password}@{host}:{port}/{db}"

    return Settings(
        database_url=database_url,
        telegram_bot_token=os.environ.get("TELEGRAM_BOT_TOKEN", ""),
        anthropic_api_key=os.environ.get("ANTHROPIC_API_KEY", ""),
        models_config=_read_yaml(models_yaml or REPO_ROOT / "infra" / "models.yaml"),
        loops_config=_read_yaml(loops_yaml or REPO_ROOT / "infra" / "loops.yaml"),
    )
