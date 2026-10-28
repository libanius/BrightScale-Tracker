# BrightScale Tracker 2.0 — Handoff oficial para continuidade com outras IAs

**Atualizado:** 2026-10-28  
**Status:** **39 decisões de produto confirmadas. Rodada de entrevista ENCERRADA por solicitação expressa do responsável em 2026-10-27.** Próxima prioridade: revisar os PRs de integridade e testar o MVP de ponta a ponta em ambiente isolado antes de uso em obra real. Decisões 35–39 são visão de produto, não funcionalidades entregues.  
**Projeto:** Smart Remodeling / BrightScale Tracker 2.0  
**Código:** `libanius/BrightScale-Tracker` (`main`)  
**App:** https://tracker.brightscalegroup.com

> **INSTRUÇÃO PARA A PRÓXIMA IA:** o responsável confirmou **39 decisões** (1–39), ratificou em 2026-10-27 o histórico de auditoria com correções vinculadas e controle de privacidade (**decisão 39**) e **encerrou expressamente a entrevista**. **Não fazer pergunta 40 nem retomar descoberta teórica** sem novo pedido explícito; executar o menor MVP end-to-end com testes e evidência. Conservar histórico, baseline, Change Orders, créditos reconhecidos, pagamentos separados e papel decisório do PM. Este handoff contém escolhas aprovadas, **não prova que tenham sido implementadas**.

## Protocolo permanente de continuidade entre IAs

**Regra vigente:** [CONTINUITY_PROTOCOL.md](CONTINUITY_PROTOCOL.md). O handoff presente é a **única fonte viva** de decisões, progresso do MVP, evidências e próxima ação; atualizá-lo ao fim de sessões com implementação, testes, deploy, decisões ou bloqueios. Instruções de descoberta em [AGENTS.md](../AGENTS.md), [CLAUDE.md](../CLAUDE.md) e [Copilot instructions](../.github/copilot-instructions.md).

Não criar handoffs datados concorrentes, nem marcar proposta como implementada ou implementação como testada. Sem acesso de escrita, sinalizar **NOT SYNCED** e fornecer patch. O protocolo orienta sessões conectadas; não é monitoramento ou atualização automática em background.

## Objetivo do produto

Smart Remodeling deve oferecer: escopo contratado claro, plano de execução, acompanhamento visual do cliente, progresso reportado pelo subcontratado e validado pelo PM, governança de Change Orders, cronograma confiável e rastreabilidade. SMART = **Scope, Model, Alignment, Rhythm, Time**. Tagline: “A clear plan. A defined standard. A better remodeling experience.”

Pilares humanos: motivar subcontratados dando visibilidade ao progresso/crédito **sem prometer pagamento**; oferecer clareza ao cliente sem revelar operações internas; manter autoridade de decisões e finanças exclusivamente com o Project Manager (PM).

## Decisões ratificadas (1–39)

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
38. **Causas, responsabilidades operacionais e contestação auditável:** a IA **analisa as evidências disponíveis e sugere possíveis causas**, identificando incertezas, sem estabelecer culpa. O **PM revisa e valida sua própria avaliação operacional**, com justificativa e evidências vinculadas. O **sub pode apresentar sua versão dos fatos ou contestar** a avaliação no portal. O Tracker **preserva lado a lado** a sugestão da IA, as evidências de origem, a avaliação/decisão do PM e a versão/contestação do sub, incluindo autores, datas/horários, revisões, mudanças de status e histórico de comunicação. Divergência registrada não implica culpa definitiva nem necessariamente modifica a avaliação PM; a contestação não será apagada por decisão posterior. **Nenhuma responsabilidade jurídica definitiva, penalidade, dedução de crédito, pagamento ou mudança contratual é automática**; eventual ajuste contratual segue os procedimentos formais e aprovações pertinentes, preservando baseline, COs e créditos reconhecidos (decisões 10–18, 31–37). **DECIDED em 2026-10-27 por instrução explícita do usuário; ainda não implementado.**
39. **Histórico imutável com correções auditadas e proteção de privacidade:** o sistema deve **preservar a trilha de auditoria original**, registrar correções como **novos eventos vinculados** ao registro/evidência corrigido, com autor, motivo, data/hora, versão e referência ao conteúdo afetado. O **PM pode restringir imediatamente a visualização** de dados incorretos ou sensíveis, respeitando permissões e mantendo histórico em área protegida acessível apenas a papéis autorizados. A preservação deve **respeitar obrigações legais aplicáveis de retenção, privacidade e exclusão**: imutabilidade operacional não significa conservar indefinidamente informação pessoal quando uma obrigação legal exigir sua eliminação ou anonimização. Registrar também os eventos de restrição, correção e cumprimento de exclusão/retificação segundo o regime aplicável, sem expor o conteúdo protegido em logs públicos. Correções **não alteram automaticamente** baseline, Change Orders, assinaturas, créditos reconhecidos, pagamentos, avaliações de responsabilidade ou decisões anteriores. Qualquer efeito contratual/financeiro segue seus próprios fluxos formais e aprovação humana. **DECIDED em 2026-10-27 por instrução explícita do usuário; ainda não implementado.**

**ENTREVISTA ENCERRADA (2026-10-27):** decisões 1–39 ratificadas. Não propor decisão 40 nem continuar questionário sem novo pedido expresso. A prioridade é o MVP testável em ambiente isolado e, depois, uma obra piloto, com as proteções contratuais e financeiras já definidas.

## Invariantes de contrato, escopo e financeiro

- **Contrato cliente != subcontrato:** escopos, milestone billing, payment schedules e valores independentes; client-facing não exibe crédito de sub nem custos/margens internas.
- **Reported progress != PM-validated progress != approved credit != payment authorized/paid**; implementar modelos e UI separados.
- **Baseline histórica imutável** após aprovação; revisões operacionais auditadas, COs versionados e separados.
- **Approval client (milestone) != acceptance of CO**; **acknowledgment sub != confirmation of availability != amendment signature**.
- O PM tem última palavra operacional. IA é assistente consultiva, jamais publicadora/autorizadora autônoma.
- Data projetada != data contratual; mudanças contratuais exigem aprovação/assinatura pertinente.
- Não presumir aceite por silêncio, atribuir culpa automática, aplicar multas, transferir custos ou liberar serviço incompatível com exigências legais/de segurança.
- Histórico precisa de proveniência, relógios corretos, atores, versões, motivos, visibilidade por função e audit trail. **Correções geram eventos vinculados, não sobrescrita silenciosa**; o PM pode restringir visibilidade de dados errados/sensíveis imediatamente, preservando material em área protegida na extensão permitida pela lei e executando exclusão/anonimização legalmente exigida quando aplicável (decisão 39).
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

O usuário havia interrompido a entrevista longa para avançar no MVP; em 2026-10-27 confirmou pontualmente as decisões 35–39 e **solicitou encerrar esta rodada de entrevista**. Não fazer perguntas 40+ nem explorar novas variantes de produto sem solicitação explícita. Priorizar implementação e testes controlados do MVP, sem aguardar entrevistas adicionais. Pedir autorização apenas se for essencial para ações externas irreversíveis, cobrança ou mudanças em produção.

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

**Estado histórico em 2026-10-26:** na primeira consolidação havia 34 decisões confirmadas e a entrevista longa estava pausada. **Estado atual:** decisões 1–39 confirmadas em 2026-10-27 e entrevista encerrada, conforme lista e checkpoint acima. As decisões 35–39 continuam não implementadas.

---

## Checkpoint operacional (fonte atual para próxima IA)

