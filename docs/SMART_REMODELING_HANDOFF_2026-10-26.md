# BrightScale Tracker 2.0 — Handoff oficial para continuidade com outras IAs

**Atualizado:** 2026-10-27  
**Status:** 37 decisões de produto confirmadas. O responsável confirmou expressamente as decisões 35–37 em 2026-10-27, incluindo transferência assistida e auditada de subcontratados. A próxima pergunta (38) é pontual, sobre classificação de responsabilidades e auditoria; MVP e staging permanecem prioritários.  
**Projeto:** Smart Remodeling / BrightScale Tracker 2.0  
**Código:** `libanius/BrightScale-Tracker` (`main`)  
**App:** https://tracker.brightscalegroup.com

> **INSTRUÇÃO PARA A PRÓXIMA IA:** O usuário havia suspendido a entrevista extensa para acelerar o MVP, mas em 2026-10-27 confirmou expressamente as **decisões 35, 36 e 37** e pediu perguntas objetivas sobre responsabilidades e auditoria. **Decisão 38 ainda não tomada.** Faça uma pergunta pontual por vez, sem atrasar o MVP e sem inventar escolhas. Decisões 1–37 são visão do produto, **não funcionalidades implementadas**.

## Protocolo permanente de continuidade entre IAs

**Regra vigente:** [CONTINUITY_PROTOCOL.md](CONTINUITY_PROTOCOL.md). O handoff presente é a **única fonte viva** de decisões, progresso do MVP, evidências e próxima ação; atualizá-lo ao fim de sessões com implementação, testes, deploy, decisões ou bloqueios. Instruções de descoberta em [AGENTS.md](../AGENTS.md), [CLAUDE.md](../CLAUDE.md) e [Copilot instructions](../.github/copilot-instructions.md).

Não criar handoffs datados concorrentes, nem marcar proposta como implementada ou implementação como testada. Sem acesso de escrita, sinalizar **NOT SYNCED** e fornecer patch. O protocolo orienta sessões conectadas; não é monitoramento ou atualização automática em background.

## Objetivo do produto

Smart Remodeling deve oferecer: escopo contratado claro, plano de execução, acompanhamento visual do cliente, progresso reportado pelo subcontratado e validado pelo PM, governança de Change Orders, cronograma confiável e rastreabilidade. SMART = **Scope, Model, Alignment, Rhythm, Time**. Tagline: “A clear plan. A defined standard. A better remodeling experience.”

Pilares humanos: motivar subcontratados dando visibilidade ao progresso/crédito **sem prometer pagamento**; oferecer clareza ao cliente sem revelar operações internas; manter autoridade de decisões e finanças exclusivamente com o Project Manager (PM).

## Decisões ratificadas (1–37)

