# 📋 GUIA: COMO CRIAR TEMPLATES PERSONALIZADOS

## 🎯 O QUE SÃO TEMPLATES?

Templates são estruturas pré-definidas de **Scopes** (fases) e **Tasks** (tarefas) que podem ser reutilizadas em múltiplas units. Eles permitem que você padronize seus processos e economize tempo.

---

## 📐 ESTRUTURA BÁSICA DO JSON

### Formato Mínimo:
```json
[
  {
    "title": "Nome do Scope",
    "weight": 0.25,
    "tasks": [
      {"title": "Task 1", "order": 1},
      {"title": "Task 2", "order": 2}
    ]
  }
]
```

### Formato Completo:
```json
[
  {
    "title": "Demolition",
    "weight": 0.15,
    "tasks": [
      {"title": "Move Furniture", "order": 1},
      {"title": "Demo Floor", "order": 2},
      {"title": "Haul Debris", "order": 3}
    ]
  },
  {
    "title": "Painting",
    "weight": 0.3,
    "tasks": [
      {"title": "Preparation", "order": 1},
      {"title": "Prime", "order": 2},
      {"title": "Paint Walls", "order": 3},
      {"title": "Paint Ceiling", "order": 4}
    ]
  }
]
```

---

## 🔑 CAMPOS EXPLICADOS

### **Scope (Obrigatório)**
Cada scope é um objeto com:

| Campo | Tipo | Obrigatório? | Descrição |
|-------|------|--------------|-----------|
| `title` | string | ✅ Sim | Nome do scope (ex: "Painting", "Tile Work") |
| `weight` | number | ❌ Não | Peso de 0.0 a 1.0 (padrão: 0.1) |
| `tasks` | array | ❌ Não | Lista de tarefas dentro do scope |

### **Task (Opcional dentro de cada scope)**
Cada task é um objeto com:

| Campo | Tipo | Obrigatório? | Descrição |
|-------|------|--------------|-----------|
| `title` | string | ✅ Sim | Nome da task (ex: "Prime", "Install Tile") |
| `order` | number | ❌ Não | Ordem de execução (padrão: 1, 2, 3...) |

---

## 💡 CONCEITO DE PESO (WEIGHT)

O **peso** determina a importância de cada scope no cálculo do progresso geral.

### Regras:
- O peso é um número de **0.0 a 1.0**
- A **soma de todos os pesos deve ser 1.0** (ou próximo)
- Scopes maiores/mais importantes = peso maior

### Exemplo:
```json
[
  {
    "title": "Demolition",
    "weight": 0.1,   // 10% do projeto
    "tasks": [...]
  },
  {
    "title": "Painting",
    "weight": 0.4,   // 40% do projeto
    "tasks": [...]
  },
  {
    "title": "Tile",
    "weight": 0.3,   // 30% do projeto
    "tasks": [...]
  },
  {
    "title": "Final Phase",
    "weight": 0.2,   // 20% do projeto
    "tasks": [...]
  }
]
```
**Total:** 0.1 + 0.4 + 0.3 + 0.2 = **1.0** ✅

---

## 📝 EXEMPLOS PRÁTICOS

### Exemplo 1: Template Simples (3 scopes)
```json
[
  {
    "title": "Preparation",
    "weight": 0.2,
    "tasks": [
      {"title": "Clean Area", "order": 1},
      {"title": "Protect Surfaces", "order": 2}
    ]
  },
  {
    "title": "Main Work",
    "weight": 0.6,
    "tasks": [
      {"title": "Install Materials", "order": 1},
      {"title": "Finish Work", "order": 2}
    ]
  },
  {
    "title": "Cleanup",
    "weight": 0.2,
    "tasks": [
      {"title": "Remove Debris", "order": 1},
      {"title": "Final Inspection", "order": 2}
    ]
  }
]
```