### Auditoria de fechamento — 2026-10-28
- **VERIFIED:** domínio principal `https://tracker.brightscalegroup.com/workspace/` abriu no navegador cloud com login e “Conectado ao Supabase”. O 403 do cliente HTTP de terminal não prova falha do site.
- **FIXED / REMOTE:** recibos Edge v2 ACTIVE. Variável `URL` ocultava o construtor global e fazia CORS rejeitar todas as origens. Renomeada para `SUPABASE_URL`; mantida autenticação explícita e verificação PM/RLS antes de ler a fila.
- **SECURED / REMOTE:** dez tabelas abandonadas `tracker.pilot_*` estavam com RLS desligado e SELECT para authenticated. Corrigida a alegação anterior de proteção: migration `tracker_secure_abandoned_pilot` agora habilita RLS e revoga grants PUBLIC/anon/authenticated, sem apagar dados. Confirmados 40/40 live RLS, 10/10 piloto RLS, zero grants expostos; advisor não acusa mais RLS desabilitado.
- **TESTED:** 34 Node PASS; 37 checks SQL + suíte herdada PASS; namespace live PASS com preservação de dados/grants de outros serviços e restrição idempotente das 10 tabelas; build PASS. Endpoint remoto: preflight Tracker 204, POST sem autenticação 401, origem externa 403. Nenhum e-mail real enviado.
- **PENDENTE:** chave de recibos não disponível (nenhum segredo Resend/SMTP no Vault; fila vazia), aceitação OTP/convites e teste de estimate/obra real pelo proprietário. Não marcar FIELD-VALIDATED. Stripe automático e recursos P1/P2 continuam posteriores.
- **NEXT:** configurar `RESEND_API_KEY`/remetente verificado no servidor por canal seguro; aceitar login e executar estimate real com revisão PM. Sem nova entrevista, custos ou mudanças nos serviços alheios.

### Marcos de cobrança — correção publicada (PR #11)
- Distribuição exata de centavos sem alterar contrato; revisão dos marcos acessível antes da validação final. Total e excesso visíveis; sobrecobrança real continua bloqueada. CI final quatro suítes SUCCESS (30 Node / 7 browser no workspace). Ver log da correção.

### Documento → preenchimento automático — publicado
- **PR #10 merged**, merge `5e625332d7aeef278e6bf60b032e955acfc4c132`, código `4a3656e9a5bccdf6c4d57874ba9deded32d14b06`.
- **CI final SUCCESS:** workspace #40687064303 (29 Node, SQL/namespace/build e 6 testes mobile, incluindo upload automático e falha/repetição); RLS #40687064273; regressões #40687064281; guardrails #40687064423.
- **LIVE UI VERIFIED:** o mesmo preview feat-tracker-delivery foi atualizado por fast-forward ao merge e aberto no navegador: texto de análise automática e botão de reanálise presentes. Planner v2 ativo. Documento real do proprietário ainda não exercitado nesta correção; PDF imagem continua sem OCR.
- Primeira execução browser identificou nome acessível instável de textarea preenchida; corrigido com aria-label explícito. Uma sincronização intermediária de bundle foi corrigida antes de merge; árvore final e hashes conferidos, CI verde.

### LIVE — publicado em 2026-10-28
- **ACESSO VERIFICADO:** https://feat-tracker-delivery-brightscale-tracker.brightscalegroup.workers.dev/workspace/ mostra login automático conectado ao Supabase real. Domínio principal não confirmado nesta sessão: HTTP GET retornou 403; causa não determinada. Não declarar indisponibilidade para o usuário nem contornar controles.
- **RELEASE:** PR #9 merged; commit de conexão `255d7438ddf99deb0f1c7ec876d64d37efe25a53`, merge `b8f47103fa2cc98974fd595980c9bbd4bafc4539`. Workers Builds de produção SUCCESS confirmado pelo check GitHub.
- **CI FINAL:** workspace #40684759792, RLS #40684759699, regressões PM/client/security/offline #40684759717 e guardrails #40684759672: todos SUCCESS.
- **BROWSER:** preview conectado abriu a tela “Entre no seu Tracker”, sem configuração manual. Tentativa de inspecionar a aba de produção foi impedida pelo gate do navegador ao adquirir uma aba de erro anterior; nenhuma tentativa de contornar. Aceitação OTP/mailbox e campo permanecem pendentes.

### Autorização e validação remota — 2026-10-28
- **DECIDED:** usuário autorizou usar o ambiente Supabase existente e aceitou perda dos dados atuais. Esta autorização substitui o bloqueio anterior por falta de staging separado. Não houve necessidade de apagar dados.
- **IMPLEMENTED / REMOTE:** 40 tabelas `tracker.live_*` com RLS e funções correspondentes; helpers `tracker_private.workspace_*`. Somente admins existentes do Tracker podem criar projetos/equipe. Nenhuma alteração de dados ou objetos dos serviços em `public/private`.
- **TESTED LIVE:** 16 verificações reais com três contas GoTrue temporárias e JWTs reais: login PM/sub/client, bloqueio pré-baseline, phase gate, reporte, validação, finanças segregadas, vistoria sem crédito automático, eventos/restrição, assinatura e revogação. Contas/memberships temporárias removidas. Um projeto claramente TESTE LIVE está disponível ao admin da empresa. Endpoint temporário de diagnóstico desativado (410, verify_jwt=true).
- **AI LIVE:** endpoint `tracker-workspace-plan` retornou HTTP 200 e 2 escopos para estimate sintético, com autenticação PM real. Credencial existente usada apenas no servidor; nenhuma chave secreta no repositório.
- **APP:** configuração pública automática, schema tracker, sessão existente reutilizável e login por código; convidados só recebem acesso ao escopo/obra atribuídos. Novo endpoint `tracker-workspace-team` resolve conta existente ou convida por Supabase Auth após ação explícita do PM.
- **PENDENTE ESPECÍFICO:** `RESEND_API_KEY` não existe no ambiente; cópias automáticas de assinatura ficam na fila, sem falsa marcação de envio. Download do recibo/assinatura funciona; e-mails de acesso usam Supabase Auth separadamente. Não foram enviados convites/mensagens a terceiros pelo agente.
- **TESTED LOCAL:** 28 Node, 37 verificações SQL herdadas/workspace, teste de namespace live (40 tabelas, serviços/grants existentes preservados, setup PM-only) e build dos 3 endpoints PASS. Ainda falta validar convites/OTP pelo usuário e uma obra real.
- **DEPLOY:** código live incorporado ao main e Cloudflare Workers Builds SUCCESS. Não confundir publicação com teste de campo.
- **Histórico técnico:** migrations com DROP dispararam erro nativo requestState; nova materialização cria definições finais sem DROP. Primeiro scaffold deixou 10 tabelas piloto vazias e protegidas em tracker, não usadas pelo app live. Migrações seguintes foram confirmadas; nenhuma exclusão improvisada.
- **NEXT:** publicar UI conectada, verificar login/tela no domínio, registrar commit/deploy; usuário iniciar teste com estimate real. Configurar a chave de cópias por e-mail quando disponibilizada.


