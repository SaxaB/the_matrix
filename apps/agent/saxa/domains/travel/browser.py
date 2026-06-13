"""Automatización del portal TM47 con Playwright (diseño §7ter, tier T6).

Separación deliberada por el semáforo HITL (§8.2):
  - `login()` + `prepare_report()` → rellenan y capturan, NUNCA envían (verde/ámbar).
  - `submit()` → pulsa el botón final. Solo se llama DESPUÉS de la aprobación humana.

Sesión persistente (`user_data_dir`): el primer login queda guardado y se
reutiliza; el Turnstile de Cloudflare pasa porque es un navegador real (no HTTP
plano). Credenciales: del entorno del host (`secrets.env`), nunca en BD ni git.

Este módulo está escrito para correr en el EQR6 (necesita `playwright install`).
Import perezoso para que el resto de saxa y los tests no dependan de él.
PENDIENTE DE PRUEBA EN VIVO: los selectores se ajustan contra el portal real.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from pathlib import Path

log = logging.getLogger("saxa.travel.browser")

PORTAL_LOGIN = "https://tm47.immigration.go.th/tm47/#/login"
PORTAL_HOME = "https://tm47.immigration.go.th/tm47/#/home"
PORTAL_NEW = "https://tm47.immigration.go.th/tm47/#/requestfrm/add"


@dataclass
class PreparedReport:
    screenshot_path: str
    filled_fields: list[str]
    ready_to_submit: bool


class Tm47Browser:
    """Envoltura fina sobre un contexto persistente de Playwright.

    Uso (en el EQR6):
        async with Tm47Browser() as b:
            await b.login(email, password)
            prepared = await b.prepare_report(payload)   # rellena + captura, NO envía
            # ... aprobación humana ...
            receipt = await b.submit()
    """

    def __init__(self, user_data_dir: str | None = None, headless: bool = True):
        self._user_data_dir = user_data_dir or os.environ.get(
            "TM47_PROFILE_DIR", str(Path.home() / ".saxa" / "tm47-profile")
        )
        self._headless = headless
        self._pw = None
        self._context = None
        self._page = None

    async def __aenter__(self) -> "Tm47Browser":
        from playwright.async_api import async_playwright

        Path(self._user_data_dir).mkdir(parents=True, exist_ok=True)
        self._pw = await async_playwright().start()
        self._context = await self._pw.chromium.launch_persistent_context(
            self._user_data_dir,
            headless=self._headless,
            locale="en-US",
        )
        self._page = self._context.pages[0] if self._context.pages else await self._context.new_page()
        return self

    async def __aexit__(self, *exc) -> None:
        if self._context:
            await self._context.close()
        if self._pw:
            await self._pw.stop()

    async def is_logged_in(self) -> bool:
        await self._page.goto(PORTAL_HOME, wait_until="networkidle")
        return "/login" not in self._page.url

    async def login(self, email: str, password: str) -> None:
        """Login con la sesión real (Turnstile pasa en navegador de verdad).

        saxa-el-programa puede hacer este login con tus credenciales del host;
        la barrera HITL del diseño está en el SUBMIT, no aquí.
        """
        if await self.is_logged_in():
            log.info("TM47: sesión ya activa, login omitido")
            return
        await self._page.goto(PORTAL_LOGIN, wait_until="networkidle")
        await self._page.fill('input[type="email"], input[name="email"]', email)
        await self._page.fill('input[type="password"]', password)
        # Espera a que el Turnstile resuelva y el botón se habilite
        await self._page.wait_for_timeout(4000)
        await self._page.click('button:has-text("LOGIN"), button:has-text("Login")')
        await self._page.wait_for_load_state("networkidle")
        if not await self.is_logged_in():
            raise RuntimeError("login TM47 falló (¿Turnstile/credenciales?)")

    async def prepare_report(self, payload: dict[str, str], screenshot_dir: str) -> PreparedReport:
        """Abre New Application, rellena los campos y CAPTURA. No envía."""
        await self._page.goto(PORTAL_NEW, wait_until="networkidle")

        # Mapa campo lógico -> selector del portal (ajustar en la prueba en vivo)
        selectors = {
            "passport_no": 'input[formcontrolname="passportNo"]',
            "surname": 'input[formcontrolname="surname"]',
            "given_name": 'input[formcontrolname="givenName"]',
            "middle_name": 'input[formcontrolname="middleName"]',
            "address_no": 'input[formcontrolname="addressNo"]',
            "soi_road": 'input[formcontrolname="soiRoad"]',
            "building_name": 'input[formcontrolname="buildingName"]',
            "phone": 'input[formcontrolname="phoneNo"]',
        }
        filled: list[str] = []
        for field, selector in selectors.items():
            value = payload.get(field)
            if not value:
                continue
            try:
                await self._page.fill(selector, value, timeout=5000)
                filled.append(field)
            except Exception as e:  # noqa: BLE001 — selector pendiente de ajuste
                log.warning("TM47: no pude rellenar %s (%s)", field, e)

        # Nacionalidad, provincia/distrito y fechas usan widgets de búsqueda/calendario;
        # se completan en la prueba en vivo (search + opción). Aquí los dejamos para
        # revisión humana en la captura: la persona ve qué falta antes de aprobar.

        Path(screenshot_dir).mkdir(parents=True, exist_ok=True)
        shot = str(Path(screenshot_dir) / "tm47_prefill.png")
        await self._page.screenshot(path=shot, full_page=True)

        return PreparedReport(
            screenshot_path=shot,
            filled_fields=filled,
            ready_to_submit=False,  # SIEMPRE requiere aprobación humana (ámbar)
        )

    async def submit(self) -> dict[str, str]:
        """Pulsa el botón de envío. SOLO tras aprobación humana explícita.

        Devuelve metadatos del recibo (nº/PDF) para guardar en tm47_reports.
        """
        await self._page.click('button:has-text("Submit"), button:has-text("Save")')
        await self._page.wait_for_load_state("networkidle")
        return {"submitted_url": self._page.url}
