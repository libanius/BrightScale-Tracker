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

Em Ajustes, `Criar Backup Agora` atualiza o dashboard e cria uma cópia
imutável com data e hora. `Escolher e Restaurar Backup` lista o histórico do
GitHub para restauração. O app bloqueia uploads de aparelhos baseados em uma
versão remota antiga, evitando sobrescrever mudanças feitas em outro aparelho.

## Dashboard por cliente

O dashboard geral mostra todos os projetos para a equipe. Cada card possui
`Compartilhar Dashboard com Cliente`, que gera um link atualizado mostrando
somente o projeto selecionado. Como solução de MVP, o link não possui login:
qualquer pessoa que receber ou encaminhar o endereço poderá visualizar aquele
projeto.

## Financeiro de projetos

Cada projeto possui um extrato com receita do contrato, compromissos com
subcontractors, despesas de material e saldo projetado. No scope é possível
informar responsável, valor acordado e valor já pago. O crédito produzido é
calculado automaticamente pelo progresso do scope:

`crédito produzido = valor acordado × progresso do scope`

As despesas financeiras fazem parte dos backups locais e versionados no
GitHub.

## Responsáveis

Responsáveis são cadastrados uma única vez com nome, empresa e e-mail. Cada
scope pode selecionar um responsável da lista; todas as tasks daquele scope
ficam sob a responsabilidade dele. Tasks não possuem responsável próprio.

Em Ajustes, `Abrir Cadastro de Responsáveis` permite consultar e editar os
cadastros e abrir a ficha financeira consolidada por responsável. Cadastros e
vínculos também fazem parte dos backups. Nomes antigos gravados diretamente nos
scopes são migrados automaticamente.

Pwa Project manager tracker app
