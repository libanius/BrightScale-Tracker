"""BrightScale browser agents: synthetic, isolated, non-production end-to-end tests.

Run (after installing Playwright + Chromium):
    python -m unittest discover -s tests/browser -p 'test_*.py' -v

The real HTML, JavaScript and IndexedDB run in Chromium. The cloud adapter is
replaced with a synthetic fixture. No credentials, live requests or live writes.
"""
import functools
import http.server
import os
from pathlib import Path
import threading
import unittest
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
FIXTURE = (ROOT / "tests/browser/fixtures/tracker-cloud.mock.js").read_text(encoding="utf-8")
ARTIFACTS = ROOT / "test-results" / os.environ.get("BROWSER_AGENT", "all")


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


class BrowserHarness(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        handler = functools.partial(QuietHandler, directory=str(ROOT))
        cls.server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base_url = "http://127.0.0.1:" + str(cls.server.server_port)

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=5)

    def setUp(self):
        self.playwright = sync_playwright().start()
        self.browser = self.playwright.chromium.launch(headless=True)
        self.context = self.browser.new_context(
            viewport={"width": 390, "height": 844}, service_workers="block"
        )
        self.page = self.context.new_page()
        self.external_requests = []
        self.page_errors = []
        self.page.on("pageerror", lambda error: self.page_errors.append(str(error)))

        def isolate(route):
            url = route.request.url
            if url.startswith(self.base_url) and urlsplit(url).path == "/tracker-cloud.js":
                route.fulfill(status=200, content_type="application/javascript", body=FIXTURE)
            elif url.startswith("https://cdn.jsdelivr.net/"):
                route.fulfill(status=200, content_type="application/javascript", body="window.supabase = {};")
            elif url.startswith(self.base_url):
                route.continue_()
            else:
                self.external_requests.append(url)
                route.abort("blockedbyclient")

        self.context.route("**/*", isolate)
        # Avoid the PWA's one-time automatic cache-busting navigation in tests.
        self.context.add_init_script(
            "try { sessionStorage.setItem('brightscale:auto-refresh:/index.html', 'done'); } catch (e) {}"
        )

    def tearDown(self):
        # Synthetic screenshots only, never production screenshots.
        outcome = getattr(self, "_outcome", None)
        failed = False
        if outcome and outcome.result:
            failed = any(case is self for case, _ in outcome.result.failures + outcome.result.errors)
        if failed:
            ARTIFACTS.mkdir(parents=True, exist_ok=True)
            try:
                self.page.screenshot(path=str(ARTIFACTS / (self._testMethodName + ".png")), full_page=True)
            except Exception:
                pass
        self.context.close()
        self.browser.close()
        self.playwright.stop()

    def enter_pm(self):
        self.page.goto(self.base_url + "/index.html", wait_until="domcontentloaded")
        self.page.locator(".projects-heading h1").wait_for(timeout=25000)
        self.assertIn("Projetos", self.page.locator(".projects-heading h1").inner_text())
        self.assertEqual(self.page.locator('.nav-ver').inner_text(), 'v2.0 · MVP')

    def seed_pm_task(self):
        self.page.evaluate("""async () => {
          const createdAt = '2026-10-20T10:00:00Z';
          await dbPutLocal('projects', {
            id: 'existing-demo', name: 'SYNTHETIC Existing Project',
            contractTotal: 10000, client: { name: 'Demo Customer' }, createdAt
          });
          await dbPutLocal('units', {
            id: 'unit-demo', projectId: 'existing-demo', unitNumber: '101',
            deadline: '2026-12-01', createdAt
          });
          await dbPutLocal('scopes', {
            id: 'scope-demo', unitId: 'unit-demo', title: 'Flooring',
            order: 1, weight: 1, subcontractAmount: 2000, createdAt
          });
          await dbPutLocal('tasks', {
            id: 'task-demo', scopeId: 'scope-demo', title: 'Install flooring',
            order: 1, progress: 25, status: 'in_progress', deadline: '2026-12-01',
            acceptanceCriteria: 'Finish must be flush', customMetadata: 'retain-me', createdAt
          });
          await reload();
        }""")
        self.page.wait_for_function(
            "() => S.projects.some(project => project.id === 'existing-demo')"
        )

    def assert_isolated(self):
        self.assertEqual(
            self.external_requests, [],
            "Browser agent attempted a remote network request: " + str(self.external_requests)
        )


