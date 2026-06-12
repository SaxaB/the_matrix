from __future__ import annotations

import sys
from pathlib import Path

import pytest
import yaml

# El paquete se prueba desde el repo sin instalar (pip install -e también vale)
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

REPO_ROOT = Path(__file__).resolve().parents[3]


@pytest.fixture(scope="session")
def models_config() -> dict:
    with (REPO_ROOT / "infra" / "models.yaml").open() as f:
        return yaml.safe_load(f)


@pytest.fixture(scope="session")
def loops_config() -> dict:
    with (REPO_ROOT / "infra" / "loops.yaml").open() as f:
        return yaml.safe_load(f)