1. **Visão geral:** Smart Remodeling é o núcleo da evolução do BrightScale Tracker, com facelift visual e funcional. A formulação granular da decisão 1 não está integralmente preservada neste handoff; não atribuir detalhes adicionais a ela.
2. **Portal do cliente:** painel executivo + timeline + fotos/progresso visual + central de ações; mobile-first, simples.
3. **Aprovação do cliente:** aceite rápido de milestones com resumo/fotos; aprovar ou informar problema. Mudança de escopo/valor/prazo/critério exige Change Order; não confundir aceite de entrega com renegociação.
4. **Solicitação de Change Order:** cliente, sub e PM podem solicitar; **somente PM** formaliza e encaminha para aprovação.
5. **Crédito visível ao sub:** relatório de progresso pode mostrar crédito estimado imediatamente, mas só PM valida crédito oficial e autoriza pagamentos. Crédito visual NÃO é promessa de depósito. Proibir acesso do sub à receita/margem do cliente.
6. **Finanças independentes:** calendário/contrato de pagamento do sub independente do cronograma de cobrança do cliente; opções fixas por subcontrato ou pagamentos manuais controlados pelo PM.
7. **Report vs validate:** sub informa livremente progresso; PM confirma/ajusta progresso e crédito validados.
8. **Pesos das tarefas:** IA sugere distribuição; PM revisa e aprova ANTES da execução; progresso ponderado pelos pesos.
9. **Parciais:** sub reporta qualquer porcentagem 0–100, com fotos e notas opcionais; PM valida.
10. **CO independente:** contrato original e cada Change Order aprovado possuem escopo, pesos, progresso e crédito separados, com consolidado apenas para visualização. Preservar créditos já ganhos quando escopo adicional altera percentuais consolidados.
11. **CO e cronograma:** IA sugere impacto em dependências/caminho crítico, PM determina; revisão de data contratual requer aceite das partes envolvidas.
12. **Execução excepcional pré-CO:** normalmente esperar aprovação formal. PM pode autorizar início excepcional motivado e com riscos registrados; isso NÃO representa aceite contratual nem garantia de pagamento.
13. **Aceite de CO cliente:** fluxo rápido com assinatura digital e cópia por email, versão dos termos e trilha de auditoria.
14. **Lembretes de decisão:** inteligentes/configuráveis/pausáveis pelo PM, sem aceite por silêncio; prazo contratual nunca alterado unilateralmente.
15. **Prazo de resposta à CO:** PM define/ajusta data-limite; rastrear tempo de espera separado do atraso efetivo no caminho crítico. Não converter automaticamente toda espera em dias de atraso.
16. **Portal cliente e previsão:** mostrar impacto visual previsto de decisões pendentes; distinguir projected finish de contracted completion; PM valida impacto; alteração contratual somente por acordo.
17. **Riscos e causas:** IA detecta risco/propõe recuperação; PM confirma causa e classificação (cliente, fornecedor, sub, BrightScale, externo); sem penalidades financeiras automáticas.
18. **Visibilidade de riscos:** PM tudo; sub somente suas próprias atividades; cliente apenas impactos relevantes publicados/validados pelo PM, nunca custos internos ou dados sensíveis.
19. **Smart Recovery Plan:** IA estrutura; PM edita; subs afetados confirmam disponibilidade/viabilidade; PM publica. Alteração contratual/financeira segue CO/aditivo independente.
20. **Recovery + tarefas:** reutilizar tarefas existentes; registrar ações extraordinárias separadamente para evitar dupla entrada; nenhuma ação muda créditos/pagamentos automaticamente.
21. **Encerrar Recovery Plan:** estados Fully Recovered, Partially Recovered, Unsuccessful, Superseded by Approved Schedule. Salvar dias recuperados, atraso remanescente, custos extra internos, lições. Completar ações não é recuperar prazo.
22. **Relatórios:** resumo operacional diário automatizado e revisão estratégica semanal detalhada para PM; não pedir novamente dados já capturados.
23. **Aprendizado histórico:** IA aprende entre projetos, separa causas externas, sugere subs/equipes, prazos e estratégias com recomendações PRIVADAS ao PM; sem ranking público ou decisões financeiras automáticas.
24. **Sugestão adaptativa:** IA usa projetos comparáveis para recomendar duração, pesos e riscos, mostrando fonte da evidência e nível de confiança; aprovação do PM antes de aplicar.
25. **Qualidade do histórico:** no encerramento, revisão rápida com dados pré-preenchidos, lacunas destacadas e correção/validação pelo PM; campos desconhecidos devem permanecer desconhecidos, sem fabricação.
26. **Playbooks:** IA sugere criar/melhorar Playbooks reutilizáveis; somente PM revisa, aprova e publica novas versões. Não está aprovado criar automaticamente a partir de projeto concluído sem essa revisão.
27. **Setup de nova obra:** PM responde perguntas guiadas ANTES de a IA gerar o plano com base no estimate e no Playbook; perguntas ancoradas em SMART.
28. **Perguntas necessárias:** obrigatórias somente as questões críticas; complementares podem ficar pendentes até a fase correspondente.
29. **Baseline:** PM aprova e congela baseline geral; cada fase só é liberada progressivamente quando suas condições estiverem confirmadas. Distinguir baseline, plano operacional vigente e liberação de fase.
30. **Phase Gate:** PM pode liberar apenas atividades independentes das pendências e autorizar exceções operacionais justificadas/auditadas; JAMAIS dispensar requisito legal, licença, inspeção ou segurança.
31. **Versionamento:** ajustes pequenos auditados automaticamente; alterações operacionais relevantes formalizadas/confirmadas pelo PM, com revisão identificável; mudanças contratuais por CO. Nunca sobrescrever baseline, assinaturas ou créditos validados.
32. **Comunicação:** revisões operacionais relevantes comunicadas aos subs envolvidos com **confirmação obrigatória de ciência**; confirmação de ciência não é aceite de preço/contrato/disponibilidade.
33. **Viabilidade/bloqueio:** para CADA revisão, PM determina se exige confirmação de viabilidade/disponibilidade e se bloqueia a atividade até resposta; ciência continua obrigatória para toda revisão relevante.
34. **Lembretes:** PM estabelece MANUALMENTE prazo de resposta; sistema envia lembretes conforme esse prazo. Não adotar como decisão 34 alerta de risco autônomo nem alteração automática de prazo.
35. **Conflito de programação e negociação:** quando o sub relata indisponibilidade, a IA **sugere alternativas**; o PM pode **negociar datas com o sub no portal**, mantendo histórico das propostas, respostas, horários e participantes. **Somente o PM aprova e publica** a revisão operacional final. Nenhuma sugestão/proposta/alinhamento informal altera automaticamente a baseline, prazo contratual, Change Order, crédito reconhecido, valores ou pagamentos. Ciência obrigatória (32) e escolha de confirmação de viabilidade/bloqueio por revisão (33) continuam independentes; prazos de resposta permanecem definidos manualmente pelo PM (34). **DECIDED em 2026-10-27 por instrução explícita do usuário. Não implementado.**
36. **Escalonamento assistido pela IA:** ao vencer o prazo de resposta definido pelo PM, o Tracker **alerta o PM**, identifica **riscos e dependências possivelmente afetadas** e a IA **sugere alternativas**, inclusive consultar outro subcontratado. **Somente o PM decide** se mantém o bloqueio conforme a revisão, insiste, negocia, consulta outra equipe ou inicia procedimento de substituição. Rastrear aviso, tentativas de contato, propostas e decisões, com autoria e data/hora. Silêncio **não significa aceite, indisponibilidade comprovada, culpa ou autorização de substituição**. Espera por resposta não vira atraso real automaticamente (Smart Delay Control, 15). IA não altera baseline, prazo contratual, Change Order, custos, créditos, pagamentos ou atribuição, e não publica decisão. Mantêm-se as decisões 31–35 sobre versionamento, ciência, viabilidade e prazo manual. **DECIDED em 2026-10-27 por instrução explícita do usuário; ainda não implementado.**
37. **Substituição assistida e auditada de subcontratados:** diante da necessidade de trocar a equipe, a **IA prepara um checklist** do trabalho concluído, créditos já reconhecidos, pendências e riscos. O **PM verifica o novo sub**, documenta responsabilidades relevantes, aprova e publica uma **revisão operacional** de transferência. Preservar histórico de tarefas, progresso validado, créditos anteriores, propostas, comunicações, decisão, atores, evidências, datas e versões; manter uma trilha de auditoria integral. **Nenhuma culpa, penalidade, pagamento, substituição ou modificação de contrato decorre automaticamente da recomendação da IA.** O procedimento contratual aplicável, eventual Change Order e consentimentos exigidos seguem fluxos separados; ciência da revisão (32) não equivale a aceitação de novas obrigações. O PM mantém a autoridade de publicação e as regras de safety, permitting e baseline continuam inalteradas. **DECIDED em 2026-10-27 por instrução explícita do usuário; ainda não implementado.**

