# apps/agent — saxa (orquestador Python).
# Construir con contexto en la raíz del monorepo (necesita infra/*.yaml):
#   docker compose build agent
# El layout /app/apps/agent + /app/infra replica el del repo para que
# saxa.core.config resuelva REPO_ROOT igual en local y en contenedor.

FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app/apps/agent

COPY apps/agent/pyproject.toml ./
COPY apps/agent/saxa ./saxa
COPY apps/agent/data ./data
COPY infra /app/infra

RUN pip install .

CMD ["saxa", "run"]
