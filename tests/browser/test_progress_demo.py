"""Real Chromium browser tests for synthetic BrightScale Progress MVP prototype.
The HTML and JavaScript are real, but ALL data/roles are fictitious.
No Supabase, payments, API calls or production credentials.
"""
import functools
import http.server
from pathlib import Path
import threading
import unittest
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]


class QuietServer(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


class ProgressDemoBrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        handler = functools.partial(QuietServer, directory=str(ROOT))
        cls.server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.origin = "http://127.0.0.1:" + str(cls.server.server_port)

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=5)

    def setUp(self):
        self.p = sync_playwright().start()
        self.browser = self.p.chromium.launch(headless=True, channel="chrome")
        self.context = self.browser.new_context(
            viewport={"width": 390, "height": 844}, service_workers="block"
        )
        self.page = self.context.new_page()
        self.external_requests = []
        self.page_errors = []
        self.page.on("pageerror", lambda err: self.page_errors.append(str(err)))

        def block_network(route):
            uri = route.request.url
            if uri.startswith(self.origin) and urlsplit(uri).path.startswith("/prototype/"):
                route.continue_()
            else:
                self.external_requests.append(uri)
                route.abort("blockedbyclient")

        self.context.route("**/*", block_network)
        self.page.goto(self.origin + "/prototype/progress-review.html", wait_until="load")
        self.page.get_by_text("SIMULAÇÃO ISOLADA", exact=False).wait_for()

    def tearDown(self):
        self.assertEqual(self.external_requests, [], "External network call attempted")
        self.assertEqual(self.page_errors, [], "Browser JavaScript error occurred")
        self.context.close()
        self.browser.close()
        self.p.stop()

    def as_pm(self):
        self.page.get_by_role("button", name="Project Manager").click()

    def as_client(self):
        self.page.get_by_role("button", name="Cliente", exact=True).click()

    def as_sub(self):
        self.page.get_by_role("button", name="Subcontratado").click()

    def submit(self, task, percentage, note=""):
        self.page.locator("#pct-" + task).fill(str(percentage))
        self.page.locator("#note-" + task).fill(note)
        self.page.locator('[data-action="report"][data-task="' + task + '"]').click()

    def test_sub_pm_client_end_to_end_credit_is_separate_from_payment(self):
        self.submit("lvp", 40, "SYNTHETIC floor progress")
        self.page.get_by_text("aguardando o PM", exact=False).first.wait_for()
        self.as_client()
        self.assertIn("0%", self.page.locator('[data-task="lvp"]').inner_text())
        self.assertNotIn("SYNTHETIC floor progress", self.page.locator("#app").inner_text())
        self.assertNotIn("$576", self.page.locator("#app").inner_text())
        self.as_pm()
        self.page.locator('[data-action="approve"][data-report="report-1"]').click()
        self.assertIn("$576.00", self.page.locator("#pm-credit").inner_text())
        self.assertIn("Não autorizados", self.page.locator("#app").inner_text())
        self.as_client()
        self.assertIn("40%", self.page.locator('[data-task="lvp"]').inner_text())
        self.assertNotIn("$576", self.page.locator("#app").inner_text())
        self.assertNotIn("Crédito", self.page.locator("#app").inner_text())
        self.assertNotIn("Relatório enviado", self.page.locator("#app").inner_text())

    def test_sub_switch_sees_only_own_tasks(self):
        self.assertIn("Instalar piso LVP", self.page.locator("#app").inner_text())
        self.assertNotIn("Pintar paredes", self.page.locator("#app").inner_text())
        self.page.locator("#sub-switch").select_option("sub-paint")
        self.assertIn("Pintar paredes", self.page.locator("#app").inner_text())
        self.assertNotIn("Instalar piso LVP", self.page.locator("#app").inner_text())
        self.assertEqual(self.page.locator("[data-action=report]").count(), 1)

    def test_reject_then_retry_without_credited_progress(self):
        self.submit("lvp", 60)
        self.as_pm()
        self.page.locator("#reason-report-1").fill("Need punch list inspection")
        self.page.locator('[data-action="reject"]').click()
        self.assertIn("$0.00", self.page.locator("#pm-credit").inner_text())
        self.as_sub()
        self.submit("lvp", 50)
        self.as_pm()
        self.page.locator('[data-action="approve"][data-report="report-2"]').click()
        self.assertIn("$720.00", self.page.locator("#pm-credit").inner_text())

    def test_pm_change_needs_reason_and_preserves_previous_progress(self):
        self.submit("lvp", 40)
        self.as_pm()
        self.page.locator("#approve-report-1").fill("50")
        self.page.locator('[data-action="approve"]').click()
        self.assertIn("reason required", self.page.locator("#feedback").inner_text().lower())
        self.page.locator("#reason-report-1").fill("Validated more completed in person")
        self.page.locator('[data-action="approve"]').click()
        self.assertIn("$720.00", self.page.locator("#pm-credit").inner_text())
        self.as_client()
        self.assertIn("50%", self.page.locator('[data-task="lvp"]').inner_text())
        self.assertIn("Original 1.0", self.page.locator("#app").inner_text())

    def test_reset_discards_only_synthetic_in_memory_state(self):
        self.submit("lvp", 25)
        self.page.get_by_role("button", name="Reiniciar simulação").click()
        self.assertEqual(self.page.locator('[data-action="report"]').count(), 2)
        self.assertEqual(self.page.locator("#pct-lvp").input_value(), "0")
        self.as_pm()
        self.assertIn("Nenhum relatório pendente.", self.page.locator("#app").inner_text())


if __name__ == "__main__":
    unittest.main()
