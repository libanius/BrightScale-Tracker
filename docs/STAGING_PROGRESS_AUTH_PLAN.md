# Fase 4 — Supabase staging isolado e teste de autorização por papéis

**Estado (27/10/2026):** infraestrutura, portal e testes de segurança em [PR #5](https://github.com/libanius/BrightScale-Tracker/pull/5). [CI #40560963693](https://github.com/libanius/BrightScale-Tracker/actions/runs/40560963693) **PASS: PostgreSQL 17 + RLS, 7/7 Node, 4/4 Chrome, requisições HTTP com JWT assinado/PostgREST**. Este é um servidor de teste descartável, **NÃO é Supabase Auth real**. **Sem projeto remoto de staging, sem deploy e sem alteração de bancos de produção**.

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
2. Aplicar somente o arquivo `staging/sql/001_progress_rls.sql` no novo projeto, após revisão de RLS; **NUNCA** executar o arquivo `staging/tests/bootstrap_local_pg.sql` no Supabase real.
3. Hospedar o branch em preview HTTPS isolado ou executar `python -m http.server 8765` **somente para desenvolvimento local** e abrir `http://localhost:8765/staging/pilot.html`.
4. Na tela inicial, fornecer URL e **publishable/anon key** do projeto isolado. Não usar `service_role`, secret keys ou tokens de administrador. O formulário armazena somente URL e publishable key no navegador local; tokens de sessão são geridos pelo Supabase JS Auth.
5. Entrar com conta fictícia PM e criar um projeto; entrar com contas fictícias Sub e Cliente em perfis separados para obter seus UUIDs; voltar ao PM para cadastrar membership, atribuição e tarefas; verificar os fluxos de reporte/aprovação e negativas com JWT reais.

**Pendências antes do uso real:** testar Auth/JWT e RLS no Supabase verdadeiro; ajustar onboarding e auditabilidade de reassignment; escopo/termos de sub são criados em duas chamadas (falha pode deixar escopo incompleto); proibir múltiplas contas PM fora de tenant corporativo, implementar prova de congelamento da baseline e auditoria de revisões/substituições (decisões 29, 31, 37–39). **É uma tela de teste controlado, não um release.**

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

O sistema **não tem workflow de pagamento**, alterações de baseline por Change Order, assinaturas ou reconciliação offline para essa fase. Não inserir dados reais. A baseline do modelo é apenas registro inicial sem interface para aprovar congelamento contratual completo; não declarar que a governança da baseline foi totalmente entregue.

## Etapas após liberar o staging

1. Confirmar organização e elegibilidade; provisionar Supabase vazio e **verificar project ID**.
2. Rever/aplicar **somente** `staging/sql/001_progress_rls.sql` nesse ID; validar catálogo, RLS e advisors.
3. Configurar Auth e criar contas fictícias com autorização do usuário. Nunca publicar senhas/tokens no GitHub.
4. Executar testes reais Data API/RPC positivos/negativos com contas PM, sub, cliente, usuário externo.
5. Conectar UI em preview/staging, não no Tracker de produção. Somente após resultados auditáveis propor integração.

## Como reproduzir os testes em CI local

```bash
psql -v ON_ERROR_STOP=1 -f staging/tests/bootstrap_local_pg.sql
psql -v ON_ERROR_STOP=1 -f staging/sql/001_progress_rls.sql
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
