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
            elif (url.startswith("https://tracker.brightscalegroup.com/staging/")
                  and urlsplit(url).path.startswith("/staging/")):
                # Test the production-host fail-closed behavior without a real
                # request to the actual Tracker production site.
                filepath = ROOT / urlsplit(url).path.lstrip("/")
                media = "text/html" if filepath.suffix == ".html" else "application/javascript"
                route.fulfill(status=200, content_type=media, body=filepath.read_text(encoding="utf8"))
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

    def enter(self, role, configured=True, draft=False, co_status=None):
        self.context.add_init_script("window.__pilotMockRole = " + repr(role) + ";")
        if draft:
            self.context.add_init_script("window.__pilotMockDraft = true;")
        if co_status is not None:
            self.context.add_init_script("window.__pilotMockCO = true;")
            self.context.add_init_script("window.__pilotMockCOStatus = " + repr(co_status) + ";")
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
        self.assertIn("Baseline original congelada", body)
        self.assertNotIn("Criar escopo de teste", body)
        self.assertNotIn("Adicionar tarefa à baseline de teste", body)
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

    def test_client_sees_additional_client_price_but_never_sub_costs(self):
        self.enter("client", co_status="submitted")
        self.page.get_by_role("heading", name="SYNTHETIC Bathroom Add-on").wait_for()
        body=self.page.locator("#app").inner_text()
        self.assertIn("$3,500.00",body)
        self.assertIn("Aprovar adicional",body)
        self.assertIn("SYNTHETIC Install shower tile",body)
        self.assertNotIn("$800.00",body)
        self.assertNotIn("$240.00",body)
        self.assertNotIn("PRIVATE sub CO note",body)
        self.assertNotIn("Ativar CO aprovado",body)
        calls=self.page.evaluate("window.__pilotQueried")
        for table in ["pilot_co_sub_terms","pilot_co_reports","pilot_co_credit_events","pilot_co_audit_events"]:
            self.assertNotIn(table,calls)
        self.assertFalse(self.page.evaluate("window.__pilotLeaked || false"))

    def test_sub_active_co_sees_own_price_and_credit_but_not_client_price(self):
        self.enter("sub", co_status="active")
        self.page.get_by_role("heading", name="SYNTHETIC Bathroom Add-on").wait_for()
        body=self.page.locator("#app").inner_text()
        self.assertIn("$800.00",body)
        self.assertIn("$240.00",body)
        self.assertNotIn("$3,500.00",body)
        self.assertNotIn("Aprovar adicional",body)
        self.assertNotIn("Ativar CO aprovado",body)
        self.assertNotIn("Validar e reconhecer crédito deste CO",body)
        self.assertFalse(self.page.evaluate("window.__pilotLeaked || false"))
        self.assertNotIn("pilot_co_client_terms",self.page.evaluate("window.__pilotQueried"))

    def test_pm_draft_can_complete_separate_co_and_submit(self):
        self.enter("pm", co_status="draft")
        self.page.get_by_role("heading", name="SYNTHETIC Bathroom Add-on").wait_for()
        body=self.page.locator("#app").inner_text()
        self.assertIn("Novo Change Order (rascunho PM)",body)
        self.assertIn("Adicionar escopo ao CO",body)
        self.assertNotIn("Ativar CO aprovado",body)
        self.assertIn("Enviar CO para aprovação do cliente",body)
        self.assertIn("$3,500.00",body)
        self.assertIn("$800.00",body)
        self.assertIn("Crédito de sub reconhecido NESTE CO",body)
        self.assertNotIn("Ativar CO aprovado",body)

    def test_client_approval_calls_explicit_server_rpc(self):
        self.enter("client", co_status="submitted")
        self.page.get_by_role("heading", name="SYNTHETIC Bathroom Add-on").wait_for()
        self.page.on("dialog",lambda d:d.accept())
        self.page.get_by_role("button", name="Aprovar adicional", exact=False).click()
        self.page.get_by_text("client_approved", exact=False).first.wait_for()
        calls=self.page.evaluate("window.__pilotRpcCalls")
        decision=[c for c in calls if c["name"]=="pilot_co_client_decide"]
        self.assertEqual(len(decision),1)
        self.assertEqual(decision[0]["payload"],{"p_co_id":"co-demo","p_approve":True,"p_reason":""})
        self.assertNotIn("role",decision[0]["payload"])

    def test_client_can_request_change_without_forging_author_or_pricing(self):
        self.enter("client", co_status="submitted")
        self.page.get_by_role("heading", name="SYNTHETIC Bathroom Add-on").wait_for()
        self.page.get_by_label("Assunto da solicitação").fill("SYNTHETIC Change kitchen faucet")
        self.page.get_by_label("Descrição do pedido").fill("Add faucet after approved original")
        self.page.get_by_role("button",name="Enviar solicitação ao PM").click()
        self.page.get_by_text("Registro salvo no ambiente STAGING.").wait_for()
        writes=self.page.evaluate("window.__pilotWrites")
        co_requests=[x for x in writes if x["table"]=="pilot_co_requests"]
        self.assertEqual(len(co_requests),1)
        self.assertEqual(set(co_requests[0]["data"]),{"project_id","title","description"})
        self.assertNotIn("client_amount_cents",str(co_requests[0]["data"]))
        self.assertNotIn("requester_id",str(co_requests[0]["data"]))

    def test_pm_can_formalize_client_request_as_private_co_draft(self):
        self.enter("pm", co_status="draft")
        self.page.get_by_role("heading", name="SYNTHETIC Bathroom Add-on").wait_for()
        self.page.on("dialog",lambda dialog:dialog.accept("200.00"))
        self.page.get_by_role("button",name="Transformar em CO rascunho").click()
        self.page.wait_for_function("""() => window.__pilotRpcCalls.some(
            r=>r.name==='pilot_co_formalize_request')""")
        calls=self.page.evaluate("window.__pilotRpcCalls")
        match=[c for c in calls if c["name"]=="pilot_co_formalize_request"]
        self.assertEqual(match[0]["payload"],{"p_request_id":"co-request-demo","p_client_cents":20000})

    def test_sub_can_request_co_but_sees_no_other_users_requests(self):
        self.enter("sub", co_status="active")
        self.page.get_by_role("heading", name="SYNTHETIC Bathroom Add-on").wait_for()
        body=self.page.locator("#app").inner_text()
        self.assertIn("Solicitar um Change Order (cliente, sub ou PM)",body)
        self.assertNotIn("SYNTHETIC Requested faucet",body)
        self.assertNotIn("Transformar em CO rascunho",body)

    def test_pilot_denies_login_on_production_host_without_real_network(self):
        self.page.goto("https://tracker.brightscalegroup.com/staging/pilot.html", wait_until="load")
        self.page.get_by_role("heading", name="Portal de staging bloqueado nesta origem").wait_for()
        body=self.page.locator("#app").inner_text()
        self.assertIn("só funciona em localhost ou preview isolado", body)
        self.assertNotIn("Receber link de login", body)
        self.assertNotIn("Conectar ao Supabase STAGING", body)
        self.assertEqual(self.page.evaluate("window.__pilotQueried"), [])

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