**Próxima decisão proposta (38), ainda PENDENTE:** como registrar e confirmar causas/responsabilidades de uma substituição, distinguindo fatos, análise da IA, avaliação e decisão PM, manifestações dos subs e eventuais disputas, com trilha auditável, sem culpa ou consequência financeira automáticas.

## Invariantes de contrato, escopo e financeiro

- **Contrato cliente != subcontrato:** escopos, milestone billing, payment schedules e valores independentes; client-facing não exibe crédito de sub nem custos/margens internas.
- **Reported progress != PM-validated progress != approved credit != payment authorized/paid**; implementar modelos e UI separados.
- **Baseline histórica imutável** após aprovação; revisões operacionais auditadas, COs versionados e separados.
- **Approval client (milestone) != acceptance of CO**; **acknowledgment sub != confirmation of availability != amendment signature**.
- O PM tem última palavra operacional. IA é assistente consultiva, jamais publicadora/autorizadora autônoma.
- Data projetada != data contratual; mudanças contratuais exigem aprovação/assinatura pertinente.
- Não presumir aceite por silêncio, atribuir culpa automática, aplicar multas, transferir custos ou liberar serviço incompatível com exigências legais/de segurança.
- Histórico precisa de proveniência, relógios corretos, atores, versões, motivos, visibilidade por função e audit trail.
- Respeitar permissões separadas para PM / subcontractor / customer e links seguros, expiráveis/revogáveis.

## Contexto técnico conhecido (revalidar no código antes de implementar)

