# BrightScale Tracker 2.0 — Auditoria técnica inicial do MVP

**Data:** 2026-10-26  
**Estado:** `AUDITED (STATIC CODE + READ-ONLY LIVE METADATA)`; **não** `TESTED` no navegador ou em campo.  
**Fonte de verdade de decisões:** [handoff canônico](SMART_REMODELING_HANDOFF_2026-10-26.md), decisões 1–34.  
**Protocolo:** [CONTINUITY_PROTOCOL.md](CONTINUITY_PROTOCOL.md)  
**Repositório:** `libanius/BrightScale-Tracker`; branch `main`.  
**Escopo:** inspeção do código GitHub e leitura de metadados/catálogos Supabase do projeto compartilhado `brightscale-scanner`, somente schemas `tracker`/`tracker_private`. Nenhuma escrita em BD, Edge Functions ou produção.

> **Legenda:** `EXISTS` = código/estrutura real encontrados (não significa teste de uso); `PARTIAL` = só parte do fluxo; `MISSING` = nenhum fluxo correspondente encontrado na revisão; `NOT VERIFIED` = necessita teste. Uma Edge Function ativa ou uma tabela criada não atesta UX funcional ou privacidade ponta a ponta.

## Resumo executivo

Há base operacional suficiente para evoluir incrementalmente: PWA em vanilla JS, IndexedDB offline-first com fila de sync para Supabase, importador de documentos, gerador de tarefas/escopos, gestão PM de projetos, painel financeiro interno, painel de visualização compartilhada do cliente e Edge Function de intake IA implantada.

**O MVP decidido ainda não está completamente implementado.** Seu principal risco para um piloto envolvendo sub é não existir fluxo de `sub reported progress → PM validates → recognized credit` com permissões e trilha de auditoria separadas. O código atual publica progresso de tarefas diretamente, e o crédito é derivado automaticamente desse progresso.

### Evidência direta e detalhes

- `index.html:1036-1090`: extração de texto de PDF/DOCX e fallback local; `index.html:1278-1316` usa `TrackerCloud.analyzeEstimate` e fallback; `index.html:1386-1632` permite revisão e criação de projeto, escopos, tarefas e liga milestones. `supabase/functions/tracker-estimate-intake/index.ts`: pipeline IA e criação de registros.
- Supabase read-only, 2026-10-26: schemas `tracker` com **15 tabelas e RLS habilitado em todas**; `tracker.estimate_intakes` tem **1 registro no estado `project_created`**, `tracker.milestones` **2 pendentes**, e `tracker.backup_runs` **1 registro de status `ok`**. Isso evidencia processamento persistido, **não** comprova experiência de usuário ou confiabilidade repetida. Edge Functions `tracker-share`, `tracker-estimate-intake` e `tracker-ops` aparecem **ACTIVE**, v1. Nenhuma chamada de execução foi feita.
- `index.html:791-807`: **progresso de scope = média simples das porcentagens das tasks**; há peso de escopos para total da unit, mas não peso aprovado por task.
- `index.html:871-915` e `index.html:2959-2967`: `subcontractEarned` = valor do sub × progresso calculado; `subcontractPaid` separado como valor manual, porém **não existe** workflow reportado/validado/crédito reconhecido/autorização de pagamento.
- `index.html:4813-4890`: a tela `openTaskEdit` persiste alteração do campo `progress` diretamente em `tasks`, slider com incremento de 5%; `tracker-cloud.js:95-108` sincroniza esse mesmo progresso. Não é um relatório isolado do sub, não requer aceite PM.
- **POSSÍVEL PERDA DE DADOS:** `openTaskEdit`, `index.html:4875-4885`, recria o registro sem `acceptanceCriteria` quando o código de importação o popula em `index.html:1303-1305,1625`; `tracker-cloud.js:100-102` transmite `acceptance_criteria: null` ao fazer upsert sem o valor. Verificar e corrigir antes do piloto.
- **RISCO CONTRATUAL:** `index.html:1405-1419,1571-1582`: ao importar estimate para projeto existente, soma valor diretamente a `projects.contractTotal` e cria nova unit. Nenhum CO formal; não confundir essa operação com alteração contratual válida. Desabilitar/restringir com PM review ou usar fluxo segregado quando disponível.
- `dashboard.html:103-145` e `tracker-cloud.js:387-399` expõem links `?t=` de leitura. A Edge Function implantada `tracker-share` valida hash SHA-256/revogação/expiração, retorna view com projeção segura de campos, sem valores financeiros ou notas internas. Confirmação foi por leitura do código implantado, não teste de token real.
- `dashboard.html` é **read-only** no modo compartilhado; não há edição de tarefas pelo sub via portal, nem aceite de cliente, assinatura de CO, fotos ou conversa sobre pendências no painel.
- Catálogo de BD: `tracker.milestones` tem status, critérios, campos `validated_at`/`signed_at`/`paid_at`, porém a UI ainda não possui o workflow milestone aprovação → assinatura → pagamento.
- As tabelas analisadas não incluem baseline operacional versionada, Change Orders, reportes individuais de progresso do sub, créditos reconhecidos, revisões de plano, autorizações excepcionais e recibos de confirmação de ciência.
- `index.html:2247+`: existe Nota do Dia; `index.html:3134+`: relatórios e exportação manual; `tracker-ops` faz backup + digest de integridade. **Isso não é** ainda o resumo diário operacional inteligente nem a revisão semanal estratégica acordados.
- `tracker-cloud.js:10-25,137-320`: cliente Supabase, IndexedDB/outbox, realtime. Requer teste real de conflitos e conectividade antes de prometer offline confiável.
- Permissões: políticas `tracker.*` usam `tracker_private.is_member(...)` e são amplas para usuários `authenticated` de uma mesma empresa; catálogo atual mostra **2 memberships, ambas `admin`**. **Não cadastrar subs/clientes como membros gerais** nem lhes entregar a mesma sessão de admin até definir autorização de menor privilégio e validar RLS por papel. Links client/sub têm view filtrada, mas são leitura; a plataforma ainda não dá a um sub acesso autenticado de edição de progresso própria.
- Linter de segurança Supabase consultado em 2026-10-26: retornou avisos de outros schemas e configurações gerais, **sem achados de tabelas `tracker` no conjunto exibido**. Isto **não certifica** RLS, funções nem segurança da interface. Não alterar outros schemas.

