# Fase 4 — Supabase staging isolado e teste de autorização por papéis

**Estado (27/10/2026):** infraestrutura SQL e testes em CI preparados na [PR #5](https://github.com/libanius/BrightScale-Tracker/pull/5), **sem implantação no Supabase**.

## Por que ainda não foi criado um projeto Supabase?

O conector mostrou **uma organização**, associada à conta `paulolibanioneto@gmail.com`, no plano Free, com **dois projetos já ativos** (Abre-USA e brightscale-scanner). O serviço cotou **US$ 0/mês** para novo projeto nessa organização, mas ainda é necessário o usuário indicar formalmente a organização de destino; podem existir limites de projetos ativos no plano. **Nunca reutilizar brightscale-scanner ou Abre-USA como staging para contornar limite** e nunca pausar projeto vivo sem autorização explícita.

Quando a organização e o limite forem confirmados, criar projeto `BrightScale Tracker STAGING` em `us-east-1` (não pagar automaticamente se a cotação mudar).

## Código do estágio

- `staging/sql/001_progress_rls.sql`: modelo de 10 tabelas `pilot_*`, separando projetos, membros, atribuições, tarefas, relatórios, progresso validado, termos financeiros de subs, créditos e auditoria.
- `staging/tests/bootstrap_local_pg.sql`: **apenas para o PostgreSQL descartável** da CI; cria role `authenticated` e shim de `auth.uid()`. **Nunca aplicar no Supabase real!**
- `staging/tests/rls_smoke.sql`: simula JWT subject de quatro identidades fictícias no PostgreSQL CI, incluindo tentativas proibidas e revogação de membership.
- `.github/workflows/staging-rls.yml`: CI automático PostgreSQL 17 local via GitHub Actions; não usa chaves ou acesso do Supabase.

**IMPORTANTE:** o SQL `staging/sql/001_progress_rls.sql` contém comandos DDL e usa schema `public`. Só pode rodar em **projeto Supabase novo, vazio e designado para staging**. É explicitamente proibido rodá-lo nos dois projetos atuais. O `public` do projeto de produção jamais deve ser modificado. Os nomes têm prefixo `pilot_` exclusivamente para ensaio.

## Fluxo mínimo e acesso

- **PM:** cria projeto, cadastra subs/clientes do projeto, escopos, atribuições, tarefas e termos do sub (não há contratos reais). Somente PM pode aprovar ou rejeitar relatório.
- **Sub:** após integrar Auth real e atribuição, vê apenas suas tarefas e seu valor de subcontrato/credit ledger, pode registrar porcentagens e observações; não vê valores do cliente, outras equipes ou o histórico privado do PM.
- **Cliente:** somente os projetos dos quais é membro, tarefas e porcentagens **validadas**; não vê reports pendentes, custo de subs, ledger ou auditoria.
- **Outsider:** não vê nenhum dado.
- **Revogação:** remove visibilidade de relatórios/créditos e tarefas ao retirar membership do sub, sem apagar eventos históricos.

Há políticas RLS reais com `auth.uid()`, permissões de INSERT coluna a coluna para evitar falsificação de autor e timestamps, e RPC transacional `pilot_review_report` que verifica no **servidor** se o usuário é PM. Não há escrita direta no ledger nem atualização do progresso validado por outro papel.

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