### Entrega integrada — 2026-10-28 (Flórida)
- **DECIDED:** proprietário autorizou prosseguir até a entrega e registrar o avanço por fase após a análise do fluxo completo. Preservar decisões 1–39 e não reiniciar entrevista.
- **Branch:** `feat/tracker-delivery`, baseada no main `86cde6e`, integrando o backend PR #5 e guardrails PR #2. Não removidos arquivos, dados, PRs ou branches existentes.
- **Fase 1 — integração:** IMPLEMENTED local; guardrails e backend reconciliados.
- **Fase 2 — entrada e cadastro:** IMPLEMENTED local: PDF/TXT/JSON, contexto SMART, sugestão IA isolada (configuração remota pendente), revisão editável, pesos/critério/dependência e criação idempotente/atômica de novo projeto.
- **Fase 3 — equipe e valores:** IMPLEMENTED local: diretório por PM, vínculo de conta e atribuição por escopo, responsabilidades e condições independentes; contrato cliente separado de subcontratos, créditos e registros manuais de pagamentos/despesas.
- **Fase 4 — execução:** IMPLEMENTED local: baseline explícita, gates legais/safety/readiness, sub reporta, PM observa e valida em ações distintas, percentuais ponderados; eventos e correções vinculadas; restrição imediata de eventos/documentos; marcos, assinaturas com snapshot/hash e fila de cópias; CO assinado separado; encerramento com verificações.
- **Fase 5 — interface e QA:** React/Motion implementados em `/workspace/` com linguagem visual aprovada. `npm test` **26/26 PASS**, `npm run test:sql` **37 checks PASS** + suíte SQL/RLS herdada PASS (PostgreSQL WASM/PGlite, identidades fictícias). **40 tabelas piloto com RLS**. Build do frontend e sintaxe/bundle dos dois endpoints PASS; npm audit produção: 0 vulnerabilidades reportadas. Browser CUA desktop: cadastro até revisão, PM vistoria/validação/evento e visões client/sub verificados com fixtures sem Auth/rede reais. **CI remoto PASS:** workspace #40636930048 (Node/SQL/build reproduzível + Chrome mobile 4/4), RLS #40636929953 (PG17/PostgREST JWT + Node + Chrome) e guardrails #40636929986. Regressões PM/cliente/segurança/offline #40636929878 também PASS. Isto continua usando identidades fictícias, não Supabase Auth/GoTrue remoto.
- **Fase 6 — liberação:** BLOCKED para produção/obra real. Supabase separado não existe (dois serviços existentes preservados); não provisionado plano pago. Ainda faltam Auth OTP/JWT/PostgREST reais dos três perfis, teste remoto de IA e e-mail, offline/revogação/compatibilidade e plano explícito de migração dos projetos antigos. O titular havia adiado o teste manual de três perfis; não pedir novamente no meio do desenvolvimento. Funções de envio foram testadas só com transportes simulados: nenhum e-mail real enviado.
- **Produção:** sem merge, deploy, migração, dados reais ou pagamentos. Legacy offline preservado; workspace novo ainda exige conexão para ações operacionais. Rascunho persiste na navegação interna, não no reload/troca de identidade; exportação manual disponível.
- **Sincronização: SIM, PR #9 draft** — https://github.com/libanius/BrightScale-Tracker/pull/9 . Commit remoto de implementação `2b2542bc958db45f9cb2e9b271e75487132a13c3`, árvore `3542c9f5ab4a056c50f028eb1d4c05b37b04ef66` idêntica à testada localmente. Primeiro push foi rejeitado por possível egress; após revisão de payload/destino, terminal não tinha credencial. Acesso GitHub autenticado sincronizou 31 blobs novos (SHA conferido) + 19 existentes, sem dados reais/segredos. Bloqueio de sincronização resolvido; produção não alterada.
- **Preview publicado e verificado no navegador:** https://feat-tracker-delivery-brightscale-tracker.brightscalegroup.workers.dev/workspace/ . Cloudflare Workers Builds do commit `2b2542b` SUCCESS. Interface acessível, sem conexão a banco real por padrão. **Próximos passos:** provisionar staging separado sem custo não autorizado; executar aceitação remota e migração/release controlados. P1/P2 de aprendizado, playbooks e negociação avançada não estão entregues por este MVP.

### Referência histórica do checkpoint anterior (preservada)

