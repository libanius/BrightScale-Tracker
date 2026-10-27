# BrightScale Tracker 2.0 — Handoff oficial para continuidade com outras IAs

**Atualizado:** 2026-10-26  
**Status:** Entrevista de produto ENCERRADA após 34 decisões confirmadas. Próxima fase: consolidar, priorizar, implementar MVP e testar em campo.  
**Projeto:** Smart Remodeling / BrightScale Tracker 2.0  
**Código:** `libanius/BrightScale-Tracker` (`main`)  
**App:** https://tracker.brightscalegroup.com

> **INSTRUÇÃO PARA A PRÓXIMA IA:** Não retome a entrevista nem invente novas decisões. O usuário considerou a sequência de perguntas excessiva para um produto ainda não testado em campo. Avance com auditoria do repositório, plano de MVP e implementação incremental, sujeito à autorização do usuário para alterações de produção. Leia este documento antes de planejar ou modificar código. As decisões 1–34 são visão de produto, **não uma obrigação de implementar tudo no MVP**.

## Protocolo permanente de continuidade entre IAs

**Regra vigente:** [CONTINUITY_PROTOCOL.md](CONTINUITY_PROTOCOL.md). O handoff presente é a **única fonte viva** de decisões, progresso do MVP, evidências e próxima ação; atualizá-lo ao fim de sessões com implementação, testes, deploy, decisões ou bloqueios. Instruções de descoberta em [AGENTS.md](../AGENTS.md), [CLAUDE.md](../CLAUDE.md) e [Copilot instructions](../.github/copilot-instructions.md).

Não criar handoffs datados concorrentes, nem marcar proposta como implementada ou implementação como testada. Sem acesso de escrita, sinalizar **NOT SYNCED** e fornecer patch. O protocolo orienta sessões conectadas; não é monitoramento ou atualização automática em background.

## Objetivo do produto

Smart Remodeling deve oferecer: escopo contratado claro, plano de execução, acompanhamento visual do cliente, progresso reportado pelo subcontratado e validado pelo PM, governança de Change Orders, cronograma confiável e rastreabilidade. SMART = **Scope, Model, Alignment, Rhythm, Time**. Tagline: “A clear plan. A defined standard. A better remodeling experience.”

Pilares humanos: motivar subcontratados dando visibilidade ao progresso/crédito **sem prometer pagamento**; oferecer clareza ao cliente sem revelar operações internas; manter autoridade de decisões e finanças exclusivamente com o Project Manager (PM).

## Decisões ratificadas (1–34)

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

**Pergunta 35 NÃO decidida:** política diante de indisponibilidade do sub e possíveis sugestões de alternativas/negociação. NÃO presumir seleção de qualquer alternativa. Desenvolver comportamento conservador de registro + alerta PM apenas se necessário ao MVP, sem reivindicar que tenha sido aprovado.

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

O usuário explicitamente considerou a entrevista longa demais para algo não testado. Não continuar questionário 35+, salvo bloqueio real de implementação. O objetivo imediato é trabalhar com o Tracker atual e testar fluxo real de ponta a ponta.

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

**Estado em 2026-10-26:** decisões 1–34 DECIDED, entrevista fechada; funcionalidades do MVP ainda exigem auditoria antes de declarar implementação/testes. Nenhum código de aplicação foi alterado como parte desta documentação.

---

## Checkpoint operacional (fonte atual para próxima IA)

- **Atualizado em:** 2026-10-26 (horário da Flórida; commits no GitHub em 2026-10-27 UTC).
- **Branch principal:** `main`; **correções Incremento 0 na branch** `fix/mvp-guardrails-2026-10-26`, PR rascunho **[#2](https://github.com/libanius/BrightScale-Tracker/pull/2)**. O PR NÃO está incorporado à `main`.
- **Decisões confirmadas:** 1–34 (`DECIDED`); entrevista encerrada; decisão 35 não tomada. **Protocolo:** [CONTINUITY_PROTOCOL.md](CONTINUITY_PROTOCOL.md).
- **Último resultado comprovado:** duas proteções implementadas na branch: 1) edições de tarefa preservam `acceptanceCriteria` e metadados; 2) importação de estimate para projeto existente é bloqueada, antes de gravar algo, até o fluxo de CO formal. O fluxo de **novo projeto** continua permitido.
- **Evidências de código:** `index.html` (branch do PR), `tests/guardrails.test.cjs`, `.github/workflows/mvp-guardrails.yml`. Commits de implementação: `734f1ee36bde19cc206fd2d9d693cfb0ca2340af`, testes `82c04f436025e8c4238ea4f21e9a7bf7e7360882`, CI `1f275246f76c9ed804b4286de7a51fc5f89deda6`.
- **Testes:** [GitHub Actions run 40443714407](https://github.com/libanius/BrightScale-Tracker/actions/runs/40443714407), Node 22, **7/7 PASS, 0 FAIL**: parse JS, preservação de metadados, ambos formulários de edição, bloqueio sem gravações, criação de novo projeto e seleção de destino desabilitada. **Não testado** no navegador, staging com autenticação, offline, ambiente de produção nem em campo.
- **MVP além do Inc. 0:** ainda **PARTIAL/MISSING** conforme [auditoria técnica](MVP_TECHNICAL_AUDIT_2026-10-26.md): falta fluxo `sub report → PM validation → credit recognized`, autorização granular por papel, baseline e CO formal; portal cliente só leitura.
- **Produção:** nenhuma aplicação/Edge Function/BD alterado. Ainda **não foi autorizado merge/deploy** do PR; documentação principal foi atualizada para continuidade. Status funcional do site não revalidado.
- **Riscos:** importação de estimate para projeto existente fica temporariamente indisponível no PR (intencional); sem CO formal não há maneira de acrescentar ao contrato original por este fluxo. Editores de tarefas ainda podem alterar progresso diretamente (sem PM validation), problema reservado para Incremento 1. Repositório público precisa revisão de histórico/privacidade.
- **Próxima ação única:** revisar **PR #2** e executar smoke test no preview/staging autenticado com **dados fictícios**; após evidência e autorização do responsável, incorporar o PR sem mexer nos schemas compartilhados. Depois executar Incremento 1: sub informa → PM valida → crédito oficial, com RLS por papel.

## Log de continuidade

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
