# Incremento 1 — demonstração de progresso, validação PM e crédito

**Status:** implementado como **protótipo isolado**, sem banco de dados/contas reais; aguarda testes CI e revisão PR.  
**Data:** 2026-10-27.  
**Decisões:** 5, 6, 7, 8, 9, 10, 18, 23, 29, 31 e continuidade conforme [handoff canônico](SMART_REMODELING_HANDOFF_2026-10-26.md).

## Onde testar

- [Abrir a demonstração HTML](../prototype/progress-review.html), servido em endereço HTTPS do **preview da branch** quando o provedor gerar preview. O arquivo ainda **não está incorporado em produção**.
- Código de regras: [prototype/progress-review.js](../prototype/progress-review.js).
- Testes de regras: [tests/progress-review.test.cjs](../tests/progress-review.test.cjs).
- Testes de navegador: [tests/browser/test_progress_demo.py](../tests/browser/test_progress_demo.py).
- CI: [.github/workflows/progress-mvp-demo.yml](../.github/workflows/progress-mvp-demo.yml).

## Exercício de campo em modo fictício

1. Selecione **Subcontratado**, escolha uma equipe fictícia e informe avanço de uma de suas tarefas (0–100%, observação opcional).
2. Verifique que o relatório mostra **pendente**. O progresso validado ainda não muda e o crédito projetado não é um pagamento.
3. Selecione **Project Manager**, revise o percentual reportado e **Valide** ou **Rejeite**. Ajustes/rejeições exigem justificativa.
4. Ao validar, o crédito é reconhecido pela **porcentagem aprovada × peso previamente definido × valor fictício do subcontrato**, lançando **apenas o delta** da nova aprovação. Eventos anteriores permanecem intactos.
5. Selecione **Cliente**: somente as porcentagens validadas são exibidas; nenhum valor interno, reporte pendente, histórico ou dados financeiros.
6. **Reiniciar simulação** apaga apenas os dados fictícios na memória desta aba; nenhuma informação real pode ser afetada.

## Escopo das garantias neste PROTÓTIPO

- Baseline de demonstração definida e imutável enquanto a sessão executa. Pesos 60/40 no scope flooring e 100% no painting são valores fictícios **pré-aprovados**; não são recomendação para projetos reais.
- Relatório do sub `pending` não muda progresso validado. O PM é o único ator **no modelo de simulação** capaz de validar/rejeitar.
- Ajuste de porcentagem precisa de motivo e crédito reconhecido não pode retroceder automaticamente; correções reversas exigirão mecanismo formal posterior. Ledger aditivo `Object.freeze` mantém registros anteriores apenas na sessão simulada.
- Sub vê somente suas tarefas/crédito estimado ou reconhecido, e cliente vê apenas progresso validado. Valores de contrato do cliente NÃO existem na projeção do cliente.
- Não há funções de pagamento, assinatura, Change Order ou criação de projeto real.

### O que NÃO existe e deve ser implementado antes do piloto real

**ATENÇÃO: Alternar papéis com botões não é autenticação, autorização, RLS ou segregação real de dados.** Todas as informações na demo são fictícias, pré-carregadas no JavaScript e acessíveis via ferramentas do navegador. Nunca carregar dados de clientes reais nessa página, nunca usar `projectFor` ou parâmetro `kind` como autorização em produção.

O piloto real exige:
- Provisionar um Supabase **de staging separado** (ou ambiente isolado com autorização formal do responsável) e usuários fictícios por papel.
- Criar tabelas/migrations específicas para `reported_progress`, decisões de validação e registros de crédito sem sobrescrever `tasks.progress`, scopes originais, COs ou baseline.
- Aplicar **RLS por atribuição de tarefa** para sub, por cliente/projeto para clientes, e PM autorizador; testar tentativas negativas por contas distintas. Autorização determinada pelo servidor, jamais pela escolha de papel no frontend.
- Persistir timestamps de servidor, actor ID autenticado, evidências, versão/identificador de scope e event snapshots; proteger contra alterações retroativas e replays/duplicações.
- Criar interfaces protegidas para sub/PM/cliente no Tracker real, sem revelar valores de cliente aos subs ou subcontrato ao cliente.
- Instrumentar pagamentos de forma **independente** dos créditos (não incluídos nesta demo).
- Testar sincronização offline/reconciliação com registro de relatórios pendentes e aprovações no servidor.

## Comandos de teste

```bash
node --test tests/progress-review.test.cjs
python -m pip install playwright==1.56.0
python -m playwright install chromium
python -m unittest discover -s tests/browser -p 'test_progress_demo.py' -v
```

GitHub Actions executa os dois testes com Ubuntu 24.04/Node22/Chromium. Esse workflow não chama API do Supabase ou Cloudflare para gravar dados.

## Critérios para declarar Incremento 1 entregue em produção

**Ainda não atendidos:** autenticação real em contas de teste, RLS negative tests, persistence/audit no servidor, UI integrada e smoke real multiactor. **Demonstração e testes de UI não substituem esses critérios.**

## Escopo de PR e dependências

Este protótipo é uma branch independente a partir da `main`, para não bloquear com [PR #2](https://github.com/libanius/BrightScale-Tracker/pull/2), ainda em draft. A incorporação do protótipo NÃO deve ser tratada como entrega do fluxo real a subs. Primeiro revisar e integrar guardrails do PR #2 com testes, depois evoluir Inc. 1 em migrations+RLS num staging isolado.