- Repositório público `libanius/BrightScale-Tracker` / Cloudflare Workers `tracker.brightscalegroup.com`.
- PWA em vanilla JS: `index.html` (PM), `dashboard.html` (sub/cliente), `tracker-cloud.js` (sync Supabase), IndexedDB + outbox offline-first.
- Supabase compartilhado: projeto `brightscale-scanner`; Tracker nos schemas `tracker` e `tracker_private`. **NÃO MODIFICAR schemas `public` ou `private`**, pois suportam automações e outros serviços de produção.
- Funções Edge já mencionadas: `supabase/functions/tracker-estimate-intake/index.ts`, `supabase/functions/tracker-ops/index.ts`. Conferir implementação real antes de assumir completude.
- Integrações / arquitetura prevista: estimate SimplyWise/PDF -> parsing IA -> revisão PM -> SMART plan; Supabase / Cloudflare / Resend e possivelmente Stripe em fluxos futuros.
- Estilo Smart Remodeling: Montserrat, preto/branco/verde `#18c95f`, interface mobile-first. Não migrar framework desnecessariamente.
- Skills já instaladas no repo incluem `.claude/skills/find-skills/SKILL.md`, Supabase, Postgres, Cloudflare, Resend, Stripe e guidelines de design.
- **ALERTA DE SEGURANÇA:** repositório público; versões anteriores/histórico podem conter informações de clientes. Revisar exposição e considerar torná-lo privado antes de subir material operacional. Jamais registrar tokens, chaves, dados financeiros de cliente ou informações pessoais neste documento.

## Diretriz do usuário: sair da entrevista e testar

O usuário inicialmente encerrou a entrevista por considerá-la longa demais para um produto não testado. Em 2026-10-27, confirmou as decisões 35–37 e pediu perguntas dirigidas à classificação de responsabilidades e auditoria. **Não interpretar isso como autorização para entrevista indefinida**, nem atrasar testes e construção do MVP. Fazer uma pergunta curta por vez, quando solicitado; implementar prioritariamente fluxos testáveis em campo.

### MVP recomendado — escopo proposto, ainda requer priorização técnica

**P0: Essencial para um teste real**
1. Importar estimate e permitir PM revisar escopo / gerar plano inicial; usar fallback manual quando parsing falhar.
2. Fases, tarefas, atribuições, dependências críticas e baseline aprovada pelo PM.
3. Sub reporta progresso; PM valida progresso; cálculo de crédito validado separado do pagamento contratual do sub.
4. Portal do cliente: timeline, fotos e status, sem custos ou dados de subs.
5. Change Orders simples, segregados, com decisão/assinatura e trilha de auditoria.
6. Revisões e comunicações relevantes, com registro de ciência e prazos manuais onde necessários.
7. Resumo operacional diário e revisão semanal (primeiro gerar a partir dos dados existentes, depois sofisticar automações).
8. Permissões, segurança, privacidade e funcionamento confiável no celular.

**P1: Após validação inicial**
- Playbooks versionados com sugestão IA, guided setup mais elaborado, readiness gating sofisticado, recuperação de atraso e análises avançadas.
- Integrações robustas de notificações, painéis de auditoria, melhor comparação de versões.

**P2: Dependente de dados reais**
- IA de aprendizado entre projetos, classificação de causas, recomendações de subs/prazos com confiança, métricas complexas, inteligência avançada de riscos/recuperação.

Nota: Essa divisão é uma **proposta de implementação**, não uma revogação das decisões aprovadas nem uma confirmação de cronograma. Revisar com base no código existente; evitar duplicar funcionalidades.

## Plano de ação imediato para outra IA

1. Ler este handoff e inspecionar repositório + arquitetura atual (incluindo migrations/RLS, autenticacão, UI, fluxos Supabase).
2. Produzir checklist objetivo: **já implementado / parcial / ausente / risco** para cada capacidade P0.
3. Propor sequência curta de incrementos testáveis sem reconstruir o produto inteiro.
4. Evitar alterações de produção/segredos e migrações de schema sem verificar isolamento e ter aprovação apropriada.
5. Implementar um fluxo de ponta a ponta antes de sofisticar IA, Playbooks ou dashboards.
6. Instrumentar erros e obter feedback de uma obra real. Usar revisão semanal para detectar necessidades reais.
7. Atualizar **este mesmo arquivo** conforme código avança, sempre separando **decisão**, **implementado**, **testado** e **pendente**. Não marcar uma decisão como funcionalidade entregue sem evidência.

## Convenção de status para próximos handoffs

