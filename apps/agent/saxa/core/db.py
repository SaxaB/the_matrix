"""Acceso a Postgres del agente (psycopg3 + pool).

El agente escribe en el schema `agent` y lee `market`/`finance` según el
dominio. Realtime escucha el WAL: una escritura aquí repinta web y móvil
sin código extra (diseño §4bis).
"""

from __future__ import annotations

from psycopg_pool import ConnectionPool

_pool: ConnectionPool | None = None


def get_pool(database_url: str) -> ConnectionPool:
    global _pool
    if _pool is None:
        if not database_url:
            raise RuntimeError("DATABASE_URL no configurada (¿.env?)")
        _pool = ConnectionPool(database_url, min_size=1, max_size=4, open=True)
    return _pool


def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None
