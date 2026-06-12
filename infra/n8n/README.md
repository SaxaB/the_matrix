# infra/n8n — scheduler de cadencias

n8n (self-host, gratis) orquesta las cadencias del ETL de mercado validadas en FinAI:

| Workflow | Cadencia | Acción |
|---|---|---|
| Yahoo diario | L-V ~23:00 Europe/Madrid (tras cierre US) | `etl:yahoo -- --universe indices` |
| Risk scores | encadenado al éxito del anterior | `etl:risk` |
| SEC semanal | domingo madrugada | `etl:sec` |

## Cómo dispara n8n los jobs

Decisión pendiente de validar en el EQR6 (los dos patrones funcionan con el compose actual):

1. **Recomendado**: nodo *Schedule* → *Execute Command* con `docker compose run --rm etl ...`.
   Requiere montar el socket de Docker en el contenedor n8n (añadir
   `/var/run/docker.sock` y un cliente docker). Sencillo pero da a n8n control del daemon:
   aceptable porque n8n es solo-LAN.
2. **Alternativa sin socket**: cron del host (`crontab`) llama a `docker compose run --rm etl ...`
   y n8n queda solo para workflows que necesiten lógica (notificaciones, reintentos).

Los workflows se exportarán como JSON versionado en esta carpeta cuando se creen
(en el smoke test F1 sobre el EQR6).

## Acceso

- UI: `http://<host>:5678` — **solo LAN**, nunca se publica por el tunnel.
- Primer arranque: n8n pide crear el usuario admin.
- Datos persistidos en el volumen `n8n-data`.
