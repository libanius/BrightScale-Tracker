"""Browser smoke for real staging UI with totally fake SDK & identities.
Live Supabase Auth/RLS still requires a newly provisioned staging project.
"""
import functools
import http.server
from pathlib import Path
import threading
import unittest
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
FAKE = (ROOT / "tests/browser/fixtures/staging-supabase.mock.js").read_text(encoding="utf8")
TEST_URL = "https://synthetic-test-only.supabase.co"
TEST_KEY = "sb_publishable_FAKE_TEST_ONLY_01234567890123456789"


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


class StagingPortalSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = http.server.ThreadingHTTPServer(
            ("127.0.0.1", 0), functools.partial(Quiet, directory=str(ROOT))
        )
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
        self.browser = self.p.chromium.launch(channel="chrome", headless=True)
        self.context = self.browser.new_context(
            viewport={"width": 390, "height": 844}, service_workers="block"
        )
        self.page = self.context.new_page()
        self.errors = []
        self.remote = []
        self.page.on("pageerror", lambda err: self.errors.append(str(err)))

        def isolate(route):
            url = route.request.url
            if url.startswith("https://cdn.jsdelivr.net/"):
                route.fulfill(status=200, content_type="application/javascript", body=FAKE)
            elif url.startswith(self.origin) and urlsplit(url).path.startswith("/staging/"):
                route.continue_()
            else:
                self.remote.append(url)
                route.abort("blockedbyclient")

        self.context.route("**/*", isolate)

    def tearDown(self):
        self.assertEqual(self.remote, [], "Unexpected external request")
        self.assertEqual(self.errors, [], "Unexpected JavaScript exception")
        self.context.close()
        self.browser.close()
        self.p.stop()

    def enter(self, role, configured=True, draft=False):
        self.context.add_init_script("window.__pilotMockRole = " + repr(role) + ";")
        if draft:
            self.context.add_init_script("window.__pilotMockDraft = true;")
        if configured:
            self.context.add_init_script(
                "localStorage.setItem('brightscale-pilot-config', JSON.stringify({"
                "url: '" + TEST_URL + "', key:'" + TEST_KEY + "'}));"
            )
        self.page.goto(self.origin + "/staging/pilot.html", wait_until="load")

    def test_client_cannot_see_money_pm_form_or_private_report(self):
        self.enter("client")
        self.page.get_by_role("heading", name="SYNTHETIC STAGING Flooring").wait_for()
        body = self.page.locator("#app").inner_text()
        self.assertIn("40%", body)
        self.assertIn("Apenas progresso VALIDADO", body)
        self.assertNotIn("Crédito reconhecido", body)
        self.assertNotIn("$576", body)
        self.assertNotIn("DEMO sub note", body)
        self.assertNotIn("Administração PM", body)
        self.assertFalse(self.page.evaluate("window.__pilotLeaked || false"))
        called = self.page.evaluate("window.__pilotQueried")
        for table in ["pilot_reports", "pilot_credit_events", "pilot_scope_terms", "pilot_assignments"]:
            self.assertNotIn(table, called)

    def test_sub_sees_own_progress_reporting_but_cannot_review(self):
        self.enter("sub")
        self.page.get_by_role("heading", name="SYNTHETIC STAGING Flooring").wait_for()
        body = self.page.locator("#app").inner_text()
        self.assertIn("Crédito reconhecido: $576.00", body)
        self.assertIn("Relatório pendente de validação do PM", body)
        self.assertNotIn("Administração PM", body)
        self.assertNotIn("Validar e reconhecer crédito", body)

    def test_pm_sees_review_workflow_and_no_payment_action(self):
        self.enter("pm")
        self.page.get_by_role("heading", name="SYNTHETIC STAGING Flooring").wait_for(timeout=12000)
        body = self.page.locator("#app").inner_text()
        self.assertIn("Administração PM", body)
        self.assertIn("Validar e reconhecer crédito", body)
        self.assertIn("Subcontrato fictício", body)
        self.assertNotIn("Pagar agora", body)
        self.assertIn("DEMO sub note", body)

    def test_draft_blocks_sub_reporting_and_pm_can_complete_baseline(self):
        self.enter("sub", draft=True)
        self.page.get_by_role("heading", name="SYNTHETIC STAGING Flooring").wait_for()
        body=self.page.locator("#app").inner_text()
        self.assertIn("Baseline RASCUNHO", body)
        self.assertIn("Aguardando aprovação da baseline original pelo PM", body)
        self.assertNotIn("Enviar para validação", body)

    def test_pm_draft_shows_weight_completion_warning_and_not_freeze_button(self):
        self.enter("pm", draft=True)
        self.page.get_by_role("heading", name="SYNTHETIC STAGING Flooring").wait_for()
        body=self.page.locator("#app").inner_text()
        self.assertIn("Baseline RASCUNHO", body)
        self.assertIn("Complete valores e pesos de todos os escopos", body)
        self.assertNotIn("Aprovar e congelar baseline", body)
        self.assertIn("Adicionar tarefa à baseline de teste", body)

    def test_production_project_configuration_is_rejected_before_sdk_creation(self):
        self.enter("pm", configured=False)
        self.page.get_by_text("Conectar ao Supabase STAGING").wait_for()
        self.page.get_by_label("Publishable / anon key do staging").fill(TEST_KEY)
        self.page.get_by_label("Digite STAGING").fill("STAGING")
        for production_ref in ["hyvoatfozlpsevsbkxxm", "wihfneccjwmtxzvivfzf"]:
            self.page.get_by_label("URL Supabase STAGING").fill(
                "https://" + production_ref + ".supabase.co"
            )
            self.page.get_by_role("button", name="Conectar ao ambiente de testes").click()
            self.page.get_by_text("Bloqueado: este é um projeto Supabase ativo de produção", exact=False).wait_for()
            self.assertIsNone(self.page.evaluate("localStorage.getItem('brightscale-pilot-config')"))


if __name__ == "__main__":
    unittest.main()
