# BrightScale Tracker 2.0 — Protocolo de continuidade entre IAs

**Versão do protocolo:** 1.0  
**Estabelecido:** 2026-10-26  
**Aprovado pelo responsável do projeto:** manter um documento central atualizado para permitir que outra LLM continue o trabalho sem recomeçar as discussões.  
**Repositório:** `libanius/BrightScale-Tracker`

## 0. Referência única

**Fonte canônica de decisões, roadmap e progresso:** [SMART_REMODELING_HANDOFF_2026-10-26.md](SMART_REMODELING_HANDOFF_2026-10-26.md).

Apesar da data no nome, este arquivo é **vivo**: atualizá-lo a cada avanço significativo. **Não gerar novos handoffs datados concorrentes**, salvo decisão explícita do usuário de arquivar/splitar. O Git history guarda as versões anteriores. Este documento é a **regra de manutenção**; o handoff contém o **estado atual**.

Arquivos de descoberta: [../AGENTS.md](../AGENTS.md), [../CLAUDE.md](../CLAUDE.md), [../.github/copilot-instructions.md](../.github/copilot-instructions.md).

## 1. Ritual OBRIGATÓRIO de início de sessão

1. Ler o handoff canônico **inteiro**, este protocolo e as instruções locais relevantes; verificar `main`, commits recentes e código afetado.
2. Reconciliar a seção **Checkpoint operacional** do handoff com o estado real do repositório, PRs, deploys e testes. Um texto de handoff não é evidência de código funcionando.
3. Continuar da última próxima ação verificável, sem repetir perguntas respondidas nem abrir uma nova entrevista. A entrevista do Smart Remodeling terminou na **decisão 34**, em 2026-10-26; a **decisão 35 não foi tomada**.
4. Priorizar o MVP testável em campo e os fluxos existentes antes de padrões avançados ou novas abstrações.
5. Se faltar uma autorização decisiva para ação de alto impacto, solicitar apenas o consentimento necessário. Caso contrário, avançar com uma mudança pequena, reversível e verificável.

**Ordem de autoridade:** instrução explícita e recente do responsável > decisões confirmadas 1–34 > código e contrato reais > propostas no handoff. Se detectar contradição, **registrar e pedir decisão pontual**, nunca reinterpretar silenciosamente.

## 2. O que deve ser documentado

Ao concluir uma sessão com mudanças no projeto, atualizar **o mesmo handoff canônico**, incluindo:

- Data e objetivo da sessão.
- **DECIDED**: somente decisões efetivamente aprovadas pelo responsável; manter número e texto da decisão anterior, corrigindo apenas erros factuais claramente demonstráveis e deixando rastro da correção.
- **PROPOSED**: sugestões ainda não aprovadas; não chamar proposta de requisito.
- **IMPLEMENTED**: funcionalidade específica, arquivos modificados, link/ID de commit ou PR e escopo técnico. Código escrito não implica publicação nem teste em campo.
- **TESTED**: comando/ambiente/data/resultado ou cenário de usuário exercitado. Diferenciar teste local, integração, staging e **FIELD-VALIDATED** (uso real observado).
- **BLOCKED**: impedimento concreto, impacto e próxima ação; não substituir informação desconhecida por suposição.
- **NEXT**: apenas 1–3 próximos passos verificáveis, em prioridade, com o mínimo de dependências.
- Estado de infraestrutura/segurança/deploy somente se **verificado**. Registrar `not checked` quando necessário.
- Riscos, regressões, decisões em aberto, documentação e migrations afetadas.

Registrar eventos no **Log de continuidade** em ordem cronológica reversa, com referência a commits/PRs quando existirem; evitar duplicar a lista de 34 decisões. A seção **Checkpoint operacional** mostra a situação atual de maneira concisa; o log guarda mudanças anteriores.

## 3. Checklist obrigatório antes de declarar entrega

- [ ] Conferiu que a mudança segue as decisões aprovadas e a separação PM/cliente/sub.
- [ ] Conferiu escopo contratual e Change Orders sem substituir contrato por sugestão da IA.
- [ ] Preservou baseline imutável, versões, assinaturas, progresso validado, créditos reconhecidos e histórico.
- [ ] Separou `reported progress` / `validated progress` / `recognized credit` / `approved payout` / `paid`.
- [ ] Nenhum sub vê valores de cliente ou margens BrightScale; nenhum cliente vê custos, contratos e finanças internos de subs.
- [ ] Respeitou RLS/roles; não misturou ambiente de Tracker com outros produtos Supabase.
- [ ] Não modificou `public` ou `private` no Supabase compartilhado (somente `tracker` e `tracker_private`, após inspeção e aprovação pertinente).
- [ ] Executou os testes possíveis e registrou o que **não** foi testado, sem alegar sucesso não verificado.
- [ ] Commit/PR contém descrição, impacto, testes, riscos e rollback onde pertinente.
- [ ] Atualizou checkpoint e log do **handoff canônico** na mesma entrega; se faltou acesso para escrita, entregou o texto/patch necessário e sinalizou **NOT SYNCED**.
- [ ] Não commitou chaves, tokens, e-mails/telefones privados, dados pessoais de cliente, PDFs de contrato, gravações ou extratos de produção.

