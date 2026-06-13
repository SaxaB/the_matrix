# domains/travel — P4 movilidad (90-day report TM47)

Automatiza el *Notification of staying in the Kingdom over 90 days* de inmigración
tailandesa (portal `tm47.immigration.go.th`). Diseño §14.7; tier T6 (§7ter:
sesión propia de navegador, solo con orden explícita).

## Flujo "saxa rellena → captura al chat → tú apruebas" (HITL ámbar, §8.2)

1. **Recordatorio** (`check_due` / `saxa` loop + n8n): calcula el vencimiento
   (90 días desde el último report aprobado o la última entrada, lo que sea más
   reciente) y avisa **dentro de la ventana online** (15 días antes a 7 después).
2. **Preparación** (`prepare_report`): el navegador (Playwright, sesión
   persistente) hace login con tus credenciales del host, abre *New Application*,
   **rellena** los campos desde tu perfil + la fecha de entrada y **captura** la
   pantalla. **No envía.** Crea la fila `travel.tm47_reports` (awaiting_approval),
   la `agent.approvals` (severidad `amber`) y un **mensaje de chat con la captura**
   y botones Aprobar/Rechazar.
3. **Aprobación**: pulsas Aprobar en el tab Chat (o `/aprobar <id>`). Hermes
   despacha la aprobación por `action_kind=tm47_submit` y solo entonces
   `submit_report` pulsa enviar. Rechazar → el report se cancela, no se manda nada.

## Piezas

| Fichero | Qué | Probado |
|---|---|---|
| `tm47.py` | fechas (vencimiento/ventana) + mapeo perfil→formulario; puro | ✅ tests |
| `service.py` | orquestación HITL (prepare/submit) + persistencia + chat | ✅ tests (browser falso) |
| `browser.py` | Playwright: login/fill/screenshot/submit separados | ⏳ prueba en vivo (EQR6) |

## Credenciales y privacidad

- Email/contraseña del portal: **`secrets.env` del host** (`TM47_PORTAL_EMAIL`,
  `TM47_PORTAL_PASSWORD`), **nunca** en BD ni git. El perfil de Playwright
  (`TM47_PROFILE_DIR`) guarda la sesión para no re-loguear.
- `travel.tm47_profile` guarda datos de identidad para el autofill (RLS de un
  solo usuario); el nº de pasaporte se enmascara en el payload de auditoría.
- Datos personales sensibles → schema `travel` privado.

## Pendiente de prueba en vivo (sin EQR6)

`browser.py` está escrito contra el portal real visto, pero **los selectores y
los widgets de búsqueda (nacionalidad, provincia/distrito, calendarios) se
ajustan ejecutándolo contra el portal**. La lógica de fechas, el mapeo, la cola
de aprobación y la tarjeta de chat ya están validados con tests. Para instalar
el navegador: `pip install 'saxa[browser]' && playwright install chromium`.
