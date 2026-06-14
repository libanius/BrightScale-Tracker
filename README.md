# BrightScale Tracker

Projeto isolado do TimeTrack.

- Repositório: `libanius/BrightScale-Tracker`
- Dados publicados: `dashboard-data.json`
- Backups exportados: `brightscale-backup-*.json`
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
Pwa Project manager tracker app