O repositório **atualmente é público**. Verificar segurança antes de introduzir logs ou exemplos: usar dados fictícios. Histórico Git pode conter dados anteriores; não afirmar que tudo está limpo sem auditoria. Recomendar tornar privado se viável; privatizar o repositório não elimina exposição passada.

## 4. Mudanças significativas e atualizações do handoff

**Atualizar ao fim de qualquer sessão** que: (a) implemente ou teste recurso; (b) faça deploy/migração; (c) confirme decisão; (d) descubra bloqueio/risco; ou (e) altere priorização do MVP.

Se nenhuma dessas condições ocorrer, não gerar um commit vazio. O log deve conter evidências verificáveis e mensagens curtas. A atualização do handoff deve ser feita **no mesmo PR/entrega do código**, quando o fluxo de Git permitir, e somente após inspecionar o estado atual do arquivo; **não sobrescrever alterações de outra IA**. Preferir branch e PR para código, respeitando a operação atual do usuário.

### Modelo de entrada no log

```md
### YYYY-MM-DD — Objetivo da sessão
- Estado: IMPLEMENTED | TESTED | PROPOSED | BLOCKED | DOCS-ONLY
- Mudança: ...
- Evidência: commit/PR/caminho/execução observada; se não houver, "não verificado"
- Teste: comando + resultado + ambiente; ou "não executado"
- Segurança/contratos: alterações ou "sem alterações"
- Próximo passo: ...
```

### Modelo de checkpoint conciso

```md
## Checkpoint operacional (atualizar na última sessão)
- Atualizado em:
- Branch / commit:
- Último resultado comprovado:
- Produto em produção: verificado / não verificado, com evidência
- MVP: IMPLEMENTED / PARTIAL / NOT STARTED / NOT VERIFIED por área
- Testes: quais, onde, resultado:
- Bloqueios e riscos:
- Próximo passo: [ação única, concreta]
```

## 5. Auditoria, histórico e governança

- **Git commit e PR** são trilha de código; o handoff é uma síntese humana verificável. Não guardar hashes inventados nem alegações de deploy implícitas em commits.
- Decisões novas só passam a **DECIDED** mediante aprovação explícita do responsável. Se a decisão 35 ou além não foi confirmada, permanece pendente.
- Propostas de IA e Playbooks não são contratos e não alteram pesos, prazo ou condições já aprovadas.
- Ao reparar erro factual em decisão antiga, registrar **o quê / por quê / evidência** no log e preservá-la na história do Git.
- Em conflito com mudanças recentes, buscar commit/branch atual e reconciliar antes de gravar; não fazer overwrite cego.
- Toda funcionalidade que necessite aprovação externa ou assinatura mantém seu próprio controle; nenhuma alteração operacional substitui acordo cliente/sub.
- Deixar anotado se acesso a GitHub, Supabase, Cloudflare ou outro serviço estiver ausente; **não alegar sincronização** sem confirmação da ferramenta.

## 6. Encerramento da sessão e mensagem para outra IA

Antes de concluir, entregar ao responsável uma resposta objetiva:

1. **Foi feito:** com links para arquivos, PR/commit, se houver.
2. **Foi verificado:** exatamente quais testes/cenários foram realizados.
3. **Falta:** riscos, pendências e um próximo passo concreto.
4. **Handoff sincronizado:** SIM com link/commit, ou **NÃO** com instrução de aplicação do patch.

Para a próxima IA, basta: **"Leia AGENTS.md e o handoff canônico no repositório BrightScale-Tracker. Continue do Checkpoint operacional. Não reinicie a entrevista de 34 decisões e não confunda DECIDED com IMPLEMENTED."**

## 7. Limitação importante

Este protocolo é um **acordo operacional documentado**, não um processo automático que roda fora das sessões. Outras IAs precisarão ter acesso ao repositório (ou ao conteúdo enviado pelo usuário) e capacidade de editar GitHub para sincronizar alterações. Uma IA sem acesso deve fornecer um patch/handoff explícito e marcar o estado como **NOT SYNCED**, nunca afirmar que gravou. Não há monitoramento contínuo configurado por este documento.
