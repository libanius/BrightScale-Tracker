# Fase 4 — Supabase staging isolado e teste de autorização por papéis

**Estado (27/10/2026):** infraestrutura, portal e testes de segurança em [PR #5](https://github.com/libanius/BrightScale-Tracker/pull/5). [CI #40581197075](https://github.com/libanius/BrightScale-Tracker/actions/runs/40581197075) **PASS: PostgreSQL 17 + RLS + baseline congelada, 8/8 Node, 6/6 Chrome, requisições HTTP com JWT assinado/PostgREST**. Este é um servidor de teste descartável, **NÃO é Supabase Auth real**. **Sem projeto remoto de staging, sem deploy e sem alteração de bancos de produção**.

## Incremento 3 — Change Orders independentes (PR #5, branch sem deploy)

Foi implementado, em 2026-10-27, o fluxo inicial de adicional à baseline original, usando [`staging/sql/003_change_orders.sql`](../staging/sql/003_change_orders.sql) **somente para ambiente descartável/staging futuro**. Aplicar **depois de 001 + 002**. Adiciona **9 tabelas `pilot_co_*`/`pilot_change_orders` com RLS**, sem alterar projeto real ou `tracker.*` existente.

**Lifecycle controlado pelo banco:**

1. PM cria um CO **rascunho** com valor do cliente; a baseline original deve estar congelada.
2. PM inclui um ou mais escopos adicionais, cada um com sub designado e preço de sub privado, e tarefas com pesos **até 100%** por escopo.
3. PM só consegue **enviar** para análise do cliente se todos os escopos têm exatamente 100% dos pesos. Envio congela termos e catálogo — não existe edição silenciosa posterior.
4. Cliente autenticado, com associação vigente, pode **aprovar ou recusar com motivo**; o portal registra a decisão e timestamp. Uma aprovação de portal de testes **não é uma assinatura eletrônica juridicamente verificada**.
5. Somente PM **ativa** um CO aprovado; recusa nunca ativa, silêncio nunca equivale a aprovação.
6. Após ativado, sub designado pode enviar progresso **somente do seu escopo do adicional**; PM valida via RPC separada, gerando `pilot_co_credit_events` (ledger próprio, idempotência e teto por subcontrato do escopo). Nenhum valor é pago automaticamente.

**RLS e privacidade:** `pilot_co_client_terms` é acessível ao cliente e PM, nunca ao sub; `pilot_co_sub_terms`, reportes/creditos internos são acessíveis apenas ao PM e sub autorizado, nunca ao cliente. Eventos de auditoria da mudança e relatórios ficam privados do PM. Usuário externo ou membership revogada não vê o projeto/CO.

**Interface:** [`staging/pilot-ui.js`](../staging/pilot-ui.js) apresenta PM create/draft/submit/activate, cliente aprovar/recusar e sub reportar CO ativo, com porcentagem e crédito validados separadamente. [`staging/pilot-gateway.js`](../staging/pilot-gateway.js) não envia papel/autoridade escolhidos pelo cliente, apenas chamadas PostgREST/RPC autorizadas por JWT + RLS. Todas as ações usam **dados sintéticos** até validação real.

**Testes:** [`tests/pilot-postgrest.test.cjs`](../tests/pilot-postgrest.test.cjs) cobre JWT HTTP assinado, fluxo completo de aprovação, preços separados, bloqueios por papel, recusa, vedação de alterações retroativas, progresso/crédito independente, ledger original intocado e revogação. [`tests/staging-gateway.test.cjs`](../tests/staging-gateway.test.cjs) confere chamadas e projeções. [`tests/browser/test_staging_portal.py`](../tests/browser/test_staging_portal.py) com Chrome confirma visualizações PM/sub/cliente e que o cliente não consulta informações internas. O workflow garante **19 tabelas com RLS** (10 originais + 9 do CO).

**Limites que continuam pendentes:** assinatura digital formal/assinatura de cliente com prova jurídica; notificações e cópias por email; precificação/validação de impacto de prazo contratual; consentimentos de subs afetados; versões de negociações; anexos fotográficos; suporte a pagamento real; infraestrutura Auth real; políticas de retenção/remoção (decisões 31–39). Nem a ativação nem o aceite no piloto representam pagamento. Substituição, penalidade e responsabilidade seguem fluxos auditados futuros, não ações automáticas.

## Incremento 2 — baseline original congelada e report só após PM (implementado em branch)

A partir de **2026-10-27**, o código de staging do PR #5 ganhou:

- [`staging/sql/002_baseline_freeze.sql`](../staging/sql/002_baseline_freeze.sql): colunas de auditoria da baseline, função `pilot_freeze_baseline` permitida **exclusivamente ao PM proprietário**, e gatilhos que bloqueiam inserção de novos escopos, tarefas e termos no contrato original após a aprovação. Uma função usa lock de projeto para evitar inserção concorrente durante o congelamento.
- A baseline só pode ser aprovada com **pelo menos um escopo**, termos de subcontrato e **soma de tarefas = 100% por escopo**. Um plano incompleto não pode ser congelado.
- A política de reporte de progresso da equipe exige baseline congelada. `baseline_frozen_at` e `baseline_frozen_by` são definidos pelo servidor, não por um formulário. O evento `baseline_frozen` é anexado à auditoria e não há cobrança/pagamento implícito.
- [`staging/pilot-gateway.js`](../staging/pilot-gateway.js) expõe apenas `freezeBaseline(projectId)` via RPC. [`staging/pilot-ui.js`](../staging/pilot-ui.js) mostra ao PM se a baseline está rascunho ou congelada; o botão de aprovação exige catálogo completo e confirmação explícita. Após o congelamento, remove ações de inserção da baseline original; sub vê bloqueio de reporte enquanto rascunho.
- Testes adicionados ao [`staging/tests/rls_smoke.sql`](../staging/tests/rls_smoke.sql), [`tests/pilot-postgrest.test.cjs`](../tests/pilot-postgrest.test.cjs), [`tests/staging-gateway.test.cjs`](../tests/staging-gateway.test.cjs) e [`tests/browser/test_staging_portal.py`](../tests/browser/test_staging_portal.py).

**Evidência:** [GitHub Actions 40581197075](https://github.com/libanius/BrightScale-Tracker/actions/runs/40581197075) **PASS**: PostgreSQL/RLS com chamadas HTTP assinadas, 8/8 Node e 6/6 Chrome. São identidades/valores fictícios em ambiente descartável. Nenhum Supabase de produção foi acessado; nenhuma senha real foi usada.

**Limites:** isso congela a **baseline original do piloto**, mas **não entrega ainda** congelamento contratual completo, COs independentes, assinatura cliente, gates de licença/inspeção, remoção legal de dados ou controle de versões de revisões operacionais. Atribuição de equipe continua operacional e exigirá fluxo auditado de substituição (decisões 37–39). Não enviar contratos reais para este piloto.

## Por que ainda não foi criado um projeto Supabase?

A conta Supabase conectada possui **uma organização no plano Free** com **dois projetos ACTIVE_HEALTHY**: Abre-USA e brightscale-scanner (consulta realizada em 2026-10-27). A cotação genérica do conector retorna **US$ 0/mês**, mas a [documentação oficial de cobrança do Supabase](https://supabase.com/docs/guides/platform/billing-on-supabase) confirma que o Free permite **somente dois projetos ativos no total**, inclusive entre organizações da mesma conta com papel Owner/Admin. **A cota está ocupada**, portanto não criar um terceiro na organização, nem tentar driblar a limitação transferindo projetos entre organizações.

**Decisão operacional:** manter ambos projetos ativos e isolados. Não pausar/excluir/migrar nenhum, não atualizar o plano ou incorrer em custos sem autorização explícita. O próximo projeto remoto separado pode ser criado apenas quando houver uma vaga legítima ou plano pago aprovado com cotação atual e escolha expressa da organização; se possível, usar `us-east-1`. Até lá, a alternativa segura é o teste com banco + API descartáveis no GitHub Actions.

## UI autenticada preparada em branch (não publicada)

O PR #5 agora contém uma **interface de staging real**, distinta do protótipo de papéis fictícios do PR #4:

- [`staging/pilot.html`](../staging/pilot.html): portal mobile-first, identificação de STAGING, bloqueio dos dois projetos ativos conhecidos e instruções para contas fictícias.
- [`staging/pilot-ui.js`](../staging/pilot-ui.js): e-mail OTP do Supabase Auth, PM cria projetos/membros/escopos/tarefas e valida/rejeita, sub reporta suas tarefas e vê créditos separados; cliente vê apenas avanço validado.
- [`staging/pilot-gateway.js`](../staging/pilot-gateway.js): cliente da API PostgREST/RPC do staging; papel calculado por `auth.getUser` + propriedade/membership. A autoridade é SEMPRE o RLS do banco, nunca um botão que simula papel.
- [`tests/staging-gateway.test.cjs`](../tests/staging-gateway.test.cjs): verifica que visão cliente **nem consulta** tabelas financeiras/relatórios e que aprovações vão somente ao RPC do servidor, sem parâmetros forjáveis de `role` ou pagamento.
- [`tests/browser/test_staging_portal.py`](../tests/browser/test_staging_portal.py): Chrome testa PM/sub/cliente com SDK e identidade sintéticos e bloqueio do projeto Supabase de produção conhecido.
- [`tests/browser/fixtures/staging-supabase.mock.js`](../tests/browser/fixtures/staging-supabase.mock.js): camada de autenticação fictícia **exclusiva do runner CI**, nunca de produção.

**Importante:** o código do portal não foi publicado na URL do Tracker, e ainda **não houve login real no Supabase de staging**. Código pronto para conectar não equivale a ambiente provisionado.

### Como rodar após aprovar/criar o projeto staging

1. Criar projeto Supabase **novo, vazio e separado**. Configurar Auth Email (OTP) e URL(s) de redirecionamento para a origem de teste; **não usar nenhum projeto ativo**.
2. Aplicar, nessa ordem, os arquivos `staging/sql/001_progress_rls.sql`, `staging/sql/002_baseline_freeze.sql` e `staging/sql/003_change_orders.sql` no novo projeto vazio, após revisão de RLS; **NUNCA** executar o arquivo `staging/tests/bootstrap_local_pg.sql` no Supabase real.
3. Hospedar o branch em preview HTTPS isolado ou executar `python -m http.server 8765` **somente para desenvolvimento local** e abrir `http://localhost:8765/staging/pilot.html`.
4. Na tela inicial, fornecer URL e **publishable/anon key** do projeto isolado. Não usar `service_role`, secret keys ou tokens de administrador. O formulário armazena somente URL e publishable key no navegador local; tokens de sessão são geridos pelo Supabase JS Auth.
5. Entrar com conta fictícia PM e criar um projeto; cadastrar membership e escopos, **completar 100% dos pesos por escopo, congelar a baseline pelo PM**, e depois testar sub reporta / PM valida / cliente vê somente progresso aprovado. Utilizar três identidades fictícias e confirmar negativas com JWT reais.

**Pendências antes do uso real:** testar Auth/JWT e RLS no Supabase verdadeiro; ajustar onboarding e auditabilidade de reassignment; escopo/termos de sub são criados em duas chamadas (falha pode deixar escopo incompleto); proibir múltiplas contas PM fora de tenant corporativo, auditar o freeze da baseline com Supabase Auth real e implementar auditoria de revisões/substituições (decisões 29, 31, 37–39). **É uma tela de teste controlado, não um release.**

## Código do estágio

- `staging/sql/001_progress_rls.sql`: modelo de 10 tabelas `pilot_*`, separando projetos, membros, atribuições, tarefas, relatórios, progresso validado, termos financeiros de subs, créditos e auditoria.
- `staging/tests/bootstrap_local_pg.sql`: **apenas para o PostgreSQL descartável** da CI; cria role `authenticated` e shim de `auth.uid()`. **Nunca aplicar no Supabase real!**
- `staging/tests/rls_smoke.sql`: simula JWT subject de quatro identidades fictícias no PostgreSQL CI, incluindo tentativas proibidas e revogação de membership.
- O banco impede peso total de tarefas acima de **100% por scope** e bloqueia reconhecimentos de crédito acima do **subcontrato** (proteção contra over-credit e arredondamento).
- `.github/workflows/staging-rls.yml`: CI automático PostgreSQL 17 local via GitHub Actions; não usa chaves ou acesso do Supabase.

**IMPORTANTE:** o SQL `staging/sql/001_progress_rls.sql` contém comandos DDL e usa schema `public`. Só pode rodar em **projeto Supabase novo, vazio e designado para staging**. É explicitamente proibido rodá-lo nos dois projetos atuais. O `public` do projeto de produção jamais deve ser modificado. Os nomes têm prefixo `pilot_` exclusivamente para ensaio.

## Fluxo mínimo e acesso

- **PM:** cria projeto, cadastra subs/clientes do projeto, escopos, atribuições, tarefas e termos do sub (não há contratos reais). Somente PM pode aprovar ou rejeitar relatório.
- **Sub:** após integrar Auth real e atribuição, vê apenas suas tarefas e seu valor de subcontrato/credit ledger, pode registrar porcentagens e observações; não vê valores do cliente, outras equipes ou o histórico privado do PM.
- **Cliente:** somente os projetos dos quais é membro, tarefas e porcentagens **validadas**; não vê reports pendentes, custo de subs, ledger ou auditoria.
- **Outsider:** não vê nenhum dado.
- **Revogação:** remove visibilidade de relatórios/créditos e tarefas ao retirar membership do sub, sem apagar eventos históricos.

Há políticas RLS reais com `auth.uid()`, permissões de INSERT coluna a coluna para evitar falsificação de autor e timestamps, e RPC transacional `pilot_review_report` que verifica no **servidor** se o usuário é PM. Não há escrita direta no ledger nem atualização do progresso validado por outro papel.

## Testes HTTP autenticados por JWT no ambiente descartável

A partir de 2026-10-27, além da simulação SQL por `SET ROLE`, o workflow inicia uma **API PostgREST 14.17** em container temporário, com PostgreSQL 17. O endpoint recebe JWTs HS256 **assinados somente com segredo fictício do runner**, usa `role=authenticated` e `sub` fictícios, e executa as mesmas funções/RLS que o portal irá usar.

- [`staging/tests/bootstrap_postgrest.sql`](../staging/tests/bootstrap_postgrest.sql): cria credencial de **teste exclusivamente descartável**; NUNCA aplicar no Supabase.
- [`tests/pilot-postgrest.test.cjs`](../tests/pilot-postgrest.test.cjs): usa `fetch()` real, assinaturas JWT Node `crypto` e a API, cobrindo assinatura alterada rejeitada, criação de projeto/escope pelo PM, report do sub, tentativa de validação sub/cliente negada, privacidade do cliente, aprovação PM e crédito 57.600 centavos fictícios, duplicidade recusada, e revogação.
- **Regressões encontradas por integração HTTP:** a política original `pilot_scopes_read` fazia self-lookup de um escopo ainda não visível em `INSERT ... RETURNING` e retornava 403 mesmo ao PM autorizado. Corrigido o predicado para usar `is_pm(project_id)` diretamente para o proprietário, mantendo as restrições RLS para os demais. Também houve ajustes em `auth.uid()` mock para compreender o JSON JWT do PostgREST.
- **Regra financeira adicionada:** revisões do PM são serializadas por scope com `pg_advisory_xact_lock` antes da soma dos créditos; um caso de arredondamento (1 cent, duas tarefas 50/50) deve recusar a segunda aprovação em vez de reconhecer 2 centavos de crédito.
- Evidência verificada: [CI #40560963693](https://github.com/libanius/BrightScale-Tracker/actions/runs/40560963693) **PASS** nos três jobs, inclusive HTTP com JWT assinado.

**Limite:** JWT de teste assinado por uma chave sintética **NÃO é login Supabase Auth real**. A API PostgREST temporária não possui GoTrue, e-mail OTP, refresh tokens de usuários ou sessão real. Nenhum segredo verdadeiro ou dado de obra circulou nesses testes.

## Resultados comprovados no PostgreSQL descartável

O workflow compilou a migração, verificou as **10 tabelas com RLS habilitado** e concluiu sem erros a execução de `staging/tests/rls_smoke.sql`. Os cenários exercitaram:

- PM cria projeto e escopo fictícios, cadastra membros e valida um relatório;
- sub vê somente tarefas/valores do próprio escopo e só envia reporte pendente;
- cliente vê tarefas e progresso **já validado**, sem crédito, notas do sub ou termos financeiros;
- usuário externo e papel `anon` têm acesso negado;
- relatório 40% aprovado gerou **57.600 centavos fictícios** no ledger e eventos de auditoria;
- não foi permitida segunda aprovação, falsificação de autoria/horário, escrita direta no crédito ou mutação contratual;
- revogar a associação do sub retirou visibilidade das tarefas, termos e créditos.

Evidência: [execução CI aprovada](https://github.com/libanius/BrightScale-Tracker/actions/runs/40506790356). São testes reais de políticas PostgreSQL, porém a identidade foi **simulada** com JWT claim em ambiente descartável. **Não equivale** a testar Auth Supabase real.

## Limites claros desta fase

**Teste de SQL em PostgreSQL com JWT simulado não é teste de login real Supabase.** Depois de provisionar staging, devemos cadastrar três identidades fictícias com Auth real e verificar o JWT em chamadas client-side. Não informar testes de identidade como realizados antes disso.

A função de aprovação `SECURITY DEFINER` existe especificamente para transação atômica, com `auth.uid()` obrigatório, checagem de propriedade do projeto e `search_path` explícito. Deve passar por revisão independente de segurança antes de uso fora do staging.

O sistema **não tem workflow de pagamento**, alterações de baseline por Change Order, assinaturas ou reconciliação offline para essa fase. Não inserir dados reais. O congelamento da baseline **original do piloto** já existe em código e CI; não declarar que o congelamento contratual definitivo, o Change Order ou a validação jurídica do contrato foram entregues.

## Etapas após liberar o staging

1. Confirmar organização e elegibilidade; provisionar Supabase vazio e **verificar project ID**.
2. Rever/aplicar **somente** `staging/sql/001_progress_rls.sql`, `staging/sql/002_baseline_freeze.sql` e `staging/sql/003_change_orders.sql` nessa ordem e nesse ID; validar catálogo, RLS e advisors.
3. Configurar Auth e criar contas fictícias com autorização do usuário. Nunca publicar senhas/tokens no GitHub.
4. Executar testes reais Data API/RPC positivos/negativos com contas PM, sub, cliente, usuário externo.
5. Conectar UI em preview/staging, não no Tracker de produção. Somente após resultados auditáveis propor integração.

## Como reproduzir os testes em CI local

```bash
psql -v ON_ERROR_STOP=1 -f staging/tests/bootstrap_local_pg.sql
psql -v ON_ERROR_STOP=1 -f staging/sql/001_progress_rls.sql
psql -v ON_ERROR_STOP=1 -f staging/sql/002_baseline_freeze.sql
psql -v ON_ERROR_STOP=1 -f staging/sql/003_change_orders.sql
psql -v ON_ERROR_STOP=1 -f staging/tests/rls_smoke.sql
```

Esses comandos requerem **PostgreSQL 17 descartável**; não apontar `PGHOST`/credenciais a Supabase! O bootstrap cria roles de teste e imitação `auth.uid()` e é destrutivo para a semântica de segurança se executado sobre banco real.

## Critério de continuidade

Atualizar o [handoff canônico](SMART_REMODELING_HANDOFF_2026-10-26.md) após cada verificação, distinguindo:
- `DESIGNED` + `CI-TESTED` (sem autenticação real);
- `STAGING-DEPLOYED` somente após aplicar DDL em projeto separado;
- `AUTH-TESTED` somente após requisições com contas reais fictícias;
- `FIELD-TESTED` somente após uma obra real.

**A PR #5 deve permanecer rascunho até completar auditoria de acesso.**
