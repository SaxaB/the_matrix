"""Flujo HITL del TM47: preparar (fill+captura) → aprobación → submit.

Sin navegador real ni Postgres: browser falso + pool falso. Verifica que el
submit NUNCA ocurre en la preparación y que la aprobación crea el mensaje de
chat con la captura.
"""

from datetime import date

import pytest

from saxa.domains.travel.service import prepare_report, submit_report


class FakePrepared:
    screenshot_path = "/tmp/saxa-tm47/tm47_prefill.png"
    filled_fields = ["passport_no", "surname", "given_name"]
    ready_to_submit = False


class FakeBrowser:
    instances: list["FakeBrowser"] = []

    def __init__(self):
        self.logged_in = False
        self.prepared = False
        self.submitted = False
        FakeBrowser.instances.append(self)

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def login(self, email, password):
        self.logged_in = True

    async def prepare_report(self, payload, screenshot_dir):
        assert self.logged_in, "no se rellena sin login"
        self.prepared = True
        return FakePrepared()

    async def submit(self):
        assert self.logged_in
        self.submitted = True
        return {"submitted_url": "https://tm47.immigration.go.th/tm47/#/done"}


PROFILE_ROW = {
    "user_id": "u1", "passport_no": "PAU665499", "nationality": "SPANISH",
    "surname": "MARIN LEON", "given_name": "ALEJANDRO", "middle_name": None,
    "gender": "Male", "date_of_birth": date(1983, 1, 22),
    "building_name": None, "address_no": "123", "soi_road": "Sukhumvit",
    "province": "Bangkok", "city_amphur": "Watthana", "district_tambon": "Khlong Toei Nuea",
    "phone": None,
}


class FakeConn:
    def __init__(self, store, log):
        self._store = store
        self._log = log
        self.row_factory = None

    def execute(self, sql, params=None):
        s = " ".join(sql.lower().split())
        self._log.append((s, params))
        if "from travel.tm47_profile" in s and "select" in s:
            return _Result([self._store["profile"]] if self._store.get("profile") else [])
        if "insert into travel.tm47_reports" in s:
            return _Result([("report-1",)])
        if "insert into agent.approvals" in s:
            return _Result([("appr-1",)])
        if "insert into chat.messages" in s:
            self._store.setdefault("chat", []).append(params)
            return _Result([])
        if "update travel.tm47_reports" in s:
            self._store.setdefault("updates", []).append((s, params))
            return _Result([])
        return _Result([])

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


class _Result:
    def __init__(self, rows):
        self._rows = rows

    def fetchone(self):
        return self._rows[0] if self._rows else None

    def fetchall(self):
        return self._rows


class FakePool:
    def __init__(self, store):
        self.store = store
        self.log = []

    def connection(self):
        return FakeConn(self.store, self.log)


@pytest.fixture(autouse=True)
def _reset():
    FakeBrowser.instances.clear()


async def test_prepare_creates_approval_and_chat_card():
    pool = FakePool({"profile": PROFILE_ROW})
    result = await prepare_report(
        pool, "u1", date(2026, 3, 1), lambda: FakeBrowser(),
        portal_email="x@y.z", portal_password="secret",
    )
    assert result["ok"] is True
    # se rellenó y capturó, pero NO se envió
    browser = FakeBrowser.instances[0]
    assert browser.prepared is True
    assert browser.submitted is False
    # se creó la tarjeta de chat con metadata de aprobación
    chat_inserts = pool.store.get("chat", [])
    assert chat_inserts, "debe insertarse un mensaje de chat"
    assert "tm47" in str(pool.store["chat"][0]).lower()


async def test_prepare_blocks_without_profile():
    pool = FakePool({})  # sin perfil
    result = await prepare_report(
        pool, "u1", date(2026, 3, 1), lambda: FakeBrowser(),
        portal_email="x", portal_password="y",
    )
    assert result["ok"] is False
    assert "perfil" in result["reason"]
    assert FakeBrowser.instances == []  # ni se abrió el navegador


async def test_submit_only_after_approval():
    pool = FakePool({})
    payload = {"report_id": "report-1", "user_id": "u1"}
    result = await submit_report(
        pool, payload, lambda: FakeBrowser(),
        portal_email="x", portal_password="y",
    )
    assert result["ok"] is True
    assert FakeBrowser.instances[0].submitted is True
    # el report se marca submitted
    updates = pool.store.get("updates", [])
    assert any("status = 'submitted'" in s for s, _ in updates)