- **DECIDED**: escolha de produto expressamente confirmada pelo usuário.
- **PROPOSED**: recomendação ainda não aprovada.
- **IMPLEMENTED**: código presente e verificado, com commit/arquivo.
- **TESTED**: funcionalidade validada (contexto e resultado descritos).
- **BLOCKED**: impedimento confirmado e passo para removê-lo.

**Estado histórico em 2026-10-26:** na primeira consolidação havia 34 decisões confirmadas e a entrevista longa estava pausada. **Estado atual:** decisões 1–37 confirmadas em 2026-10-27, conforme lista e checkpoint acima. As decisões 35–37 continuam não implementadas.

---

## Checkpoint operacional (fonte atual para próxima IA)

- **Atualizado em:** 2026-10-27 (horário da Flórida).
- **Decisões:** **1–37 DECIDED**. Decisão 37 confirma transferência assistida/auditada: IA prepara checklist (conclusões, créditos reconhecidos, pendências, riscos), PM verifica novo sub, documenta responsabilidades, aprova e publica revisão, sem culpa/pagamento/contrato automático. **Decisão 38 sobre classificação de causas/responsabilidades e auditoria ainda pendente.** Priorizar MVP e staging; decisões 35–37 são DESIGN CONFIRMED, não código entregue.
- **Produção:** `main` do Tracker apresenta `v2.0 · MVP` (PR #3), com os dados legados ainda no Supabase existente. Nenhum código/serviço de produção foi modificado nesta fase de staging.
- **PR #2 — Guardrails:** draft, não incorporado. Duas correções de integridade e agentes Chromium de PM/cliente/segurança/offline testados com mock; testar preview e revisar antes de merge.
- **PR #4 — Incremento 1:** [draft](https://github.com/libanius/BrightScale-Tracker/pull/4), protótipo local isolado de sub reporta → PM valida → crédito com ledger aditivo, **10/10 Node + 5/5 Chrome PASS**. Não contém login real, backend ou dados persistidos no Supabase.
- **PR #5 — Fase 4 (NOVO):** [draft](https://github.com/libanius/BrightScale-Tracker/pull/5), [plano](https://github.com/libanius/BrightScale-Tracker/blob/feat/staging-auth-rls-progress/docs/STAGING_PROGRESS_AUTH_PLAN.md), estrutura para um projeto Supabase staging **novo e vazio**. Contém 10 tabelas de demonstração `pilot_*`, RLS por PM/sub/cliente, tabelas financeiras separadas, auditoria, função servidor para validar relatório e ledger aditivo. Usa `public` **somente do staging futuro**; JAMAIS executar no Supabase compartilhado.
- **Testes comprovados Fase 4:** [GitHub Actions #40506790356](https://github.com/libanius/BrightScale-Tracker/actions/runs/40506790356) **PASS** em PostgreSQL 17 descartável: DDL, 10 tabelas RLS ativas, JWT test identities simuladas (PM, sub, cliente, outsider, anon), autorização negativa, termos/crédito privados, relatório pendente/validação por PM, 57.600 centavos fictícios de crédito, autor/timestamp anti-spoofing, revogação de acesso. **NÃO equivale a Supabase Auth real**.
- **Projeto Supabase staging real:** **NÃO CRIADO**. Conector mostrou somente uma organização no plano Free com dois projetos já ativos (Abre-USA e brightscale-scanner), e o custo consultado para novo projeto foi **US$ 0/mês**. É necessário o responsável confirmar organização de destino; verificar limite da plataforma antes de criar. **Não pausar/migrar** projetos existentes para contornar plano.
- **Segurança:** nenhum projeto real alterado, nenhum deploy, nenhuma conta/credencial de cliente usada. Nunca executar `staging/tests/bootstrap_local_pg.sql` em Supabase. Toda documentação do PR #5 contém apenas nomes de identidades fictícias.
- **Próximo passo único:** confirmar a organização Supabase para provisionamento; verificar disponibilidade/limite. Em seguida criar staging separado (se plataforma permitir sem custo adicional) e executar testes de autenticação REAL por usuários fictícios antes de conectar qualquer UI do Tracker. Não chamar simulações de login de produção.

## Log de continuidade

### 2026-10-27 — Decisão 37 ratificada: transferência assistida e auditada de subcontratados (DOCS-ONLY)
- **Estado:** `DECIDED`; **não `IMPLEMENTED` nem `TESTED`**. Pedido expresso do responsável; preservar decisões 1–36.
- **Decisão:** IA prepara checklist de serviço concluído, créditos reconhecidos, pendências e riscos; PM verifica novo sub, documenta responsabilidades, aprova e publica a revisão operacional com histórico e auditoria completos.
- **Proteções:** o novo responsável não apaga trabalho/progresso/créditos anteriores. Registrar atores, datas, evidências, notificações, versões e justificativas. Não presumir culpa, penalidade, pagamento, responsabilidade jurídica ou alteração de contrato. Alterações de obrigações contratuais passam pelos acordos/COs apropriados; PM permanece autoridade final.
- **Alterações verificadas:** apenas documentação, protocolo e instruções para agentes nesta sessão; nenhum código do app, schema Supabase, automação ou deploy alterado.
- **Próxima pergunta:** decisão 38 sobre identificação de causas, responsabilidades e disputas com trilha auditável e validação PM. Desenvolvimento técnico de staging/MVP permanece inalterado.


### 2026-10-27 — Decisão 36 ratificada: escalonamento assistido pela IA (DOCS-ONLY)
- **Estado:** `DECIDED`, ainda **não `IMPLEMENTED` nem `TESTED`**.
- **Decisão:** notificar PM após expiração do prazo de resposta definido por ele, identificar riscos/dependências e recomendar alternativas inclusive consulta a outro sub. Somente PM conduz e publica eventual decisão; IA não substitui sub automaticamente.
- **Proteções:** nenhuma presunção de culpa, penalidade, aceite ou atraso real por silêncio; preservar Smart Delay Control, baseline congelada, COs, versionamento, confirmação de ciência, prazo definido pelo PM e a separação de créditos, pagamentos e privacidade financeira.
- **Auditoria planejada:** registrar notificações, tentativas de contato, propostas, respostas, atores, tempos e decisões com evidência. **Ainda não implementado**.
- **Alterações nesta sessão:** somente documentação e instruções de agentes; sem código de aplicação, migration ou deploy.
- **Próxima pergunta:** decisão 37 sobre procedimento de substituição de sub, responsabilidades e audit trail; manter staging/MVP em andamento.


### 2026-10-27 — Decisão 35 ratificada: IA sugere, PM negocia e publica (DOCS-ONLY)
- **Estado:** `DECIDED`; **não `IMPLEMENTED` ou `TESTED`**. Pedido explícito do responsável para retomar pontualmente entrevista de produto apesar da suspensão anterior.
- **Decisão:** IA sugere alternativas de datas; PM negocia com sub no portal, preserva versões de propostas e respostas, e **somente PM** publica a revisão final.
- **Compatibilidade:** ciência obrigatória da decisão 32, viabilidade/bloqueio definidos por revisão (33), prazo manual e lembretes (34), baseline imutável, Smart Delay Control, Change Orders, privacidade financeira e separação de créditos/pagamentos permanecem inalterados.
- **Código/infra:** nenhum código de aplicação, schema Supabase ou deploy alterado por esta decisão. PR #2, #4 e #5 permanecem independentes.
- **Próxima ação:** pergunta 36 pontual sobre vencimento do prazo sem resposta do sub; continuar piloto de staging em paralelo.


### 2026-10-27 — Fase 4: regras de banco e RLS comprovadas em PostgreSQL descartável
- **Estado:** `IMPLEMENTED (PR #5 / staging-only SQL)` e `TESTED (local PostgreSQL 17 SQL + RLS)`. **NOT STAGING-DEPLOYED, NOT AUTH-TESTED, NOT FIELD-TESTED**.
- **Mudança:** [PR #5](https://github.com/libanius/BrightScale-Tracker/pull/5) adiciona SQL `staging/sql/001_progress_rls.sql`, SQL de testes em `staging/tests/*`, workflow `.github/workflows/staging-rls.yml` e documentação `docs/STAGING_PROGRESS_AUTH_PLAN.md`. Dez tabelas RLS isoladas, aprovação por PM na função transacional, ledger de crédito sem pagamento, revogação de acesso e auditoria de reporte.
- **Evidência:** [GitHub Actions 40506790356 — PASS](https://github.com/libanius/BrightScale-Tracker/actions/runs/40506790356). Testes reais de permissões no PostgreSQL 17 em container; autenticação apenas simulada via claims de teste. Contagem de tabelas com RLS = 10; crédito fictício 57.600 cents só após aprovação.
- **Limitações:** staging real ainda não existe; ambiente só foi simulado em CI. Não confirmou login OTP, cookies/JWT reais, policies no projeto Supabase de staging, API Data API nem push/pull offline.
- **Segurança e financeiro:** nenhum schema do Supabase compartilhado, dado real ou pagamento alterado. Branch/PR somente, sem merge. Não inserir chaves, emails pessoais nem documentos privados no GitHub.
- **Próximo passo:** usuário confirmar organização Supabase para projeto novo; avaliar limite Free e provisionar separado quando permitido. Depois testar contas reais fictícias de PM, sub e cliente com RLS.


### 2026-10-27 — Incremento 1 criado como protótipo sem conexão de produção (PR #4)
- **Estado:** `IMPLEMENTED (isolated prototype branch)`, `TESTED (Node 10/10 PASS + browser Google Chrome 5/5 PASS)` conforme CI [40503796357](https://github.com/libanius/BrightScale-Tracker/actions/runs/40503796357). **NOT MERGED, NOT FIELD TESTED, NOT BACKEND INTEGRATED**.
- **Código:** [PR #4](https://github.com/libanius/BrightScale-Tracker/pull/4) com `prototype/progress-review.js` (regras, projeções), `prototype/progress-review.html` (UI mobile), `tests/progress-review.test.cjs`, `tests/browser/test_progress_demo.py`, `.github/workflows/progress-mvp-demo.yml` e `docs/PROGRESS_MVP_DEMO.md`.
- **Comprovado:** [CI #40503796357](https://github.com/libanius/BrightScale-Tracker/actions/runs/40503796357) — 10/10 Node PASS e 5/5 Chrome PASS. Cálculo 40% LVP × 60% peso × US$2.400 subcontrato fictício = US$576 reconhecidos só após PM, sem pagamento; cliente vê 0% antes e 40% depois. Testes reais de browser usaram HTML/JS do protótipo e 100% dados fictícios.
- **Dados e segurança:** zero conexão do protótipo com serviços reais; alternar papéis é UI simulada e não aplica autorização de backend. Nunca usar dados de produção nessa página. Não tocou em schemas nem em pagamentos.
- **Próximo passo:** verificar browser CI, revisar código e preparar staging distinto para login/RLS reais. PR #2 guardrails permanece não incorporado.


### 2026-10-27 — Identificação v2.0 · MVP + diagnóstico de retorno dos dados antigos
- **Estado:** `IMPLEMENTED (main)` para rótulo de versão; `TESTED` compilação JS inline e conferência de texto nas três posições do código; workflow GitHub Pages `success`; **DOM no domínio Cloudflare ainda NOT VERIFIED**.
- **Mudança:** [PR #3](https://github.com/libanius/BrightScale-Tracker/pull/3) foi mesclado em `main` (`dbd6eea`), atualizando a navegação/rodapé `v1.0` e os rótulos `v7.5` da área Sobre/dashboard para `v2.0 · MVP`. Fase de produto, não novo banco ou confirmação de funcionalidades.
- **Investigação de dados:** os 4 projetos e 54 tarefas lidos em contagens agregadas de `tracker` explicam a presença de histórico após login. Código: `index.html` chama `pullFromCloud` no login; `tracker-cloud.js` usa Supabase, cache IndexedDB e `firstSync` para migrar registros locais que faltam no servidor. Causa exata de qualquer item específico NÃO VERIFICADA. Nada foi apagado.
- **Testes/deploy:** compilação inline JS passou; conteúdo `main` confere as três etiquetas. [Actions 40500652655](https://github.com/libanius/BrightScale-Tracker/actions/runs/40500652655) concluída com sucesso; destino Cloudflare do usuário não aberto com navegador autenticado.
- **Segurança:** zero alterações de dados, tabelas, RLS ou login; PR #2 draft/automação permanece isolado e não pode explicar retorno do histórico.
- **Próximo passo:** usuário conferir etiqueta em tela e, se necessário, usar `Ajustes → Forçar atualizar app` (somente cache). Para separar legado de novo MVP, primeiro definir política segura de arquivamento/visibilidade, sem exclusão automática.


### 2026-10-26 — Agentes PM/Cliente/Segurança/Offline criados e executados no navegador (PR #2)
- **Estado:** `IMPLEMENTED (branch)` e `TESTED (isolated Chromium browser mock)`, **NÃO** `FIELD TESTED` ou login REAL. Workflow agendado aguarda integração a `main`.
- **Mudança:** adicionou 4 suites independentes Python Playwright e fixture 100% fictícia, rodando `index.html`, `dashboard.html`, IndexedDB e telas reais em Chromium; criou workflow com triggers PR/push/main/manual e dias úteis após merge. Acrescentou cheque HTTP público somente-leitura para schedule/manual (ainda não executado).
- **Evidências:** [PR #2](https://github.com/libanius/BrightScale-Tracker/pull/2), [GitHub Actions #40444617361](https://github.com/libanius/BrightScale-Tracker/actions/runs/40444617361) **11 PASS / 0 FAIL** (PM4, Cliente3, Segurança3, Offline1); [instruções dos agentes](https://github.com/libanius/BrightScale-Tracker/blob/fix/mvp-guardrails-2026-10-26/docs/BROWSER_TEST_AGENTS.md).
- **Testes:** real Chromium + HTTP localhost + JS app e IndexedDB; test cloud/auth mockado e acesso externo bloqueado. Primeiro run falhou por incompatibilidade Playwright/Ubuntu 26.04; correção para 24.04 resolveu; não houve teste real Supabase RLS/login, produção ou field test.
- **Segurança/contratos:** nenhum schema/cliente/contrato/pagamento alterado. PR continua draft.
- **Próximo passo:** revisar PR, ensaiar smoke em staging isolado; confirmar merge/deploy depois. Planejar credenciais fictícias em staging para testes reais de autenticação/RLS.


### 2026-10-26 — Incremento 0 implementado e testado em CI (PR #2 não incorporado)
- **Estado:** `IMPLEMENTED` na branch `fix/mvp-guardrails-2026-10-26`; `TESTED` em CI Node com **7/7 PASS**; `NOT MERGED / NOT FIELD-TESTED`.
- **Mudança:** `index.html` preserva metadados em ambos os saves de tarefas e rejeita importação de estimates em projetos existentes antes de gravações. Adicionou `tests/guardrails.test.cjs` e workflow `.github/workflows/mvp-guardrails.yml`.
- **Evidência:** [PR #2](https://github.com/libanius/BrightScale-Tracker/pull/2), [CI verde](https://github.com/libanius/BrightScale-Tracker/actions/runs/40443714407) e commits `734f1ee`, `82c04f4`, `1f27524`.
- **Teste:** Node 22 / GitHub Actions; 7 testes passaram, 0 falharam; não houve teste de interface real, staging com sessão, offline ou campo.
- **Segurança/contratos:** nenhum schema, registro real, segredo ou Edge Function tocado; baseline original protegida do fluxo de importação. Projeto existente exige futura formalização de CO.
- **Próximo passo:** teste de fumaça em preview e revisão do PR antes do merge. Em seguida fluxo de progresso informado pelo sub com validação do PM.

### 2026-10-26 — Fase 2: auditoria técnica inicial do MVP
- **Estado:** `AUDITED / DOCS-ONLY`. Não marcar como `TESTED` ou `IMPLEMENTED`.
- **Mudança:** revisou fonte do Tracker, dashboard, cloud layer, Edge Functions existentes, catálogos de banco e políticas RLS read-only. Publicou [auditoria técnica](MVP_TECHNICAL_AUDIT_2026-10-26.md), com matriz P0, riscos e ordem de incrementos.
- **Evidência:** código `index.html` (linhas 791–807, 1386–1632, 4813–4890), `tracker-cloud.js`, `dashboard.html` e metadados de `tracker` via conexão Supabase; a auditoria traz detalhes e limites da verificação.
- **Teste:** apenas revisão estática e queries SELECT, sem testes de app/usuário.
- **Segurança/contratos:** nenhum dado ou schema modificado. Riscos principais: aceite de tarefa perdido em edição, importação que soma contrato sem CO, validação/privacidade de sub ausente.
- **Próximo passo:** Incremento 0 via branch/PR; registrar testes e atualizar este handoff.


### 2026-10-26 — Protocolo inter-LLMs e preservação das decisões
- **Estado:** `DOCS-ONLY` (documentado e gravado, sem alteração de código de aplicação).
- **Mudança:** consolidou 34 decisões aprovadas neste handoff; estabeleceu protocolo de atualização, descoberta por agentes e checklist de PR.
- **Evidências:** repositório `libanius/BrightScale-Tracker`, `docs/CONTINUITY_PROTOCOL.md`, `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.github/pull_request_template.md`. O histórico do Git registra cada arquivo.
- **Teste:** leitura de conteúdo via conexão GitHub. Não houve testes do produto, deploy nem migrações.
- **Segurança/contratos:** sem modificações; instruções explícitas de privacidade, respeito ao PM, COs, e isolamento dos schemas `tracker`/`tracker_private`.
- **Próximo passo:** auditoria técnica objetiva do MVP existente; não retomar entrevista.
