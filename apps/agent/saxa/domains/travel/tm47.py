"""Lógica del 90-day report TM47 (diseño §14.7) — pura y testable, sin I/O.

Dos responsabilidades:
  1. Calcular cuándo toca el próximo report y si estamos en la ventana online.
  2. Mapear perfil + fecha de llegada → los campos exactos del formulario del
     portal (https://tm47.immigration.go.th).

Regla del trámite (inmigración TH): hay que notificar cada 90 días de estancia
continua. El contador se reinicia con cada entrada al país; por tanto el
vencimiento se cuenta desde el MÁS RECIENTE entre el último report aprobado y
la última entrada. El portal online solo acepta el envío entre 15 días antes y
7 días después del vencimiento.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import date, timedelta

REPORT_PERIOD_DAYS = 90
WINDOW_BEFORE_DAYS = 15
WINDOW_AFTER_DAYS = 7


@dataclass(frozen=True)
class DueStatus:
    due_date: date
    window_opens: date          # due - 15
    window_closes: date         # due + 7
    in_window: bool
    days_until_due: int
    days_until_window_opens: int
    actionable_online: bool     # hoy se puede enviar online
    overdue: bool               # pasada la ventana sin report válido


def compute_due_date(
    last_approved_report: date | None,
    last_arrival: date | None,
) -> date | None:
    """Vencimiento = 90 días desde el evento más reciente (report o entrada)."""
    anchors = [d for d in (last_approved_report, last_arrival) if d is not None]
    if not anchors:
        return None
    return max(anchors) + timedelta(days=REPORT_PERIOD_DAYS)


def due_status(
    today: date,
    last_approved_report: date | None,
    last_arrival: date | None,
) -> DueStatus | None:
    due = compute_due_date(last_approved_report, last_arrival)
    if due is None:
        return None
    opens = due - timedelta(days=WINDOW_BEFORE_DAYS)
    closes = due + timedelta(days=WINDOW_AFTER_DAYS)
    in_window = opens <= today <= closes
    return DueStatus(
        due_date=due,
        window_opens=opens,
        window_closes=closes,
        in_window=in_window,
        days_until_due=(due - today).days,
        days_until_window_opens=(opens - today).days,
        actionable_online=in_window,
        overdue=today > closes,
    )


# ---------------------------------------------------------------------------
# Mapeo a los campos del formulario (New Application / TM47)
# ---------------------------------------------------------------------------

# Campos obligatorios del portal (vistos en el formulario real). El submit NO
# se hace aquí; esto solo construye qué se va a teclear, para auditoría y para
# que el módulo de navegador lo rellene.
REQUIRED_FIELDS = (
    "passport_no", "nationality", "surname", "given_name", "gender",
    "date_of_birth", "arrival_date", "address_no", "soi_road",
    "province", "city_amphur", "district_tambon",
)


@dataclass
class Tm47Profile:
    passport_no: str | None = None
    nationality: str | None = None
    surname: str | None = None
    given_name: str | None = None
    middle_name: str | None = None
    gender: str | None = None
    date_of_birth: date | None = None
    building_name: str | None = None
    address_no: str | None = None
    soi_road: str | None = None
    province: str | None = None
    city_amphur: str | None = None
    district_tambon: str | None = None
    phone: str | None = None


def build_form_payload(profile: Tm47Profile, arrival_date: date) -> dict[str, str]:
    """Construye el dict de campos del formulario (fechas en formato del portal)."""
    def _d(d: date | None) -> str | None:
        return d.strftime("%d/%m/%Y") if d else None

    payload = {
        "passport_no": profile.passport_no,
        "nationality": profile.nationality,
        "surname": profile.surname,
        "given_name": profile.given_name,
        "middle_name": profile.middle_name,
        "gender": profile.gender,
        "date_of_birth": _d(profile.date_of_birth),
        "arrival_date": _d(arrival_date),
        "building_name": profile.building_name,
        "address_no": profile.address_no,
        "soi_road": profile.soi_road,
        "province": profile.province,
        "city_amphur": profile.city_amphur,
        "district_tambon": profile.district_tambon,
        "phone": profile.phone,
    }
    return {k: v for k, v in payload.items() if v is not None}


def validate_payload(payload: dict[str, str]) -> list[str]:
    """Campos obligatorios que faltan. Si no está vacío, NO se prepara el envío."""
    return [f for f in REQUIRED_FIELDS if not payload.get(f)]


def profile_from_row(row: dict) -> Tm47Profile:
    keep = {f.name for f in Tm47Profile.__dataclass_fields__.values()}  # type: ignore[attr-defined]
    return Tm47Profile(**{k: row[k] for k in keep if k in row})


def payload_for_audit(payload: dict[str, str]) -> dict[str, str]:
    """Versión para persistir/loguear: enmascara el nº de pasaporte completo."""
    out = dict(payload)
    pp = out.get("passport_no")
    if pp and len(pp) > 4:
        out["passport_no"] = f"****{pp[-4:]}"
    return out


def status_summary(status: DueStatus) -> str:
    """Texto corto para el chat/Telegram (HTML simple)."""
    if status.overdue:
        return (
            f"🔴 90-day report VENCIDO (vencía {status.due_date:%d/%m/%Y}). "
            f"La ventana online se cerró el {status.window_closes:%d/%m/%Y}; "
            f"probablemente toque presencial."
        )
    if status.in_window:
        return (
            f"🟢 Toca el 90-day report: vence {status.due_date:%d/%m/%Y}, "
            f"ventana abierta hasta {status.window_closes:%d/%m/%Y}."
        )
    return (
        f"🗓️ Próximo 90-day report: {status.due_date:%d/%m/%Y}. "
        f"La ventana abre en {status.days_until_window_opens} días "
        f"({status.window_opens:%d/%m/%Y})."
    )