### Exemplo 2: Template Complexo (Electrical Work)
```json
[
  {
    "title": "Planning & Permits",
    "weight": 0.05,
    "tasks": [
      {"title": "Review Plans", "order": 1},
      {"title": "Submit Permits", "order": 2},
      {"title": "Material List", "order": 3}
    ]
  },
  {
    "title": "Rough-In",
    "weight": 0.35,
    "tasks": [
      {"title": "Run Conduit", "order": 1},
      {"title": "Pull Wire", "order": 2},
      {"title": "Install Boxes", "order": 3},
      {"title": "Rough Inspection", "order": 4}
    ]
  },
  {
    "title": "Installation",
    "weight": 0.4,
    "tasks": [
      {"title": "Install Fixtures", "order": 1},
      {"title": "Install Outlets", "order": 2},
      {"title": "Install Switches", "order": 3},
      {"title": "Install Panel", "order": 4},
      {"title": "Label Circuits", "order": 5}
    ]
  },
  {
    "title": "Testing",
    "weight": 0.15,
    "tasks": [
      {"title": "Test All Circuits", "order": 1},
      {"title": "Verify Ground", "order": 2},
      {"title": "Load Testing", "order": 3}
    ]
  },
  {
    "title": "Final Inspection",
    "weight": 0.05,
    "tasks": [
      {"title": "City Inspection", "order": 1},
      {"title": "Customer Walkthrough", "order": 2}
    ]
  }
]
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

Antes de importar seu template, verifique:

- [ ] O arquivo está no formato `.json`
- [ ] Começa com `[` e termina com `]`
- [ ] Cada scope tem `"title"` (obrigatório)
- [ ] Os pesos (weight) somam aproximadamente 1.0
- [ ] Todas as aspas são duplas `"` (não simples `'`)
- [ ] Não há vírgula após o último item de cada array
- [ ] Tasks tem `"title"` (obrigatório)
- [ ] Formato está correto (use um validador JSON online)

---

## 🚀 COMO USAR

### **Método 1: Upload de Arquivo**
1. Salve seu template como `meu-template.json`
2. No app, vá em uma Unit
3. Clique **"📥 Template"**
4. Escolha aba **"Upload Arquivo"**
5. Selecione o arquivo `.json`
6. Pronto! Scopes e tasks são criados

### **Método 2: Colar JSON**
1. Copie o JSON do template
2. No app, vá em uma Unit
3. Clique **"📥 Template"**
4. Escolha aba **"Colar JSON"**
5. Cole o JSON
6. Clique **"Importar"**

### **Método 3: Templates Padrão**
1. No app, vá em uma Unit
2. Clique **"📥 Template"**
3. Escolha aba **"Templates Padrão"**
4. Selecione: Full Remodel, Paint Only ou Tile Only
5. Clique **"Importar Template"**

---

## 🎨 DICAS DE ORGANIZAÇÃO

### Use nomes descritivos:
❌ Ruim: `"title": "Fase 1"`
✅ Bom: `"title": "Demolition & Site Prep"`

### Ordem lógica das tasks:
```json
"tasks": [
  {"title": "Measure & Mark", "order": 1},
  {"title": "Cut Materials", "order": 2},
  {"title": "Install", "order": 3},
  {"title": "Test & Verify", "order": 4}
]
```

### Pesos proporcionais:
- Trabalho rápido (1-2 dias) = 0.05 - 0.1
- Trabalho médio (3-5 dias) = 0.15 - 0.3
- Trabalho grande (1+ semana) = 0.4 - 0.6

---

## ⚠️ ERROS COMUNS

### Erro 1: JSON inválido
```json
// ❌ ERRADO (falta vírgula)
[
  {"title": "Scope 1"}
  {"title": "Scope 2"}
]

// ✅ CORRETO
[
  {"title": "Scope 1"},
  {"title": "Scope 2"}
]
```

### Erro 2: Peso total diferente de 1.0
```json
// ❌ ERRADO (soma = 0.5)
[
  {"title": "Scope 1", "weight": 0.2},
  {"title": "Scope 2", "weight": 0.3}
]

// ✅ CORRETO (soma = 1.0)
[
  {"title": "Scope 1", "weight": 0.4},
  {"title": "Scope 2", "weight": 0.6}
]
```

### Erro 3: Aspas simples
```json
// ❌ ERRADO
[
  {'title': 'Scope 1'}
]

// ✅ CORRETO
[
  {"title": "Scope 1"}
]
```

---

## 🔧 FERRAMENTAS ÚTEIS

### Validadores JSON Online:
- https://jsonlint.com
- https://jsonformatter.org

### Editores de Texto Recomendados:
- VS Code (com extensão JSON)
- Sublime Text
- Notepad++ (Windows)
- TextEdit (Mac - modo texto puro)

---

## 📞 SUPORTE

Se seu template não importar:
1. Copie o JSON
2. Cole em https://jsonlint.com
3. Veja o erro específico
4. Corrija e tente novamente

**Pronto! Agora você pode criar templates personalizados infinitos! 🎉**