class PMAgent(BrowserHarness):
    """Acts as the project manager through the actual app UI and local IndexedDB."""

    def test_pm_enters_and_creates_demo_project(self):
        self.enter_pm()
        self.page.get_by_role("button", name="+ Novo").click()
        self.page.locator("#overlay input").nth(0).fill("SYNTHETIC PM Pilot")
        self.page.locator("#overlay input").nth(2).fill("2800.00")
        self.page.locator("#overlay input").nth(3).fill("Demo Client")
        self.page.locator("#overlay button").filter(has_text="Salvar").click()
        self.page.wait_for_function(
            "() => S.projects.some(p => p.name === 'SYNTHETIC PM Pilot')"
        )
        record = self.page.evaluate("""async () => {
          const p = S.projects.find(item => item.name === 'SYNTHETIC PM Pilot');
          return dbGet('projects', p.id);
        }""")
        self.assertEqual(record["contractTotal"], 2800)
        self.assertEqual(record["client"]["name"], "Demo Client")
        self.assert_isolated()

    def test_pm_edits_progress_without_erasing_acceptance(self):
        self.enter_pm()
        self.seed_pm_task()
        self.page.evaluate("openTaskEdit(S.tasks.find(t => t.id === 'task-demo'))")
        self.page.locator("#overlay input[type=range]").evaluate("""element => {
          element.value = '75';
          element.dispatchEvent(new Event('input', { bubbles: true }));
        }""")
        self.page.locator("#overlay button").filter(has_text="Salvar").click()
        self.page.wait_for_function(
            "() => S.tasks.some(t => t.id === 'task-demo' && t.progress === 75)"
        )
        saved = self.page.evaluate("dbGet('tasks', 'task-demo')")
        self.assertEqual(saved["acceptanceCriteria"], "Finish must be flush")
        self.assertEqual(saved["customMetadata"], "retain-me")
        self.assertEqual(saved["progress"], 75)
        self.assert_isolated()

    def test_pm_cannot_replace_existing_original_contract(self):
        self.enter_pm()
        self.seed_pm_task()
        self.page.evaluate("""() => openContractReview(
          new File(['SYNTHETIC estimate'], 'demo.txt', { type: 'text/plain' }),
          {
            projectName: 'SYNTHETIC Additional Flooring', clientName: 'Demo Client',
            clientPhone: '', clientEmail: '', address: '', total: 500,
            unitNumber: '102', rawText: 'SYNTHETIC additional scope',
            summary: 'Not contracted', scopes: [{
              title: 'Extra Floor', weight: 1,
              tasks: [{ title: 'Install additional floor', acceptanceCriteria: 'Approved CO' }]
            }]
          }
        )""")
        options = self.page.locator("#overlay select option").evaluate_all(
            "(items) => items.map(o => ({ value:o.value, disabled:o.disabled, text:o.textContent }))"
        )
        self.assertEqual(options[0]["value"], "")
        self.assertTrue(any(o["value"] == "existing-demo" and o["disabled"] for o in options))
        self.assertIn("Change Order", self.page.locator("#overlay").inner_text())
        result = self.page.evaluate("""async () => {
          const before = (await dbAll('projects')).length;
          const file = new File(['dummy'], 'demo.txt', { type: 'text/plain' });
          try {
            await importContractToProject(file, 'SYNTHETIC', { total: 500, scopes: [] }, 'existing-demo');
            return { unexpectedlySucceeded: true };
          } catch (error) {
            const after = (await dbAll('projects')).length;
            const original = await dbGet('projects', 'existing-demo');
            return { message: error.message, before, after, contract: original.contractTotal };
          }
        }""")
        self.assertIn("Change Order", result["message"])
        self.assertEqual(result["before"], result["after"])
        self.assertEqual(result["contract"], 10000)
        self.assert_isolated()

    def test_pm_imports_new_estimate_through_review_ui(self):
        self.enter_pm()
        self.page.evaluate("""() => openContractReview(
          new File(['SYNTHETIC scope'], 'estimate.txt', { type: 'text/plain' }),
          {
            projectName: 'SYNTHETIC Imported Job', clientName: 'Sample Customer',
            clientPhone: '', clientEmail: '', address: 'Fictional Test Address',
            total: 650, unitNumber: 'Main', summary: 'Fake estimate',
            rawText: 'SYNTHETIC scope', scopes: [{
              title: 'SYNTHETIC Flooring', order: 1, weight: 1,
              tasks: [{ title: 'Install click LVP', order: 1, acceptanceCriteria: 'Install completed cleanly' }]
            }]
          }
        )""")
        self.page.locator("#overlay button").filter(has_text="Criar Projeto").click()
        self.page.wait_for_function("() => S.projects.some(p => p.name === 'SYNTHETIC Imported Job')")
        results = self.page.evaluate("""async () => {
          const p = S.projects.find(p => p.name === 'SYNTHETIC Imported Job');
          const tasks = await dbAll('tasks');
          return { total:p.contractTotal, task:tasks.find(t => t.title === 'Install click LVP') };
        }""")
        self.assertEqual(results["total"], 650)
        self.assertEqual(results["task"]["acceptanceCriteria"], "Install completed cleanly")
        self.assert_isolated()


