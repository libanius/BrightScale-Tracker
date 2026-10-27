"""Chrome checks for the integrated COs tab in the REAL BrightScale index.html.
All cloud/auth data is mocked. CDN and outbound network are blocked. The demo
must not touch real legacy IndexedDB project/contract/credits.
"""
import functools
import http.server
import threading
import unittest
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
FIXTURE=(ROOT/"tests/browser/fixtures/tracker-cloud.mock.js").read_text(encoding="utf8")


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*_args):
        pass


class BrowserCOIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server=http.server.ThreadingHTTPServer(
            ("127.0.0.1",0),functools.partial(Quiet,directory=str(ROOT)))
        cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True)
        cls.thread.start()
        cls.origin="http://127.0.0.1:"+str(cls.server.server_port)

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=5)

    def setUp(self):
        self.p=sync_playwright().start()
        self.browser=self.p.chromium.launch(channel="chrome",headless=True)
        self.context=self.browser.new_context(
            viewport={"width":390,"height":844},service_workers="block")
        self.page=self.context.new_page()
        self.remote=[]
        self.errors=[]
        self.page.on("pageerror",lambda e:self.errors.append(str(e)))

        def isolate(route):
            url=route.request.url
            if url.startswith(self.origin) and urlsplit(url).path=="/tracker-cloud.js":
                route.fulfill(status=200,content_type="application/javascript",body=FIXTURE)
            elif url.startswith("https://cdn.jsdelivr.net/"):
                route.fulfill(status=200,content_type="application/javascript",body="window.supabase={};")
            elif url.startswith(self.origin):
                route.continue_()
            else:
                self.remote.append(url)
                route.abort("blockedbyclient")
        self.context.route("**/*",isolate)
        self.context.add_init_script(
            "try{sessionStorage.setItem('brightscale:auto-refresh:/index.html','done')}catch(e){}"
        )
        self.page.goto(self.origin+"/index.html",wait_until="domcontentloaded")
        self.page.locator(".projects-heading h1").wait_for(timeout=25000)

    def tearDown(self):
        self.assertEqual(self.remote,[],"Unexpected remote network request")
        self.assertEqual(self.errors,[],"Unhandled JS error in index.html")
        self.context.close()
        self.browser.close()
        self.p.stop()

    def go_co(self):
        self.page.get_by_role("button",name="COs",exact=True).click()
        self.page.locator("#co-demo-role").wait_for(timeout=15000)

    def select_role(self,value):
        self.page.locator("#co-demo-role").select_option(value)

    def do(self,action):
        self.page.locator('[data-co-demo-action="'+action+'"]').click()

    def test_legacy_navigation_remains_and_new_tab_has_clear_synthetic_label(self):
        self.assertEqual(self.page.locator(".nav-ver").inner_text(),"v2.0 · MVP")
        labels=self.page.locator(".nav-tabs button").all_inner_texts()
        self.assertEqual(len(labels),4)
        self.assertTrue(any("Projetos" in t for t in labels))
        self.assertTrue(any("Relatorios" in t for t in labels))
        self.assertTrue(any("Ajustes" in t for t in labels))
        self.assertTrue(any("COs" in t for t in labels))
        self.go_co()
        self.assertIn("SIMULAÇÃO LOCAL",self.page.locator("#co-preview-disclaimer").inner_text())
        self.assertIn("SYNTHETIC",self.page.locator("#main").inner_text())
        self.assertEqual(self.page.locator("#co-demo-status").inner_text(),"Status: Rascunho do PM")
        self.page.get_by_role("button",name="Projetos",exact=True).click()
        self.page.locator(".projects-heading h1").wait_for()
        self.page.get_by_role("button",name="COs",exact=True).click()
        self.assertIn("SIMULAÇÃO LOCAL",self.page.locator("#co-preview-disclaimer").inner_text())

    def test_pm_client_sub_lifecycle_is_in_memory_and_no_cloud_write(self):
        self.page.evaluate("""async () => {
          await dbPutLocal('projects',{
            id:'immutable-demo-project',name:'SYNTHETIC legacy flooring',
            contractTotal:12000,client:{name:'Demo only'},createdAt:'2026-10-20'
          });
          await reload();
          window.__writesBefore=window.__agentWrites.length;
        }""")
        self.go_co()
        self.do("submit")
        self.select_role("client")
        self.assertIn("Aguardando decisão do cliente",self.page.locator("#co-demo-status").inner_text())
        self.do("approve")
        self.select_role("pm")
        self.do("activate")
        self.select_role("sub")
        self.assertNotIn("$3,500.00",self.page.locator("#main").inner_text())
        self.do("report")
        self.assertIn("50%",self.page.locator("#main").inner_text())
        self.select_role("pm")
        self.assertIn("Crédito reconhecido apenas neste CO (FICTÍCIO): $0.00",self.page.locator("#main").inner_text())
        self.do("validate")
        self.assertIn("$240.00",self.page.locator("#main").inner_text())
        state=self.page.evaluate("""async () => {
          const p=await dbGet('projects','immutable-demo-project');
          return {contractTotal:p.contractTotal,writeCount:window.__agentWrites.length,
           writeCountBefore:window.__writesBefore,history:S.coDemoState.history.length,
           payment:S.coDemoState.paymentAuthorized,existingProjects:S.projects.length};
        }""")
        self.assertEqual(state["contractTotal"],12000)
        self.assertEqual(state["writeCount"],state["writeCountBefore"])
        self.assertEqual(state["history"],6)
        self.assertFalse(state["payment"])
        self.assertGreaterEqual(state["existingProjects"],1)

    def test_client_cannot_see_sub_credit_and_sub_cannot_see_client_price(self):
        self.go_co()
        pm=self.page.locator("#main").inner_text()
        self.assertIn("$3,500.00",pm)
        self.assertIn("$800.00",pm)
        self.select_role("client")
        client=self.page.locator("#main").inner_text()
        self.assertIn("$3,500.00",client)
        self.assertNotIn("$800.00",client)
        self.assertNotIn("Crédito reconhecido",client)
        self.select_role("sub")
        sub=self.page.locator("#main").inner_text()
        self.assertNotIn("$3,500.00",sub)
        self.assertIn("$800.00",sub)
        self.assertIn("Pagamento autorizado: NÃO",sub)

    def test_isolated_staging_entry_never_transfers_current_project_id(self):
        self.go_co()
        self.assertTrue(self.page.locator("#co-open-staging").is_enabled())
        self.assertEqual(self.page.evaluate("""() => BrightScaleCODemo.pilotLink(location)"""),
                         self.origin+"/staging/pilot.html")
        self.page.evaluate("""() => {
          window.__newWindow=null;
          window.open=function(url,target,features){
            window.__newWindow={url,target,features};
          };
          S.currentProjectId='LOCAL-SYNTHETIC-PROJECT';
        }""")
        self.page.locator("#co-open-staging").click()
        opened=self.page.evaluate("window.__newWindow")
        self.assertEqual(opened["url"],self.origin+"/staging/pilot.html")
        self.assertEqual(opened["target"],"_blank")
        self.assertIn("noopener",opened["features"])
        self.assertNotIn("LOCAL-SYNTHETIC-PROJECT",opened["url"])

    def test_restart_discards_only_demo_history_and_keeps_existing_projects(self):
        self.go_co()
        self.do("submit")
        self.select_role("client")
        self.do("decline")
        self.assertIn("Recusado",self.page.locator("#co-demo-status").inner_text())
        self.page.get_by_role("button",name="Reiniciar simulação").click()
        self.assertEqual(self.page.locator("#co-demo-status").inner_text(),"Status: Rascunho do PM")
        self.assertEqual(self.page.evaluate("S.coDemoState.history.length"),1)
        self.assertEqual(self.page.evaluate("S.coDemoRole"),"pm")
        self.page.get_by_role("button",name="Projetos",exact=True).click()
        self.page.locator(".projects-heading h1").wait_for()


if __name__=="__main__":
    unittest.main()
