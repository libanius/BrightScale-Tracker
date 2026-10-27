"""Standalone CO demo mobile smoke: no auth, no IndexedDB, no network.
This is a different entry from the legacy index.html and must keep working
even when iPhone browsers deny/close their local IndexedDB connection.
"""
import functools
import http.server
import threading
import unittest
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*_args):
        pass


class BrowserStandaloneCO(unittest.TestCase):
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
            viewport={"width":390,"height":844},device_scale_factor=3,
            is_mobile=True,has_touch=True,service_workers="block")
        self.page=self.context.new_page()
        self.errors=[]
        self.external=[]
        self.requests=[]

        self.context.add_init_script("""(() => {
          // Fail if the page ever tries to open a local database or storage.
          window.__testStorageReads=[];
          for (const name of ['indexedDB','localStorage','sessionStorage','caches']) {
            try {
              Object.defineProperty(window,name,{
                configurable:true,
                get(){window.__testStorageReads.push(name);throw new Error(name+' unavailable');}
              });
            } catch(e) {window.__testStorageReads.push('override-failed:'+name);}
          }
        })()""")

        def route(request):
            url=request.request.url
            self.requests.append(url)
            if url.startswith(self.origin) and urlsplit(url).path in ["/co-demo.html","/co-preview.js"]:
                request.continue_()
            else:
                self.external.append(url)
                request.abort("blockedbyclient")
        self.context.route("**/*",route)
        self.page.on("pageerror",lambda err:self.errors.append(str(err)))
        self.page.goto(self.origin+"/co-demo.html",wait_until="load")
        self.page.get_by_role("heading",name="Conheça o novo fluxo de COs").wait_for()

    def tearDown(self):
        self.assertEqual(self.external,[],"Unexpected network or legacy asset request")
        self.assertEqual(self.errors,[],"Browser JavaScript error")
        self.assertEqual(self.page.evaluate("window.__testStorageReads"),[],
                         "The demo touched IndexedDB/storage")
        self.assertLessEqual(self.page.evaluate("document.documentElement.scrollWidth"),
                             self.page.evaluate("window.innerWidth")+1,
                             "Unexpected sideways iPhone scrolling")
        self.context.close()
        self.browser.close()
        self.p.stop()

    def role(self,r):
        self.page.locator("[data-role='"+r+"']").click()

    def action(self,name):
        self.page.locator("[data-action='"+name+"']").click()

    def test_standalone_loads_without_any_legacy_app_or_local_database(self):
        self.assertIn("SEM LOGIN",self.page.locator("#demo-notice").inner_text())
        self.assertIn("Bathroom Upgrade",self.page.locator("#demo-main").inner_text())
        self.assertEqual(self.page.locator("#status-chip").inner_text(),"Rascunho")
        self.assertTrue(self.page.locator("[data-action='submit']").is_visible())
        self.assertEqual(len(self.requests),2,"HTML plus standalone model JS only")

    def test_full_mobile_lifecycle_with_role_switch_and_credit_isolated(self):
        self.action("submit")
        self.assertEqual(self.page.locator("#status-chip").inner_text(),"Aguardando cliente")
        self.role("client")
        self.action("approve")
        self.role("pm")
        self.action("activate")
        self.role("sub")
        self.action("report")
        self.assertIn("Crédito reconhecido · FICTÍCIO",self.page.locator("#figures").inner_text())
        self.assertNotIn("$3,500.00",self.page.locator("#figures").inner_text())
        self.role("pm")
        self.assertIn("$0.00",self.page.locator("#figures").inner_text())
        self.action("validate")
        self.assertIn("$240.00",self.page.locator("#figures").inner_text())
        self.assertIn("50%",self.page.locator("#validated-label").inner_text())
        self.assertEqual(self.page.locator("#history .history-item").count(),6)
        self.assertIn("NÃO",self.page.locator("#figures").inner_text())

    def test_privacy_and_rejection_and_reset(self):
        self.role("pm")
        pm=self.page.locator("#figures").inner_text()
        self.assertIn("$3,500.00",pm)
        self.assertIn("$800.00",pm)
        self.role("client")
        client=self.page.locator("#figures").inner_text()
        self.assertIn("$3,500.00",client)
        self.assertNotIn("$800.00",client)
        self.assertNotIn("Crédito reconhecido",client)
        self.role("sub")
        sub=self.page.locator("#figures").inner_text()
        self.assertIn("$800.00",sub)
        self.assertNotIn("$3,500.00",sub)
        self.role("pm")
        self.action("submit")
        self.role("client")
        self.action("decline")
        self.assertEqual(self.page.locator("#status-chip").inner_text(),"Recusado")
        self.assertFalse(self.page.locator("[data-action='activate']").count())
        self.page.get_by_role("button",name="Reiniciar demonstração").click()
        self.assertEqual(self.page.locator("#status-chip").inner_text(),"Rascunho")
        self.assertEqual(self.page.locator("#history .history-item").count(),1)

    def test_mobile_bottom_tabs_scroll_without_login_or_sync(self):
        self.page.get_by_role("button",name="Auditoria").click()
        self.assertTrue(self.page.locator("#audit-heading").is_visible())
        self.page.get_by_role("button",name="Etapas").click()
        self.assertTrue(self.page.locator("#steps-heading").is_visible())
        self.page.get_by_role("button",name="Visão geral").click()
        self.assertTrue(self.page.locator("#project-heading").is_visible())


if __name__=="__main__":
    unittest.main()