class ClientAgent(BrowserHarness):
    """Uses the client/sub public link without accessing production share tokens."""

    def test_client_enters_private_demo_link_on_mobile(self):
        self.page.goto(self.base_url + "/dashboard.html?t=owner-demo", wait_until="domcontentloaded")
        self.page.locator(".project-name").wait_for(timeout=10000)
        self.assertIn("SYNTHETIC Client Flooring", self.page.locator(".project-name").inner_text())
        self.assertIn("Install Click LVP", self.page.locator("#content").inner_text())
        self.assertEqual(self.page.locator(".share-project").count(), 0)
        content = self.page.locator("#content").inner_text()
        for private in ["987654", "45678", "33333", "NEVER_SHOW_PRIVATE_MARGIN", "NEVER_SHOW_SUB_COST"]:
            self.assertNotIn(private, content)
        self.assert_isolated()

    def test_client_invalid_or_revoked_link_shows_no_data(self):
        self.page.goto(self.base_url + "/dashboard.html?t=revoked", wait_until="domcontentloaded")
        self.page.get_by_text("Link unavailable").wait_for(timeout=10000)
        self.assertEqual(self.page.locator(".project-card").count(), 0)
        self.assert_isolated()

    def test_sub_scoped_synthetic_view_is_read_only(self):
        self.page.goto(self.base_url + "/dashboard.html?t=sub-demo", wait_until="domcontentloaded")
        self.page.locator(".project-name").wait_for(timeout=10000)
        text = self.page.locator("#content").inner_text()
        self.assertIn("SYNTHETIC Floor Installation", text)
        self.assertNotIn("SYNTHETIC Painting", text)
        self.assertEqual(self.page.locator(".task-item input").count(), 0)
        self.assertEqual(self.page.locator(".share-project").count(), 0)
        self.assert_isolated()


class SecurityAgent(BrowserHarness):
    """Checks UI access guardrails and that sandbox never reaches live services."""

    def test_denied_member_cannot_open_pm_workspace(self):
        self.context.add_init_script("window.__agentAccess = 'denied';")
        self.page.goto(self.base_url + "/index.html", wait_until="domcontentloaded")
        self.page.get_by_text("Este e-mail não tem acesso ao BrightScale Tracker.", exact=False).wait_for(timeout=25000)
        self.assertEqual(self.page.locator(".projects-heading").count(), 0)
        self.assert_isolated()

    def test_legacy_project_url_is_not_accepted(self):
        self.page.goto(self.base_url + "/dashboard.html?project=public-legacy-id", wait_until="domcontentloaded")
        self.page.get_by_text("This link is no longer active").wait_for(timeout=10000)
        self.assertEqual(self.page.locator(".project-card").count(), 0)
        self.assert_isolated()

    def test_browser_does_not_contact_external_services(self):
        self.enter_pm()
        self.page.get_by_role("button", name="+ Novo").click()
        self.assertEqual(self.page.locator("#overlay").count(), 1)
        self.assert_isolated()


class OfflineAgent(BrowserHarness):
    """Checks local IndexedDB persistence while disconnected; not live sync."""

    def test_offline_local_task_progress_survives_reload_of_state(self):
        self.enter_pm()
        self.seed_pm_task()
        self.context.set_offline(True)
        self.page.evaluate("openTaskEdit(S.tasks.find(t => t.id === 'task-demo'))")
        self.page.locator("#overlay input[type=range]").evaluate("""element => {
          element.value = '60';
          element.dispatchEvent(new Event('input', { bubbles: true }));
        }""")
        self.page.locator("#overlay button").filter(has_text="Salvar").click()
        self.page.wait_for_function("() => S.tasks.some(t => t.id === 'task-demo' && t.progress === 60)")
        saved = self.page.evaluate("dbGet('tasks', 'task-demo')")
        self.assertEqual(saved["progress"], 60)
        self.assertEqual(saved["acceptanceCriteria"], "Finish must be flush")
        self.context.set_offline(False)
        self.assert_isolated()


if __name__ == "__main__":
    unittest.main()