## Matriz P0 — evidências e próximos testes

| Capacidade | Estado | Evidência / lacuna |
|---|---|---|
| Estimate → revisão PM → projeto SMART | **PARTIAL** | Parser, Edge IA e modal de revisão existem. Setup SMART guiado por questões críticas, aceite/baseline e fluxo inteiro via navegador não verificados. |
| Fases, tarefas, responsáveis, planejamento | **PARTIAL** | Hierarquia projeto/unit/scope/task, prazo, responsável por scope e pesos de scope existem. Falta task weight e baseline congelada/liberação por fase. |
| Sub reporta → PM valida progresso | **MISSING** | UI atual de progresso salva direto em `tasks`; sem origem, review ou status separado. |
| Crédito oficial do sub separado do pagamento | **PARTIAL** | Estimativa por progresso e pago manual existem. Falta validação imutável, crédito oficial, calendário contratual independente e autorização de pagamento. |
| Portal do cliente (status/timeline/fotos) | **PARTIAL** | View segura em link assinado mostra progresso e datas. Fotos e central de ações não encontradas. |
| Milestone approval + cliente aceita entrega | **PARTIAL** | Tabela e intake criam milestones pendentes. Workflow de aceite/assinatura não encontrado na UI. |
| Change Orders e separação do original | **MISSING** | Sem tabelas/UI/fluxo formal de CO; importação incremental soma valor à receita original. |
| Revisões, ciência e alertas a sub | **MISSING** | Sem baseline versionada nem audit logs por revisão, acknowledgments e lembretes configuráveis para sub. |
| Resumo diário e revisão semanal PM | **PARTIAL** | Daily notes, relatórios manuais e digest de *saúde do sistema*; sem resumo diário de execução/estratégia. |
| Roles/RLS/privacidade de sub e cliente | **PARTIAL / RISK** | Client link projeta dados sem financeiros. RLS para membros de empresa é ampla; acesso autenticado de sub, segregação de créditos e ações por papel pendentes. |
| Offline-first e backup | **EXISTS / NOT FIELD TESTED** | Fila, pull, realtime, backup `ok` observado; falta simulação de vários atores/offline/reconnect. |
| Aplicativo publicamente acessível | **NOT VERIFIED** | URL conhecida `https://tracker.brightscalegroup.com`; tentativa externa de abrir nesta auditoria não conseguiu obter a interface. Não alegar indisponibilidade nem saúde. |

