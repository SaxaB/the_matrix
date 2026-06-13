"""Dominio travel / TM47: fechas del 90-day report y mapeo de formulario (§14.7)."""

from datetime import date

import pytest

from saxa.domains.travel.tm47 import (
    Tm47Profile,
    build_form_payload,
    compute_due_date,
    due_status,
    payload_for_audit,
    validate_payload,
)


def test_due_date_from_last_report():
    # 90 días desde el último aprobado
    assert compute_due_date(date(2026, 1, 16), None) == date(2026, 4, 16)


def test_due_date_resets_on_entry():
    # Una entrada más reciente que el último report reinicia el contador
    due = compute_due_date(date(2026, 1, 16), date(2026, 3, 1))
    assert due == date(2026, 5, 30)


def test_due_date_unknown_without_data():
    assert compute_due_date(None, None) is None


def test_window_open_is_actionable():
    # Vence 16/04; ventana 01/04–23/04. El 10/04 está dentro.
    st = due_status(date(2026, 4, 10), date(2026, 1, 16), None)
    assert st is not None
    assert st.in_window is True
    assert st.actionable_online is True
    assert st.overdue is False
    assert st.window_opens == date(2026, 4, 1)
    assert st.window_closes == date(2026, 4, 23)


def test_before_window_not_actionable():
    st = due_status(date(2026, 3, 20), date(2026, 1, 16), None)
    assert st.in_window is False
    assert st.days_until_window_opens == 12


def test_overdue_after_window():
    # Caso real del usuario: último aprobado 16/01, hoy 13/06 -> vencido
    st = due_status(date(2026, 6, 13), date(2026, 1, 16), None)
    assert st.overdue is True
    assert st.actionable_online is False


def _full_profile() -> Tm47Profile:
    return Tm47Profile(
        passport_no="PAU665499", nationality="SPANISH",
        surname="MARIN LEON", given_name="ALEJANDRO", gender="Male",
        date_of_birth=date(1983, 1, 22),
        address_no="123", soi_road="Sukhumvit",
        province="Bangkok", city_amphur="Watthana", district_tambon="Khlong Toei Nuea",
    )


def test_build_payload_formats_dates():
    payload = build_form_payload(_full_profile(), date(2026, 3, 1))
    assert payload["date_of_birth"] == "22/01/1983"
    assert payload["arrival_date"] == "01/03/2026"
    assert payload["passport_no"] == "PAU665499"
    assert validate_payload(payload) == []   # nada obligatorio falta


def test_validate_detects_missing_required():
    incomplete = build_form_payload(Tm47Profile(passport_no="X"), date(2026, 3, 1))
    missing = validate_payload(incomplete)
    assert "nationality" in missing and "surname" in missing


def test_audit_masks_passport():
    payload = build_form_payload(_full_profile(), date(2026, 3, 1))
    audit = payload_for_audit(payload)
    assert audit["passport_no"] == "****5499"
    # el original no se muta
    assert payload["passport_no"] == "PAU665499"
