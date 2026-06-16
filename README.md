# BrightScale Tracker

Projeto isolado do TimeTrack.

- Repositório: `libanius/BrightScale-Tracker`
- Dados publicados: `dashboard-data.json`
- Backups versionados no GitHub: `backups/brightscale-backup-*.json`
- Backups exportados manualmente: `brightscale-backup-*.json`
- Configuração local: chaves `brightscale_*` no navegador

Arquivos antigos, planilhas e backups ficam fora deste repositório, na pasta
`BrightScale Tracker - Legacy and Backups`.

## Importação de contratos

Na página inicial, `Upload de Contrato / Estimate` aceita:

- PDF com texto selecionável;
- DOCX;
- TXT ou Markdown.

O app extrai cliente, endereço, total e itens de trabalho, permite revisar os
campos e cria automaticamente projeto, unit, scopes e tasks. O arquivo original
fica armazenado localmente no IndexedDB do aparelho e não é publicado no
dashboard GitHub.

PDFs escaneados como imagem ainda exigem OCR antes da importação.

## Dados entre dispositivos

Ao salvar edições no tracker, o app atualiza automaticamente
`dashboard-data.json`, mantendo o dashboard geral e os links por cliente em
sincronia. Em Ajustes, `Criar Backup Agora` continua criando uma cópia imutável
com data e hora. `Escolher e Restaurar Backup` lista o histórico do GitHub para
restauração. O app bloqueia uploads de aparelhos baseados em uma versão remota
antiga, evitando sobrescrever mudanças feitas em outro aparelho.

## Dashboard por cliente

O dashboard geral mostra todos os projetos para a equipe. Cada card possui
`Compartilhar Dashboard com Cliente`, que gera um link atualizado mostrando
somente o projeto selecionado. Como solução de MVP, o link não possui login:
qualquer pessoa que receber ou encaminhar o endereço poderá visualizar aquele
projeto.

Notas do `Journey de Hoje` são internas e aparecem somente no dashboard geral
da equipe. Elas não são renderizadas no link filtrado para cliente.

## Financeiro de projetos

Cada projeto possui um extrato com receita do contrato, compromissos com
subcontractors, despesas de material, horas trabalhadas e saldo projetado. No
scope é possível informar responsável, valor acordado e valor já pago. Horas de
helpers podem ser lançadas por nome, preço/hora, quantidade, data e scope
opcional. O crédito produzido é calculado automaticamente pelo progresso do
scope:

`crédito produzido = (valor acordado × progresso do scope) + horas trabalhadas`

As despesas financeiras fazem parte dos backups locais e versionados no
GitHub.

## Responsáveis

Subcontractors são cadastrados somente em Ajustes, com nome, empresa, e-mail e
status Ativo/Inativo. Cada scope pode selecionar apenas um subcontractor ativo
da lista; todas as tasks daquele scope ficam sob a responsabilidade dele.
Tasks não possuem responsável próprio.

Em Ajustes, `Abrir Cadastro de Subcontractors` permite consultar, editar,
ativar/desativar e abrir a ficha financeira consolidada. Cadastros e vínculos
também fazem parte dos backups. Nomes antigos gravados diretamente nos scopes
são migrados automaticamente como ativos.

Pwa Project manager tracker app