## Riscos classificados

1. **P0 — Integridade contratual:** importação para projeto existente altera `contractTotal` sem Change Order (`index.html:1571-1582`).
2. **P0 — Integridade dos registros:** edição da tarefa pode sobrescrever `acceptance_criteria` com NULL (`index.html:4875-4885`; `tracker-cloud.js:100-102`).
3. **P0 — Separação de progresso e dinheiro:** `progress` atual pode se converter diretamente em crédito financeiro pela fórmula existente; sem PM validation. Antes de liberar edição por sub, criar workflow de aprovação e escopo de RLS correto.
4. **P0 — Segurança de papéis:** políticas de membro cobrem todos os registros da empresa; evitar conceder membership interno às contas de sub/cliente sem RLS revisado.
5. **P1 — Evidência operacional:** não foram realizados testes end-to-end de login, upload, portal ou offline; não tratar `ACTIVE` como `TESTED`.
6. **P1 — Manutenibilidade:** repo não tem suite de testes ou migrations versionadas identificadas na árvore; priorizar scripts pequenos de regressão e migrations controladas para novas estruturas.

## Incrementos mínimos recomendados para testar UMA obra real

**Incremento 0 — Guardrails (primeiro; escopo pequeno):**
- Preservar `acceptanceCriteria` ao editar tarefa; adicionar teste de regressão.
- Proteger o fluxo de estimate para projeto existente contra modificação inadvertida de contrato original (exigir confirmação PM clara ou bloquear até existir CO, sem reescrever registros já existentes).
- Testar importação e dashboard em staging/ambiente seguro, com dados fictícios.

**Incremento 1 — Sub progress + validação PM (valor de campo):**
- Modelo distinto de `reported_progress` e `validated_progress`, com autoria, status, data, evidência opcional e decisões PM. Preservar históricos/créditos anteriores. Evitar resync que sobrescreva validação.
- Portal do sub com acesso limitado **apenas às tarefas atribuídas**; sub pode reportar, **não** validar oficialmente ou ver contrato do cliente; testar autorização negativa/RLS.
- Crédito estimado versus reconhecido versus pago em UI separada, sem pagamento automático.

**Incremento 2 — Cliente acompanha a obra:**
- Reusar portal read-only e adicionar fotos/status/milestones conforme necessidades do piloto; aceite de milestone e CO com auditoria e assinatura quando necessário.
- Priorizar clareza do que foi contratado versus sugerido/alterado.

**Incremento 3 — Aprender com campo:**
- Revisar atrasos reais, comportamento do sub, pendências de cliente e fricção. Só então detalhar Playbooks, IA histórica, smart gates, recovery e automatizações.

**Critério de primeiro piloto:** o PM consegue importar estimate aprovado, revisar tarefas, convidar sub por acesso restrito, receber progresso proposto, validá-lo, visualizar crédito sem prometer pagamento e compartilhar status seguro com cliente, sem expor valores nem alterar contrato original; executar ao menos um cenário de problema de obra e registrar resolução. Documentar teste, participantes por papéis, falhas, screenshots fictícios/redigidos, decisões de produto necessárias.

## O que NÃO foi feito nesta auditoria

- Nenhum commit de código de aplicação, deploy, SQL que modifique dados ou migração.
- Nenhum estimate privado, token, linha de cliente, telefone ou orçamento foi exportado.
- Nenhum teste de interface com login de PM/sub/cliente, nem browser automation; nenhum processamento novo da IA foi executado.
- Nenhuma confirmação de disponibilidade da aplicação pela URL de produção.

## Próxima ação verificável

**Implementar o Incremento 0 em branch/PR** com testes de regressão, sem deploy automático nem tocar schemas do projeto compartilhado. Em seguida preparar experimento controlado para Incremento 1. Atualizar checkpoint e log do handoff canônico depois de cada entrega.
