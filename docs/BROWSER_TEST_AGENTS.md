# BrightScale Tracker 2.0 — Agentes automatizados de teste

**Versão:** 1.0 — 2026-10-26 (Flórida; CI executada em 2026-10-27 UTC)  
**Status:** implementados na branch `fix/mvp-guardrails-2026-10-26`, PR [#2](https://github.com/libanius/BrightScale-Tracker/pull/2), **não incorporados nem publicados em produção**.  
**Execução Chromium verificada:** [GitHub Actions #40444617361](https://github.com/libanius/BrightScale-Tracker/actions/runs/40444617361) — **11/11 cenários passaram**; o teste Node dos guardrails permanece em workflow separado (7/7 aprovados).

## O que são esses agentes

São **agentes de teste automatizados por papéis**, escritos em Python + Playwright e executados em navegador Chromium real via GitHub Actions. Não são LLMs autônomas que navegam pelo site de produção nem substituem testes humanos.

| Agente | Testes | Comportamentos realmente exercitados no navegador |
| --- | ---: | --- |
| `PMAgent` | 4 | Abre a UI, cria projeto sintético, edita o progresso de uma tarefa preservando critério de aceite, impede anexar estimate a contrato existente, importa estimate como projeto novo |
| `ClientAgent` | 3 | Abre visão sintética do cliente, verifica que dados financeiros não são renderizados, recusa link revogado, exercita visão sintética de sub limitada ao seu escopo e somente leitura |
| `SecurityAgent` | 3 | Bloqueio da interface a membro não autorizado no mock, rejeição de links legados, bloqueio de chamadas externas durante o teste |
| `OfflineAgent` | 1 | Atualização de tarefa no IndexedDB sem rede; dados e critérios preservados ao recarregar o estado local |

## Onde estão

- [Código dos agentes](../tests/browser/test_agents.py)
- [Fixture sintética do Supabase / cloud layer](../tests/browser/fixtures/tracker-cloud.mock.js)
- [Workflow GitHub Actions](../.github/workflows/browser-agents.yml)
- [Testes Node de guardrails](../tests/guardrails.test.cjs)

## Como executam

Na branch/PR: o workflow **BrightScale browser testing agents** é disparado quando uma alteração abre/atualiza um Pull Request. Ele usa `ubuntu-24.04`, `playwright==1.56.0`, Chromium, quatro jobs independentes e relatórios nos logs da aba Actions.

Depois da incorporação em `main`, o workflow também será acionado em alterações da `main`, manualmente (`workflow_dispatch`) e de segunda a sexta às **09:00 UTC** (horário do servidor, não horário local de Florida). No calendário automático/manual haverá ainda um **read-only-public-health**: uma única leitura do HTML público `https://tracker.brightscalegroup.com/index.html` para checar HTTP 200 e marcação esperada, sem login e sem acesso a registros privados. **Esse teste público NÃO foi executado nesta rodada**, pois a execução foi de `pull_request`.

GitHub pode atrasar cron jobs, e manutenção/suspensão de Actions pode impedir execução; periodicidade não é garantia de entrega de alertas fora do GitHub.

## Limites e proteção

1. O Chromium executa a **aplicação real** (`index.html`, `dashboard.html` e operações IndexedDB) servida por HTTP local, mas intercepta `tracker-cloud.js` e o SDK Supabase, utilizando **sessões fictícias e dados fictícios**.
2. Toda tentativa de chamada de rede que não seja para o servidor local de teste (ou CDN substituída pelo mock) é bloqueada. O teste não pode criar clientes, contratos, gastos ou pagamentos em produção.
3. A simulação de compartilhamento **não prova** que `tracker-share` em produção aplica corretamente todos os filtros, nem certifica as políticas RLS no Supabase. **Login real do PM, cliente ou sub e persistência remota não foram testados.**
4. Segurança aqui cobre UI e isolamento do runner. Ela **não substitui** um pentest, auditoria RLS nem testes com credenciais de teste em staging.
5. O teste de modo offline valida gravação local, **não** reconciliação de conflito e sincronização real após reconexão.
6. Capturas de tela de falhas contêm apenas dados sintéticos. O workflow não usa `secrets` nem autenticação de cliente.
7. Recursos ainda **não implementados** (por exemplo sub reporta → PM valida → crédito oficial, Change Orders formais) **não foram simulados como funcionalidades prontas**.

## Regras para outro agente/IA

Quando um teste falhar:
- Consulte o job individual, encontre a falha e preserve os logs.
- Classifique como bug real, falha do fixture, erro de infraestrutura ou comportamento ainda não implementado.
- Corrija em branch/PR, execute novamente, registre resultado; **nunca altere projeto de produção apenas para fazer teste passar**.
- Atualize o checkpoint em [handoff canônico](SMART_REMODELING_HANDOFF_2026-10-26.md) com testes realmente executados e limites.
- Não alegue que passamos teste real de Supabase/roles com credenciais só porque Playwright passou com mock.

**Próxima evolução de testes:** ambiente de staging isolado e contas de teste distintas para PM, sub e cliente, sem dados de clientes reais. Somente depois disso adicionar cenários autenticados com validação de roles, RLS e sincronização ponta a ponta.

## Comandos para desenvolvedores

```bash
python -m pip install playwright==1.56.0
python -m playwright install chromium
python -m unittest discover -s tests/browser -p 'test_*.py' -v
node --test tests/guardrails.test.cjs
```

Em GitHub Actions, a instalação com dependências de sistema é feita no runner `ubuntu-24.04`, fixado após detectar incompatibilidade entre Playwright 1.56.0 e o `ubuntu-latest` (26.04) do runner inicial.