- **Atualizado:** 2026-10-27 (horário da Flórida). **Decisões 1–39 confirmadas**, entrevista expressamente encerrada; não perguntar decisão 40.
- **Produção:** aplicativo `main` no Tracker exibe `v2.0 · MVP` e conserva dados legados no Supabase compartilhado. **Nenhum código do aplicativo ou schema de produção foi alterado nesta implementação**; apenas documentação no `main`.
- **PR #2 — Guardrails:** [draft, não merged](https://github.com/libanius/BrightScale-Tracker/pull/2). Preserva critérios/metadados das tasks, impede estimate em contrato existente e mantém marca visual v2.0. [Node #40559504678](https://github.com/libanius/BrightScale-Tracker/actions/runs/40559504678) e [agentes Chrome #40559504937](https://github.com/libanius/BrightScale-Tracker/actions/runs/40559504937) PASS. Precisa análise de merge/deploy controlado.
- **PR #4 — Demo inicial:** [draft](https://github.com/libanius/BrightScale-Tracker/pull/4), fluxo local isolado de reporte sub → validação PM → crédito; não é auth/backend real.
- **PR #5 — BACKEND PILOTO E PORTAL AUTENTICADO (isolado; não publicado):** [draft](https://github.com/libanius/BrightScale-Tracker/pull/5), branch `feat/staging-auth-rls-progress`. Portal autônomo de staging `staging/pilot.html`, `staging/pilot-ui.js`, `staging/pilot-gateway.js`; **não está integrado ao `index.html` principal nem implantado**. Migrações para banco **NOVO, VAZIO e SEPARADO**, executar estritamente na ordem: `staging/sql/001_progress_rls.sql`, `002_baseline_freeze.sql`, `003_change_orders.sql`, `004_change_order_requests.sql`. **JAMAIS aplicar sobre Abre-USA, brightscale-scanner ou schemas existentes**.
- **Fase 4 + Incremento 2:** original baseline congelada exclusivamente por PM via RPC e gatilhos; somente quando escopos e tarefas somam 100% por escopo; sub só reporta após baseline aprovada; progresso PM-validado e crédito reconhecido separados de pagamento.
- **NOVO — Incremento 3:** CO **independente** do contrato original com `pilot_change_orders`, tabelas próprias de termos de cliente e sub, scopes/tasks ponderadas, relatórios, validações, crédito e auditoria. Rascunho PM → PM envia proposta completa → cliente aprova/recusa com motivo → **somente PM** ativa → sub designado reporta progresso e PM valida crédito de CO em ledger próprio. Nenhuma mudança no contrato/baseline original, créditos anteriores, pagamentos ou responsabilidades automática; client price privado do sub, preço do sub privado do cliente. **Aceite do portal piloto NÃO é assinatura eletrônica formal.**
- **NOVO — Incremento 3B (decisão 4):** cliente, sub ou PM podem criar pedidos de CO sem preço/autor forjável. Somente PM pode formalizar (transformando o pedido em rascunho de CO) ou recusar com justificativa. Auditoria append-only da solicitação, visível ao PM e ao próprio solicitante, RLS vigente.
- **EVIDÊNCIA MAIS RECENTE:** [GitHub Actions #40590059539](https://github.com/libanius/BrightScale-Tracker/actions/runs/40590059539) **3/3 jobs SUCCESS**: **Node 11/11, Chrome 13/13, PostgreSQL 17 com 21 tabelas RLS, API PostgREST e JWT HS256 assinados fictícios PASS**. Verificou CO client decision/decline/activate, termos privados, solicitação por cliente/sub, anti-spoofing, autorizações PM, crédito de adicional, original preservado e revogação. Nada disso equivale a Supabase Auth OTP real.
- **NOVO — PR #6, integração visual da aba COs:** [draft empilhado sobre PR #5](https://github.com/libanius/BrightScale-Tracker/pull/6), branch `feat/co-navigation-integration-preview`. `index.html` recebeu quarta aba **COs**, mantendo Projetos/Relatorios/Ajustes, exibe um walkthrough com 100% de dados fictícios e sem rede, IndexedDB, cloud, projeto real ou pagamento. `co-preview.js` fornece lógica de estado em memória: PM envia, cliente aceita/recusa, PM ativa, sub reporta e PM valida crédito fictício isolado. Mostra preço ao cliente sem custo do sub, e sub sem preço ao cliente. Botão de abrir o `staging/pilot.html` existe **apenas para localhost/preview Cloudflare**; hostname de produção fica desabilitado. `staging/pilot-ui.js` também impede **login** em qualquer origem que não seja localhost ou preview; teste Chrome simula hostname de produção sem acesso à rede real. **PR #6 não merged, não deployed e a UI simulada NÃO opera CO real.**
- **Evidência PR #6 mais recente:** [GitHub Actions #40600506006](https://github.com/libanius/BrightScale-Tracker/actions/runs/40600506006) **2/2 jobs SUCCESS: Node 8/8 + Chrome 5/5 em index.html real com TrackerCloud mockado, rede bloqueada e contrato original preservado**. [Inherited staging CI #40600505971](https://github.com/libanius/BrightScale-Tracker/actions/runs/40600505971) **3/3 jobs SUCCESS: Node 11/11, Chrome 14/14 (inclui bloqueio de staging no hostname produtivo), PostgreSQL 17 + PostgREST JWT sintético e 21 tabelas RLS**. Nenhuma chamada remota real em Chrome.
- **PR #6 DIRECT IPHONE DEMO (latest iOS unblock):** `co-demo.html` added on branch `feat/co-navigation-integration-preview` to bypass IndexedDB failure of existing `index.html`. Direct preview URL: https://feat-co-navigation-integration-preview-brightscale-tracker.brightscalegroup.workers.dev/co-demo.html . **Only simulation**, no login/cloud/IDB/network, no project data, all fake. [Node/Chrome CI #40602162705](https://github.com/libanius/BrightScale-Tracker/actions/runs/40602162705) success. **Legacy DB failure remains to debug**, don't recommend clearing offline user data.
- **LATEST UX DESIGN REVISION — PR #7 (DRAFT):** approved work to create 3 redesigned PM Dashboard / Project Details / Change Orders screens with larger type, wider spacing, rounded cards and BrightScale #18C95F. Preview HTML/brief committed on branch `design/ux-revision-2`; no backend, production or real project changes. Three mobile and desktop renderings locally tested. **Visual sign-off pending.** Figma blank file created but Figma Starter MCP limit prevented editable designs. [PR #7](https://github.com/libanius/BrightScale-Tracker/pull/7).
- **LATEST UI REVIEW (2026-10-27):** User chose **Option B** for a visual Revision 2: larger type/spacing and rounded cards in the three main screens. [PR #8 draft](https://github.com/libanius/BrightScale-Tracker/pull/8), separate `design/ux-revision-2-review` branch; [standalone Cloudflare preview](https://design-ux-revision-2-review-brightscale-tracker.brightscalegroup.workers.dev/ux-revision-2.html) built/deployed SUCCESS for preview ONLY. Single-file UX mockups, no user/project data, no real Auth/IndexedDB/network, all fictional; local Chromium viewport and role-presentation tests PASS. Figma editable 3 screens blocked by Starter rate limit; **do not claim designed screens in Figma or React/Motion implementation**. See [redesign brief](BRIGHTSCALE_TRACKER_REDESIGN_2026-10-27.md).
- **DESIGN APPROVAL CONFIRMED 2026-10-28:** owner explicitly approved three-screen **UX Revision 2** (Dashboard PM, Project Detail, Change Orders) with larger type, spacing, rounder application cards. This is **VISUAL APPROVAL ONLY**, NOT PR #8 merge, React/Motion completion, live Supabase integration or production deployment. [Design brief](BRIGHTSCALE_TRACKER_REDESIGN_2026-10-27.md) now records `APPROVED DESIGN`. User then asked where to enter percent visually inspected on site: **new mock currently only displays fixed sample percentages**; legacy `index.html` supports `Projetos > Project > Unit > Progresso por Scope > Task/✏️ > Editar Task > Progresso slider 0–100 step 5 > Salvar`. Needed future UX: PM field observation (0–100 with optional evidence) distinct from sub-reported and PM-validated progress; explicit PM validation before official credit, original baseline/CO financial/audit protections intact. This is UX placement within decisions 7–10, 29–39, **not decision 40**.
- **Condições de staging:** conta Supabase conectada usa plano Free com 2 projetos ativos (Abre-USA e brightscale-scanner); projeto separado STAGING **NÃO CRIADO** devido à cota. Não pausar projetos, não reutilizar banco compartilhado, não promover plano/cobrar sem autorização.
- **Prioridade expressa pelo usuário:** titular fará **mais tarde** o teste manual dos três perfis (PM/sub/cliente); não interromper o desenvolvimento para repetir solicitação de staging agora. **Antes de liberar para clientes/subs reais**, continuam obrigatórias validação Auth/JWT/RLS em ambiente real, assinatura contratual formal, comunicação e QA das permissões/tenant.
- **Próxima etapa técnica (sem entrevista):** a integração **VISUAL** da aba COs está TESTED no PR #6, mas a ligação operacional ao Tracker continua **BLOCKED** sem novo backend, validação de permissões reais e migração/compatibilidade de project IDs. Próximo trabalho: desenhar/adotar um mapping explícito de `tracker.projects`/empresa para Change Orders, sem copiar dados reais ao banco público do piloto e sem escrever em produção; testar com projetos fictícios e fluxo PM/sub/cliente. Depois assinatura digital formal, emails, anexos, controles de fase/inspeção e QA offline. Nenhuma decisão 40.

## Log de continuidade

### 2026-10-28 — Auditoria de fechamento: recibos, isolamento e domínio principal
- **IMPLEMENTED / DEPLOYED:** correção do shadowing de `URL` no endpoint de recibos, publicado como v2. Novos testes executam o handler inteiro; validam CORS, falta de configuração, identidade inválida, PM não proprietário e envio sintético para destinatário resolvido no servidor.
- **CORREÇÃO FACTUAL:** handoff/README diziam que o scaffold abandonado estava protegido; catálogo e advisor mostraram dez tabelas `tracker.pilot_*` com RLS desligado/grant authenticated. SQL versionado `live/sql/secure-abandoned-pilot.sql` aplicado como migration `tracker_secure_abandoned_pilot`; dados preservados, nenhuma tabela live/public/private modificada. Verificação remota 40/40 live RLS, 10/10 piloto RLS, zero grants expostos. Aviso RLS-disabled eliminado; avisos existentes de outros serviços não foram alterados.
- **TESTED LOCAL:** `npm test` 34/34; `npm run test:sql` 37 verificações e herdadas PASS; `npm run test:live-schema` PASS, incluindo repetição da correção e preservação de linha sintética; `npm run build` PASS. Sem mudança de bundle.
- **TESTED REMOTE:** recibos OPTIONS origem Tracker 204, POST sem autenticação 401 e origem externa 403. Tela principal de `/workspace/` aberta no navegador e conectada, sem efetuar login nem enviar convites. SMTP/Resend não encontrado no Vault e fila de recibos vazia; envio/entrega real continua BLOCKED.
- **DOCS:** README do workspace reconciliado com autorização e ambiente live atuais; instruções antigas de staging identificadas como históricas.
- **NEXT:** configurar chave e remetente de recibos por canal seguro; proprietário validar OTP e estimate real, sem afirmar conclusão de campo. Recursos avançados e Stripe automático mantidos posteriores.

### 2026-10-28 — Correção de campo: marcos e arredondamento
- **IMPLEMENTED:** percentuais de marcos importados convertidos para centavos por alocação de maior resto com aritmética inteira; cronograma de 100% soma exatamente o contrato, cronograma parcial conserva seu percentual. Não normaliza percentuais acima de 100 nem altera preços contratuais.
- **UX FIX:** Conferir plano validava marcos antes de permitir acesso ao editor na Revisão. Agora permite chegar ao editor; salvar mantém validação integral e backend inalterado. Revisão mostra contrato, total e excesso explícito.
- **TESTED LOCAL:** 30 Node PASS, incluindo contrato ímpar, cronogramas parciais, percentuais fracionários, 597 combinações de centavos e não normalização de sobrecobrança; frontend build PASS. Novo browser cobre upload com US$100.01/50-50 e edição de excesso. Documento real causador do screenshot não disponível para conferir se foi centavo ou percentual errado; não afirmar diagnóstico específico do documento.
- **RELEASE:** PR #11 merged, código `08d29364bfbe9adb171100ce8f76e9ce6d3e59d4`, merge `cf435acf06b091da58d2c1703b13124436431b7c`. Mesmo preview do proprietário atualizado por fast-forward. Quatro suítes CI SUCCESS: workspace #40689790744 (30 Node, SQL/build, 7 browser), RLS #40689790983, regressões #40689790908, guardrails #40689790964.
- **NEXT:** repetir importação e revisar os valores antes de salvar. Documento real não inspecionado; se houver excesso real, o PM deve corrigir a sugestão. Sem alteração Supabase/pagamentos.


### 2026-10-28 — Correção de campo: documento antes das perguntas SMART
- **IMPLEMENTED:** seleção PDF/TXT lê texto e chama a IA automaticamente, preenchendo projeto, cliente, endereço, valor, termos, datas explícitas e contexto SMART. Pendências aparecem para confirmação; retirado bloqueio que exigia digitar escopo/restrições antes da análise. JSON de plano é importado sem nova chamada.
- **UX:** estado local de leitura/análise, formulário bloqueado durante processamento, texto preservado após falha e botão de repetição. Revisão PM continua obrigatória; nenhuma licença/ausência de restrições presumida. PDF somente imagem continua sem OCR nesta versão.
- **REMOTE:** planner Edge v2 ACTIVE, schema smart_context nullable e schedule com datas de execução explícitas; autenticação PM existente preservada. Nenhuma alteração de banco.
- **TESTED LOCAL:** 29 testes Node PASS, frontend build PASS. Duas regressões browser adicionadas (auto preenchimento e falha/repetição); execução local indisponível por ausência do pacote Playwright, aguardando CI. Análise remota desta nova versão com documento do usuário ainda não observada.
- **RELEASE VERIFIED:** PR #10 merged, quatro suítes CI finais SUCCESS; preview usado pelo proprietário atualizado e tela de importação automática conferida. Próximo: repetir upload do documento real, revisar extração/lacunas. Não afirmar extração completa de documento desconhecido.


### 2026-10-28 — Fase 7: publicação conectada concluída
- **IMPLEMENTED / DEPLOYED:** PR #9 integrado a main, merge `b8f47103fa2cc98974fd595980c9bbd4bafc4539`; Workers Builds SUCCESS. Workspace em `/workspace/`, legado preservado na raiz.
- **TESTED:** quatro suítes CI SUCCESS (workspace 40684759792, RLS 40684759699, browser regressions 40684759717, guardrails 40684759672). Testes remotos 16/16 e IA HTTP200 previamente registrados.
- **BROWSER:** preview mostra conexão automática e login por e-mail. Inspeção da aba de erro anterior de produção bloqueada pelo browser URL policy; nenhum contorno. OTP/invite delivery e obra real ainda não aceitos pelo proprietário.
- **LIMIT:** cópias automáticas de recibos dependem de RESEND_API_KEY, botão de envio ocultado e download disponível. Workspace exige rede para gravações; recursos avançados continuam fora deste MVP.
- **NEXT:** proprietário abrir workspace, entrar com conta BrightScale autorizada e testar estimate real; validar entrega de Auth e, quando fornecida, configurar chave de cópias.


### 2026-10-28 — Fase 6: ambiente existente autorizado e conexão live validada
- **DECIDED:** autorização explícita de reutilização do Supabase atual, dados Tracker descartáveis; preservados serviços alheios e os dados existentes por implementação aditiva.
- **IMPLEMENTED REMOTE:** schema tracker/live_* e tracker_private/workspace_*; endpoints de IA, cópias e vínculo/convite de equipe; 40 tabelas RLS. Frontend deixa de exigir configuração manual e mantém distinção de papéis/valores.
- **TESTED LIVE:** 16 verificações Auth real/JWT/RLS e IA HTTP 200; nenhuma simulação de SDK nessa etapa. Auth temporário limpo; probe desativado. Projeto demonstrativo identificado como TESTE LIVE, sem pagamentos verdadeiros.
- **BLOCKED somente para cópias por e-mail:** ausência de RESEND_API_KEY; fila e downloads mantidos. Login/convite Auth é serviço separado e requer teste de entrega no e-mail do usuário.
- **NEXT:** concluir CI/publicação da UI conectada e teste de campo acompanhado do proprietário. Sem nova entrevista de produto e sem custo/plano extra.


### 2026-10-28 — Fase 5 sincronizada: PR #9, CI e preview verificados
- **SYNCED:** PR #9 draft, commit `2b2542bc958db45f9cb2e9b271e75487132a13c3`. Árvore remota igual à árvore local testada; integridade dos blobs conferida. A rejeição automática inicial de egress foi resolvida por inspeção do payload e verificação do destino; uso do conector autenticado resolveu a ausência de credencial do terminal. Não houve bypass nem nova transmissão de documentos privados.
- **TESTED CI:** [workspace #40636930048](https://github.com/libanius/BrightScale-Tracker/actions/runs/40636930048) PASS: 26 Node, 37 verificações SQL novas + suíte herdada, build reproduzível, funções e 4 testes Chrome mobile. [RLS #40636929953](https://github.com/libanius/BrightScale-Tracker/actions/runs/40636929953) PASS: Node/Chrome/PG17 + PostgREST/JWT sintético, 40 tabelas RLS. [Guardrails #40636929986](https://github.com/libanius/BrightScale-Tracker/actions/runs/40636929986) PASS; [regressões #40636929878](https://github.com/libanius/BrightScale-Tracker/actions/runs/40636929878) PM/Client/Security/Offline PASS, health público intencionalmente skipped em PR.
- **PREVIEW:** Workers Builds SUCCESS; URL `/workspace/` aberta com browser CUA e interface carregada. https://feat-tracker-delivery-brightscale-tracker.brightscalegroup.workers.dev/workspace/ . Não é deploy no domínio de produção.
- **Fase 6 BLOCKED:** ambiente Supabase separado ainda inexistente; não pausar serviços nem gerar custos sem autorização. Login real, configurações e testes remotos de IA/cópias, compatibilidade/offline e aceitação de campo ainda pendentes. Usuário havia adiado teste manual dos três perfis; não alegar entrega final de produção nem fazer merge automático.
- **NEXT:** disponibilizar infraestrutura separada autorizada, testar OTP/JWT/RLS reais e serviços remotos, validar migração e piloto de obra antes da liberação final. Sem pergunta 40 e sem novos handoffs concorrentes.


### 2026-10-28 — Fase 5: jornada integrada e pacote de liberação
- **IMPLEMENTED (local):** React/Motion, PDF.js local, adapter RLS sem seletor de papel; SQL 005 (cadastro, pesos, equipe, termos, evidências, gates, observação/validação, eventos, assinaturas, fila de e-mail, financeiro manual e fechamento); endpoints isolados para IA e cópias de aceite.
- **TESTED:** 26 testes Node, 37 verificações novas SQL e suíte RLS herdada; 40 tabelas protegidas; frontend + funções compilados; 0 vulnerabilidades npm de produção reportadas. Browser CUA: PM vistoria 65% sem mudança oficial até validar, crédito anterior preservado; registro de evento; cliente vê preço do cliente, sub vê somente subcontrato/crédito; wizard preserva valores até revisão. Dados 100% sintéticos.
- **Correções verificadas:** UUID compatível com HTTP, pesos visíveis, proteção contra respostas tardias após troca de identidade, gate de fase, recibo não pode quitar dois milestones, restrição de evidência inclusive após fechamento, CO exige assinatura para ativar no workspace.
- **Não verificado:** Supabase Auth/GoTrue remoto, browser CI mobile, envio/entrega real de e-mail, modelo IA real, uso de campo e migração de produção. Sem qualquer alegação de validade jurídica definitiva de assinaturas.
- **Documentação:** `workspace/README.md`; este handoff continua sendo a única referência viva. Nenhum novo handoff concorrente.
- **NEXT:** sincronizar apenas código/dados fictícios para a branch do repositório identificado, rodar CI, manter fase 6 bloqueada enquanto requisitos remotos estiverem pendentes.


### 2026-10-28 — Fases 2–4: cadastro, equipe, valores e execução no workspace
- **IMPLEMENTED local:** `staging/sql/005_workspace.sql`: criação atômica e idempotente de projeto revisado; cliente e contrato; pessoas reutilizáveis por PM; escopos e tarefas com pesos explícitos e critérios; documentos privados; vistoria e validação PM separadas de créditos; eventos/correções/restrições; marcos e registros manuais de movimentações.
- **TESTED:** PostgreSQL em WASM (PGlite): migrações 001–005, suíte SQL/RLS herdada PASS e 25 verificações novas PASS. Não equivale a Supabase Auth ou HTTP remoto.
- **IMPLEMENTED local:** interface `workspace/` em React/Motion com linguagem visual aprovada, upload PDF/TXT/JSON e leitura PDF local, contexto SMART, revisão de dados/equipe/pesos/marcos, cadastro de subs, detalhe de tarefas, vistorias, eventos, anexos e financeiro. Backend responde por RLS; nenhuma troca de papel autoritativa no frontend.
- **TESTED:** Node 24/24 PASS e build esbuild PASS. Browser identificou `crypto.randomUUID` indisponível em preview HTTP; corrigido com UUID via `crypto.getRandomValues`. Nova rodada de browser em andamento.
- **BLOCKED / NOT SYNCED:** primeira tentativa de `git push` foi rejeitada pela revisão automática por destino/egress não explicitamente autorizado e possível conteúdo privado; não houve bypass nem nova tentativa. Commits estão locais até resolver autorização/provar payload. Supabase remoto separado continua ausente. Nenhum merge/deploy/migração de produção.
- **Limites:** aceite autenticado com snapshot/hash não equivale a assinatura formal validada/cópia por e-mail; integração final da IA, gates e uso remoto ainda em execução. Sem pagamentos automáticos, dados reais ou acesso a schemas compartilhados.
- **NEXT:** concluir QA browser, fluxo de IA isolado, testes de integração e pacote revisável; preparar release sem alegar conclusão operacional enquanto Auth remoto estiver bloqueado.


### 2026-10-28 — Fase 1: integração para entrega iniciada
- **IMPLEMENTED (branch):** backend PR #5 consolidado com main; guardrails PR #2 reaplicados, sem apagar dados/arquivos/branches.
- **TESTED:** Node guardrails 8/8, gateway 11/11. Teste HTTP não executado por ausência de serviço local; isto não comprova falha de RLS.
- **Verificado:** dois projetos Supabase existentes; ambiente separado não provisionado. Produção sem alterações.
- **NEXT:** novo cadastro atômico, equipe/valores e execução no design aprovado.


### 2026-10-28 — Owner APPROVES UX Revision 2; field progress editing clarified
- **Approval:** user explicitly responded “Está muito bom. Pode registrar aprovado.” Design Review **APPROVED** for the 3 UX screens and responsive style, not a release authorization. PR #8 still draft/unmerged; `main/index.html` unchanged. Ratified in [design brief](BRIGHTSCALE_TRACKER_REDESIGN_2026-10-27.md).
- **Question:** user wishes to walk a job and note “tantos porcento está pronto.” **Current UX Revision 2 sample progress is hard-coded and not editable**.
- **Legacy UI verified in source:** `Projetos → projeto → Unit → Progresso por Scope → expand scope → tap Task/pencil → Editar Task → Progresso slider 0–100 step 5 → Salvar`. Writes directly to `tasks.progress`, recalculating scope/unit/project display and cloud sync; **does NOT fulfill new audited reported/observed/validated separation**.
- **Target design, not yet implemented:** on PM Project Detail, open a phase and task, tap `Registrar progresso da vistoria`, enter 0–100 with optional note/photos and record actor/time; treat this as **observed**, not automatically official validated/credited. PM may separately validate after acceptance checks. No silent baseline edits, CO merging, client/sub financial leakage or automatic payments. Keep decided rules 1–39 intact; no decision 40.
- **Next:** user UX review of location/control and an isolated interactive progress editor mock, then eventual implementation into authenticated workflows.


### 2026-10-27 — UX Revision 2: larger type, spacing and rounded cards; public design-only preview, no prod
- **Owner selection:** option **B** — revise the 3 main screens (PM dashboard, project details, Change Orders) with more readable typography, more whitespace and softer card radius. This is approval of **design work**, not final production visual or a technical release.
- **Delivered:** standalone UX concept at [PR #8 draft](https://github.com/libanius/BrightScale-Tracker/pull/8) in branch `design/ux-revision-2-review`, path `ux-revision-2.html`. Isolated Cloudflare preview: https://design-ux-revision-2-review-brightscale-tracker.brightscalegroup.workers.dev/ux-revision-2.html . Cloudflare reported build + preview deploy **SUCCESS** for `f2933a346d3d985f6747bde17c14711b2f5f81c1`. No merge, no deploy to `tracker.brightscalegroup.com`.
- **Design specifics:** mobile headline ~34px, more legible secondary text, button minimum 48px, card padding up to 22–26px, card radius 22–26px. Explicit owner-approved softening of *application cards*, not official logo SVG geometry. Brand uses `#18C95F`, dark readable `#0B7A37`, Montserrat-first fallback, neutral light backgrounds. Source mark geometry from public repo SVG; official private Brand Kit ZIP was NOT uploaded or committed. Final implementation should use exact official Remodeling lockup.
- **Security and semantics:** all projects/prices/approvals/credits fictional. No IndexedDB, localStorage, auth, fetch, sync, Supabase, payments or contract edits. Role switch is **preview only**, never RLS/auth; 7-phase PM project rail and Change Orders with separate financial views are design concepts.
- **Verification:** local Chromium: 3 screens at 393px and 1440px, role privacy presentation, CO select and design modal; viewports 320, 360, 375, 390, 430, 768, 1024, 1440px tested with browser storage/network disabled; no overflow, no console errors. These are design tests, not Supabase production tests.
- **Figma:** previous foundation Figma file remains, but Starter tool limit interrupted creating editable 3 screens. Do not present empty/new file as having screens. **Next:** user review, then Figma editable screens and eventual React/Motion UI on a separate approved branch. Motion for React is **not implemented yet**.
- **Design brief updated:** [docs/BRIGHTSCALE_TRACKER_REDESIGN_2026-10-27.md](BRIGHTSCALE_TRACKER_REDESIGN_2026-10-27.md). Preserve decisions 1–39 and the distinction DESIGNED vs IMPLEMENTED vs PRODUCTION.


### 2026-10-27 — UX Revision 2 approved for visual development (Option B); 3 responsive screens created in isolated design PR
- **Owner direction:** prioritize UI/UX redesign before continuing backend features. User approved **Option B**: revise three priority screens (PM Dashboard, Project Details, Change Orders) with **larger typography, greater spacing and softer rounded cards**, using BrightScale brand identity, Apple-inspired information hierarchy and later React + Motion. **Approval was to produce/design the revision; visual sign-off of the actual draft remains pending.** All product decisions 1–39 remain in force.
- **Draft [PR #7](https://github.com/libanius/BrightScale-Tracker/pull/7)**, branch `design/ux-revision-2`, based on `main`: `ux-preview/brightscale_tracker_ux_revision_2.html` is a standalone interactive, responsive design sample of 3 screens; `docs/UX_REVISION_2_BRIEF.md` records visual tokens, role privacy, Motion handoff and technical separation. PR **DRAFT, not merged**; no production app or database changed. Cloudflare Workers **branch preview build SUCCESS**, but public URL not independently verified from within this chat.
- **Brand system proposal:** recorded BrightScale Remodeling palette `#18C95F`, black, white; Montserrat-first typography with system fallback, primary cards ~22px radius, control radius ~12px; mobile-first navigation with generous spacing and presentation of progress, audit and PM decisions. Canva connector returned no Brand Kit records; final logo variant must be verified before production.
- **Visual QA performed:** direct local Chromium rendered all three screens at **393px** and **1440px**; no horizontal overflow, no JS errors; validated role-preview financial fields (client cannot see sub pricing or credit, sub cannot see client contract price) and clickable demo-only modals/CO list. **Preview is not authenticating real roles** and has no network, IndexedDB, Supabase, storage, contract changes, payments or backend.
- **Figma:** `https://www.figma.com/design/oXeiZ9g4kbkoEbtZxKaRv7` was **created but remains empty** because Figma Starter MCP usage limit stopped editable layers. Do not falsely claim screens are in Figma. Portable HTML preview + screenshots and design brief delivered in conversation; future Astra/Figma agent can port approved screens into editable frames.
- **Next:** user reviews the new three-screen draft on iPhone/desktop; capture specific visual corrections; only after visual approval port into reusable React/Motion components and test actual Supabase Auth/RLS in approved isolated staging prior to release. Keep all existing financial boundaries, Smart Delay Control governance, and immutable original baseline intact.


### 2026-10-27 — Brand-led UI redesign direction approved; official uploaded brand ZIP verified
- **Approval:** user approved a design-first reset. Preserve product decisions 1–39; stop adding technical UI cards until design hierarchy for Dashboard/Project Detail/Change Orders is reviewed.
- **Official source:** user-provided `BrightScale-Remodeling-Brand-Kit.zip` containing `BRAND.md`, `tokens.json`, `tokens.css` and original SVG/PNG logos. Brand rules: Remodeling name, no retired CONTRACTOR logo; #18C95F, #000000, #F5F5F5, Montserrat Bold/Light, square geometry, restrained green use. Details in [design brief](https://github.com/libanius/BrightScale-Tracker/blob/main/docs/BRIGHTSCALE_TRACKER_REDESIGN_2026-10-27.md).
- **Figma:** [Brand foundations file](https://www.figma.com/design/0Zy3vLGc5Tfi2SoFlgcr4E) created with 16 tokens, 6 Montserrat text styles, palette and original official logo mark specimen. Tool reached Starter rate limit: **three screens are not in Figma** at this time. Do not silently assume they exist.
- **Alternative delivered:** local standalone responsive HTML with three design concept screens (PM dashboard, Project Detail, Change Orders), real original logo SVGs and role-sensitive visual CO simulation. HTML/screenshot/ZIP are conversation-local artifacts, **not deployed or committed as app code**. Browser smoke confirmed simulated client/PM/sub actions and separated sample amounts. All illustrated data is fake.
- **Next:** user reviews concept; iterate on Figma when capacity becomes available; use Apple HIG/Impeccable/Taste/Emil Kowalski as design guidance and Motion for React after approval, respecting reduced-motion and accessibility. No production or Supabase change.


### 2026-10-27 — iPhone preview blocked by IndexedDB; independent CO mobile demo created and tested
- **Reported issue:** screenshot from iPhone in-app browser loading Cloudflare PR #6 preview displayed `Failed to execute 'transaction' on 'IDBDatabase': The database connection is closing`, followed by `Erro ao abrir o app`. This proves legacy app initialization failed in that environment; precise root cause of database closing is unverified. **Do not advise clearing browser data/storage** because it may contain local/offline projects.
- **Fixed availability for visual preview, not the legacy DB issue:** [new direct `co-demo.html`](https://github.com/libanius/BrightScale-Tracker/blob/feat/co-navigation-integration-preview/co-demo.html) on PR #6 branch, independent from `index.html`. Open `https://feat-co-navigation-integration-preview-brightscale-tracker.brightscalegroup.workers.dev/co-demo.html`. Mobile-first visual CO walkthrough with PM/client/sub fictitious views, approval/recusal, activation, reporting and PM credit validation. Uses only `co-preview.js`; no Auth, cloud, IndexedDB, local/session storage, SW, external scripts, network or payments; does not mutate real Tracker.
- **Verified tests:** [GitHub Actions #40602162705](https://github.com/libanius/BrightScale-Tracker/actions/runs/40602162705) **SUCCESS**: Node 9/9, legacy index mocked Chrome 5/5, direct standalone mobile Chrome 4/4 with IndexedDB/storage forcibly unavailable and all external network blocked. [Inherited staging security run #40602162702](https://github.com/libanius/BrightScale-Tracker/actions/runs/40602162702) SUCCESS. Cloudflare Workers preview build for commit `71db25b191d044782a29f4720097c6c31cf7843d` SUCCESS.
- **Status distinction:** independent UI demo `IMPLEMENTED & TESTED IN PR #6 PREVIEW`, not real CO execution, not `main`, not production deployed. The legacy IndexedDB crash is **not yet repaired**, only bypassed for this safe visual demonstration. PR #6 remains draft/stacked over PR #5.
- **Next:** have user open the direct `co-demo.html` route, and later investigate iOS IndexedDB connection/close/reload safely; preserve all user data and decisions 1–39.


### 2026-10-27 — PR #6: entrada COs integrada à interface principal como preview 100% sintético
- **Estado:** `IMPLEMENTED IN PR #6 BRANCH`, `TESTED NODE 8/8 + REAL CHROME 5/5` e testes herdados PR #5 `Node 11/11 + Chrome 14/14 + PG17/PostgREST JWT/RLS PASS`. **NOT MERGED, NOT DEPLOYED, NOT SUPABASE AUTH TESTED, NOT FIELD VALIDATED**. PR #6 é `draft` **baseado na branch do PR #5** (stacked, não `main`).
- **Arquivos:** `index.html` — nova aba COs e renderização sem vínculo com projetos atuais, estilo existente mantido. `co-preview.js` — engine exclusivamente em memória, posições PM/cliente/sub fictícias, ações de proposta/aceite/ativação/reporte/validação simuladas, valores fictícios segregados, pagamento sempre falso, link de staging somente em localhost/Cloudflare preview. `staging/pilot-ui.js` — proteção que bloqueia login inteiro em hostname de produção e origens não-preview. `tests/co-preview.test.cjs`, `tests/browser/test_co_navigation.py`, fixture `tests/browser/fixtures/tracker-cloud.mock.js`, atualização `tests/browser/test_staging_portal.py`; workflow `.github/workflows/co-navigation-integration.yml`.
- **CI atestado:** [Actions #40600506006](https://github.com/libanius/BrightScale-Tracker/actions/runs/40600506006) **SUCCESS Node 8/8 e Chrome 5/5**; [Actions #40600505971](https://github.com/libanius/BrightScale-Tracker/actions/runs/40600505971) **SUCCESS Node 11/11 e Chrome 14/14 mais banco RLS/HTTP JWT assinado**. Browser real abriu `index.html` com autenticação cloud mockada, bloqueou e registrou requisições externas, percorreu CO, checou privacidade financeira e verificou que contrato legado fictício/IndexedDB e outbox não sofreram gravações pelos comandos de CO; redirecionamento para staging não transporta IDs de obra.
- **Não declarar:** a aba é um preview **DEMO, NÃO É O BACKEND REAL DE CO**. Alterar papel nessa simulação NÃO equivale a autenticação. O backend com regras de CO no PR #5 continua isolado no portal `staging/pilot.html`, sem Supabase Auth/contas reais, sem instância remota, sem assinatura digital, emails, anexos ou integração definitiva no projeto real.
- **NEXT:** avaliar mapping explícito e seguro do tenant/projeto `tracker` para o backend de CO e realizar integração funcional somente em backend de staging novo aprovado, não no Supabase público compartilhado. O usuário fará testes com três perfis reais posteriormente. Preservar decisões 1–39.


### 2026-10-27 — Incremento 3/3B: Change Orders separados, solicitações PM/cliente/sub e CI aprovada
- **Estado:** `IMPLEMENTED IN PR #5 BRANCH` + `CI-TESTED`, **não MERGED, não DEPLOYED, não AUTH-TESTED no Supabase real, não FIELD-TESTED**.
- **Migrations:** `staging/sql/003_change_orders.sql` (+9 tabelas RLS) e `staging/sql/004_change_order_requests.sql` (+2); soma **21 tabelas RLS** no banco descartável com schema 001/002 anteriores. Nenhuma alteração aplicada a projeto Supabase real.
- **Workflow:** pedidos de adicional por PM/sub/cliente sem manipular autoria/preço; PM formaliza ou recusa mantendo audit; PM rascunha preços de cliente e termos privados de subs + scopes/tasks; PM envia com 100% dos pesos; cliente decide; somente PM ativa; sub reporta após ativação; PM valida progresso e crédito de CO em ledger isolado sem pagamento.
- **Auditoria/privacidade:** RLS impede cliente consultar termos internos do sub/relatórios/créditos, impede sub ver preço de cliente, impede outsider/identidade revogada. Rejeição preservada; nenhuma alteração silenciosa do original; aprovação portal piloto não é assinatura jurídica verificável.
- **Testes comprovados:** [run #40590059539 — SUCCESS](https://github.com/libanius/BrightScale-Tracker/actions/runs/40590059539): Node 11/11, Chrome 13/13, SQL PG17 + JWT HTTP PostgREST assinados em runner isolado, 21 RLS. Ver [PR #5](https://github.com/libanius/BrightScale-Tracker/pull/5) e [plano técnico](https://github.com/libanius/BrightScale-Tracker/blob/feat/staging-auth-rls-progress/docs/STAGING_PROGRESS_AUTH_PLAN.md).
- **Limites explícitos:** ainda falta integração no app PM principal (`index.html`), Auth Supabase real, signature/cópia por email, fotos, Phase Gates e teste em obra. Nenhuma conta de usuário real nem dado de produção utilizado; PR draft não tem deploy. O titular escolheu testar três papéis depois.
- **Próximo passo:** integração controlada da navegação/UI do Tracker atual e avaliação da estratégia de backend separada; não reutilizar o projeto Supabase compartilhado nem aprovar pagamento sem escopo e autorização.


### 2026-10-27 — Incremento 2: PM congela baseline original; próximos Change Orders
- **Estado:** `IMPLEMENTED (PR #5 branch only)` e `TESTED (Node 8/8; Chrome 6/6; PostgreSQL 17+RLS+JWT HTTP PASS)` na [run #40581197075](https://github.com/libanius/BrightScale-Tracker/actions/runs/40581197075). **NÃO MERGED, NÃO IMPLANTADO, NÃO TESTADO COM AUTH SUPABASE REAL**.
- **Código:** `staging/sql/002_baseline_freeze.sql` (PM-only RPC com lock, baseline completeness, guard de inserções pós-congelamento, audit event, policy de reporte condicionada ao freeze); `staging/pilot-gateway.js` (RPC); `staging/pilot-ui.js` (baseline rascunho/congelada e confirmação PM). RLS + SQL e testes Chrome/HTTP atualizados.
- **Verificado:** baseline incompleta recusada; cliente/sub não podem congelar; após congelar baseline original não aceita novos escopos/terms/tasks; sub não pode reportar enquanto baseline é rascunho; progresso válido e crédito PM pós-congelamento continuam; testes UI/Node confirmaram fluxo sintético. Imutabilidade do original é piloto, não substitui revisão contratual jurídica.
- **Revisão de prioridade:** responsável dispensou por enquanto teste com três perfis reais e informou que o fará depois. Desenvolver Change Orders independentes em branch, mantendo autorização só por PM/cliente conforme decisões 3–13, 29–39 e sem sobrescrever baseline nem créditos.
- **Segurança:** projeto Free Supabase segue no limite; nenhum schema `public/private` de produção, dado real, pagamento ou deploy alterado; PR #5 draft e PR #2 draft. Real Auth/RLS com perfis fica como teste de aceitação pendente antes de produção com subs externos.


### 2026-10-27 — Integração JWT HTTP/PostgREST verificada e cota Free Supabase confirmada; PR #2 corrigido
- **Estado:** `IMPLEMENTED (PRs #2 and #5 branches)`; `TESTED (PR2 Node+4 Chrome agents PASS; PR5 Postgres RLS + signed JWT HTTP PASS, 7 Node +4 Chrome PASS)`. **NOT MERGED, NOT REMOTE STAGING-DEPLOYED, NOT SUPABASE AUTH-TESTED, NOT FIELD-TESTED**. Decisões 1–39 preservadas.
- **PR #2:** corrigiu rodapé da branch antiga de v1.0 para **v2.0 · MVP**, acrescentou guard de versão no Node e PM Chrome e passou a usar Chrome pré-instalado. Evidência [Node #40559504678](https://github.com/libanius/BrightScale-Tracker/actions/runs/40559504678) e [agentes #40559504937](https://github.com/libanius/BrightScale-Tracker/actions/runs/40559504937), ambos PASS. Branch ainda draft, sem merge.
- **PR #5:** API PostgREST v14.17 + banco PG17 descartáveis GitHub Actions, [CI #40561373647](https://github.com/libanius/BrightScale-Tracker/actions/runs/40561373647) **3/3 jobs PASS**. JWT HS256 sintético assinado e HTTP reais, política RLS, PM/sub/cliente/outsider, crédito e revogação; corrigiu política self-lookup na leitura da nova scope após INSERT RETURNING; serializou PM approvals por scope e adicionou caso de 1 cent contra arredondamento. Removida a função CI temporária de diagnóstico. UI staging bloqueia as duas referências Supabase ativas conhecidas. **Nenhuma credencial de usuário real ou ambiente Supabase Auth consumido.**
- **Bloqueio externo novo:** conta Free possui dois projetos ACTIVE_HEALTHY (Abre-USA, brightscale-scanner) e limite oficial de 2 ativos; orçamento genérico 0 USD não concede terceira vaga. Nenhuma ação sobre os projetos atuais. Para staging novo é necessária uma vaga/plano autorizado; não pausar nem pagar sem consentimento.
- **Próximo passo operacional:** revisar PR #2 em preview com login simulado/real controlado, decidir promoção segura a produção separadamente; preparar checklist de Auth OTP/GoTrue para ambiente novo quando houver quota autorizada. Não acrescentar entrevista de produto.


### 2026-10-27 — Portal STAGING PM/sub/cliente codificado e testado no navegador (PR #5)
- **Estado:** `IMPLEMENTED (PR #5 BRANCH ONLY)`, `TESTED (CI mock Chrome 4/4, Node 7/7, PostgreSQL 17+RLS PASS)`; **NOT DEPLOYED, NOT AUTHENTICATED IN LIVE SUPABASE, NOT FIELD VALIDATED**.
- **Código:** `staging/pilot.html` (portal mobile e OTP), `staging/pilot-ui.js` (telas próprias de PM/sub/cliente), `staging/pilot-gateway.js` (API PostgREST e RPC sem parâmetro de papel autoritativo), testes Node `tests/staging-gateway.test.cjs`, browser `tests/browser/test_staging_portal.py` e fixture `tests/browser/fixtures/staging-supabase.mock.js`. SDK supabase-js fixado na versão 2.118.0.
- **Segurança/cálculo:** backend de staging bloqueia soma de pesos >100% em um escopo, inclusive sob concorrência, e créditos agregados acima do subcontrato; teste SQL de tentativa inválida. Cliente UI não solicita tabelas financeiras nem reportes privados; RLS é barreira principal. Não há pagamento ou alteração contratual.
- **Prova:** [GitHub Actions #40521210215](https://github.com/libanius/BrightScale-Tracker/actions/runs/40521210215) **3/3 jobs PASS**, testes JS 7/7, Chrome 4/4 e SQL/PostgreSQL PASS; versões intermediárias de CI falharam e foram corrigidas antes do resultado final. Ver [PR #5](https://github.com/libanius/BrightScale-Tracker/pull/5) e [documentação da tela](https://github.com/libanius/BrightScale-Tracker/blob/feat/staging-auth-rls-progress/docs/STAGING_PROGRESS_AUTH_PLAN.md).
- **Limites e riscos:** Supabase staging separado NÃO foi criado. O Chrome usa usuário/SDK fictícios e bloqueia rede externa; a UI de OTP é código pronto para autenticação, **não foi testada com credenciais reais**. Provisionamento e aplicação SQL precisam de projeto **novo e vazio**, sem `public/private` de produção. Criação de escopo e termos envolve duas chamadas não atômicas; revisar governança da baseline, atribuição e auditoria antes de obra real. O repositório continua público.
- **Próximo passo:** concluir revisão técnica e smoke do PR #2 e depois provisionar staging separado sob autorização/limite confirmado; validar tokens Supabase e negativas reais por papel antes de qualquer merge/deploy do PR #5.


### 2026-10-27 — Decisão 39 ratificada e entrevista ENCERRADA; retomada do MVP (DOCS-ONLY)
- **Estado:** `DECIDED (1–39)`; **entrevista encerrada por instrução do responsável**. Decisão 39 não está `IMPLEMENTED` nem `TESTED`. PRs #2, #4 e #5 continuam rascunhos abertos, conforme consulta GitHub nesta sessão; nenhum novo deploy do app.
- **Regra aprovada:** histórico operacional não é sobrescrito; correções criam eventos vinculados com autor, data/hora e motivo. PM pode restringir prontamente acesso a registros incorretos/sensíveis; preservar evidência sob acesso protegido apenas conforme retenção, exclusão ou anonimização legalmente aplicáveis. Logs e projeções públicas nunca devem vazar material ocultado.
- **Compatibilidade:** nenhuma modificação implícita de baseline, CO, assinatura, crédito reconhecido, pagamento, avaliação operacional/responsabilidade ou prova de aceite. IA não determina culpa ou penalidade.
- **Ação tomada:** atualização do handoff canônico, protocolo e instruções de agentes, sem alteração de app, Supabase, dados, credenciais ou deployment; nenhum teste de aplicação executado nesta sessão.
- **Próximo passo verificável:** revisar PR #2 e validar guardrails em preview/sandbox, depois evoluir fluxo sub → PM → crédito a partir dos PRs #4/#5 em staging separado com autorização e testes reais de login/RLS.


### 2026-10-27 — Decisão 38 ratificada: evidências, avaliação PM, manifestação do sub (DOCS-ONLY)
- **Estado:** `DECIDED`; **não `IMPLEMENTED` nem `TESTED`**. Pedido explícito do responsável, sem revogação das decisões 1–37.
- **Decisão:** IA analisa evidências, sugere hipóteses de causa; PM valida avaliação operacional; sub pode apresentar versão ou contestação. Preservar propostas/versões distintas, documentos vinculados, autores, datas, justificativas e status sem apagar divergências.
- **Proteções:** não presumir culpa definitiva ou responsabilidade jurídica, aplicar penalidades, deduzir créditos, fazer pagamentos ou alterar contratos automaticamente. Preservar baseline/COs, decisão final do PM e a separação de dados financeiros cliente/sub.
- **Escopo desta sessão:** atualização do handoff, protocolo e instruções para agentes. Nenhuma mudança de aplicativo, banco, API, automação ou deploy.
- **Próximo passo de produto:** pergunta 39 objetiva sobre como corrigir erros ou restringir dados sensíveis sem sobrescrever a trilha original; staging/MVP continuam prioritários.


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
