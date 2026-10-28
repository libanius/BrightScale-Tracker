"""React workspace UI with synthetic SDK. Not real Auth or production data."""
import functools,http.server,threading,unittest
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*_args): pass
class Workspace(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
  cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start();cls.origin='http://127.0.0.1:'+str(cls.server.server_port)
 @classmethod
 def tearDownClass(cls): cls.server.shutdown();cls.server.server_close();cls.thread.join(timeout=5)
 def setUp(self):
  self.p=sync_playwright().start();self.browser=self.p.chromium.launch(channel='chrome',headless=True);self.context=self.browser.new_context(viewport={'width':390,'height':844});self.page=self.context.new_page();self.errors=[];self.external=[]
  self.page.on('pageerror',lambda e:self.errors.append(str(e)))
  def route(r):
   if r.request.url.startswith(self.origin):r.continue_()
   else:self.external.append(r.request.url);r.abort()
  self.context.route('**/*',route)
 def tearDown(self):
  self.assertEqual(self.errors,[]);self.assertEqual(self.external,[]);self.context.close();self.browser.close();self.p.stop()
 def enter(self,role):
  self.page.goto(self.origin+'/tests/browser/workspace-harness.html?role='+role)
  self.page.get_by_role('button',name='Conexão',exact=True).click()
  self.page.get_by_label('URL do Supabase de testes',exact=True).fill('https://synthetic-workspace.supabase.co')
  self.page.get_by_label('Chave publishable / anon',exact=True).fill('sb_publishable_SYNTHETIC_ONLY_01234567890123')
  self.page.get_by_role('button',name='Conectar',exact=True).click()
  self.page.get_by_role('button',name='Visão geral',exact=True).click()
  self.page.get_by_role('button',name='SYNTHETIC STAGING Flooring',exact=False).click()
  self.page.get_by_text('SYNTHETIC level surface acceptance',exact=True).wait_for(state='attached')
 def test_pm_observation_validation_and_events(self):
  self.enter('pm');self.page.locator('details.scope > summary').filter(has_text='SYNTHETIC Flooring').first.click()
  self.page.get_by_label('Percentual observado na vistoria',exact=True).fill('65')
  self.page.get_by_label('Observação',exact=True).fill('SYNTHETIC visual inspection')
  self.page.get_by_role('button',name='Registrar progresso da vistoria',exact=True).click()
  self.page.get_by_label('Justificativa da validação / ajuste',exact=True).fill('SYNTHETIC acceptance checked')
  self.page.get_by_label('Conferi os critérios de aceite e as evidências.',exact=True).check()
  self.page.get_by_role('button',name='Validar vistoria · sem gerar crédito',exact=True).click()
  self.page.get_by_text('Validada pelo PM',exact=True).wait_for()
  self.page.get_by_label('Descrição e motivo',exact=True).fill('SYNTHETIC delivery record')
  self.page.get_by_role('button',name='Registrar evento',exact=True).click()
  self.page.get_by_text('SYNTHETIC delivery record',exact=True).wait_for()
  self.assertEqual(self.page.evaluate('document.documentElement.scrollWidth <= innerWidth'),True)
 def test_client_never_requests_internal_finances(self):
  self.enter('client');body=self.page.locator('main').inner_text();self.assertIn('$10,000.50',body);self.assertNotIn('Crédito reconhecido',body);self.assertNotIn('Subcontratos',body)
  tables=self.page.evaluate('window.__pilotQueried');self.assertNotIn('pilot_workspace_scope_config',tables);self.assertNotIn('pilot_scope_terms',tables)
 def test_sub_never_requests_client_contract(self):
  self.enter('sub');body=self.page.locator('main').inner_text();self.assertNotIn('$10,000.50',body);self.assertNotIn('Contrato cliente',body);self.assertIn('Crédito reconhecido',body)
  self.assertNotIn('pilot_workspace_client_terms',self.page.evaluate('window.__pilotQueried'))
 def test_mobile_wizard_preserves_draft_when_opening_directory(self):
  self.page.goto(self.origin+'/tests/browser/workspace-harness.html')
  self.page.get_by_role('button',name='Novo projeto',exact=True).click();self.page.get_by_role('button',name='3. Projeto',exact=True).click();self.page.get_by_label('Nome do projeto',exact=True).fill('SYNTHETIC draft')
  self.page.get_by_role('button',name='Subcontractors',exact=True).click();self.page.get_by_role('button',name='Novo projeto',exact=True).click()
  self.assertEqual(self.page.get_by_label('Nome do projeto',exact=True).input_value(),'SYNTHETIC draft')
  self.assertTrue(self.page.evaluate('document.documentElement.scrollWidth <= innerWidth'))

 def test_document_autofills_without_requiring_smart_answers(self):
  self.enter('pm');self.page.get_by_role('button',name='Novo projeto',exact=True).click()
  self.page.locator('input[type=file]').set_input_files({'name':'synthetic.txt','mimeType':'text/plain','buffer':b'SYNTHETIC approved estimate with flooring and client information'})
  self.page.get_by_text('Analisando documento e preenchendo',exact=False).wait_for()
  self.page.get_by_text('Revise o contexto extraído',exact=True).wait_for()
  self.assertEqual(self.page.get_by_label('Scope · limites e exclusões do serviço',exact=True).input_value(),'Instalar piso conforme documento')
  self.assertEqual(self.page.get_by_label('Alignment · acesso, materiais, licenças e restrições críticas',exact=True).input_value(),'')
  self.page.get_by_text('Confirmar acesso ao local',exact=True).wait_for()
  self.assertEqual(self.page.evaluate('window.__analysisCalls[0].questions'),{})
  self.page.get_by_role('button',name='Continuar com os dados preenchidos',exact=True).click()
  self.assertEqual(self.page.get_by_label('Nome do projeto',exact=True).input_value(),'SYNTHETIC extracted project')
  self.assertEqual(self.page.get_by_label('Cliente',exact=True).input_value(),'SYNTHETIC extracted client')
  self.assertEqual(self.page.get_by_label('Valor do contrato (USD)',exact=True).input_value(),'1234.56')
 def test_analysis_failure_keeps_text_for_retry(self):
  self.enter('pm');self.page.get_by_role('button',name='Novo projeto',exact=True).click()
  self.page.locator('input[type=file]').set_input_files({'name':'synthetic.txt','mimeType':'text/plain','buffer':b'FAIL_ANALYSIS synthetic estimate'})
  self.page.get_by_text('SYNTHETIC analysis failed',exact=True).wait_for()
  self.assertIn('FAIL_ANALYSIS',self.page.get_by_label('Texto extraído · confira antes de analisar',exact=True).input_value())
  self.assertTrue(self.page.get_by_role('button',name='Analisar e preencher automaticamente',exact=True).is_enabled())
