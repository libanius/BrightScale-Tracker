# 🔑 GUIA DE CONFIGURAÇÃO - GitHub Sync

## 📋 PASSO A PASSO COMPLETO

### **1️⃣ CRIAR TOKEN DO GITHUB (5 minutos)**

#### **No computador ou celular:**

1. Acesse: **https://github.com/settings/tokens**
2. Clique em **"Generate new token"** → **"Generate new token (classic)"**
3. Configure:
   ```
   Note: BrightScale Tracker Upload
   Expiration: No expiration (ou 1 year)
   
   Permissions (marque APENAS):
   ☑️ repo
       ☑️ repo:status
       ☑️ repo_deployment
       ☑️ public_repo
   ```
4. Clique em **"Generate token"** (no final da página)
5. **⚠️ COPIE O TOKEN AGORA!** (Vai parecer com: `ghp_xJ8kL2mN9pQ4rS5tV6wX7yZ8aB1cD2eF3`)
6. **GUARDE BEM** - só aparece uma vez!

---

### **2️⃣ CONFIGURAR NO APP (2 minutos)**

1. Abra o **BrightScale Tracker** no celular
2. Vá em **Ajustes** (última aba)
3. Na seção **"Sincronização GitHub"**, preencha:
   
   ```
   GitHub Username: libanius
   Repository Name: BrightScale-Tracker
   GitHub Token: [cole o token que copiou]
   ```

4. Clique em **"Salvar Configuração"**
5. Clique em **"Testar Conexão"**
   - ✅ Se aparecer "Conexão OK!" → Tudo certo!
   - ❌ Se der erro → Revise os dados

---

### **3️⃣ FAZER UPLOAD DOS ARQUIVOS**

No GitHub, faça upload de **2 arquivos**:

1. **index.html** (app principal)
2. **dashboard.html** (dashboard público)

```
BrightScale-Tracker/
├─ index.html          ← App principal
├─ dashboard.html      ← Dashboard público
└─ dashboard-data.json ← Será criado automaticamente
```

---

### **4️⃣ SINCRONIZAR DADOS (toda vez que atualizar)**

1. Abra o app no celular
2. Faça suas alterações (adicione tasks, atualize progresso, etc.)
3. Vá em **Relatórios**
4. Clique em **"☁️ Sincronizar Agora"**
5. Aguarde mensagem: **"✅ Sincronizado!"**
6. Pronto! Dashboard atualizado!

---

### **5️⃣ COMPARTILHAR O DASHBOARD**

#### **Link do Dashboard:**
```
https://libanius.github.io/BrightScale-Tracker/dashboard.html
```

**Envie este link para:**
- Clientes
- Equipe
- Supervisores
- Qualquer pessoa que precise acompanhar o progresso

**⚠️ Importante:**
- Link é **público** (qualquer um com o link pode ver)
- Dados são **read-only** (ninguém pode editar)
- Para atualizar, você precisa clicar "Sincronizar Agora"

---

## 🔄 WORKFLOW DIÁRIO

```
1. Trabalha no projeto (físico)
   ↓
2. Atualiza progresso no app (celular)
   ↓
3. Clica "Sincronizar Agora"
   ↓
4. Dashboard atualiza automaticamente!
   ↓
5. Clientes/equipe veem progresso atualizado
```

---

## 🔒 SEGURANÇA DO TOKEN

### **✅ Boas práticas:**
- Token fica salvo **apenas no seu celular** (localStorage)
- Nunca compartilhe o token com ninguém
- Se vazar, **revogue imediatamente** e crie novo

### **⚠️ O que o token permite:**
- ✅ Fazer upload de arquivos no SEU repositório
- ❌ NÃO permite: apagar repo, mudar configurações, acessar outros repos

### **🗑️ Como revogar (se necessário):**
1. Vá em: https://github.com/settings/tokens
2. Encontre o token "BrightScale Tracker Upload"
3. Clique em **"Delete"**
4. Crie um novo se precisar

---

## 🐛 SOLUÇÃO DE PROBLEMAS

### **Erro: "Token inválido"**
- ✅ Verifique se copiou o token completo
- ✅ Token deve começar com `ghp_`
- ✅ Crie um novo token se necessário

### **Erro: "Repositório não encontrado"**
- ✅ Verifique se o nome está correto: `BrightScale-Tracker`
- ✅ Verifique se o username está correto: `libanius`
- ✅ Repo deve ser público ou você deve ter acesso

### **Dashboard não atualiza**
- ✅ Aguarde 30-60 segundos (GitHub Pages demora)
- ✅ Force refresh: Cmd+Shift+R (Mac) ou Ctrl+Shift+R (Windows)
- ✅ Limpe cache do navegador
- ✅ Verifique se o arquivo `dashboard-data.json` foi criado no GitHub

### **"Erro de conexão"**
- ✅ Verifique sua internet
- ✅ Tente novamente em alguns segundos
- ✅ Verifique se o GitHub está funcionando: https://www.githubstatus.com/

---

## 📊 COMO FUNCIONA (TÉCNICO)

```
┌──────────────────────────────────────────────┐
│ iPhone (BrightScale Tracker)                 │
│ ├─ IndexedDB (dados locais)                  │
│ └─ Clica "Sincronizar"                       │
│     ↓                                         │
│ JavaScript faz:                               │
│ fetch('https://api.github.com/repos/...')    │
│     ↓                                         │
│ Envia JSON dos dados                          │
│     ↓                                         │
├──────────────────────────────────────────────┤
│ GitHub Repository                             │
│ ├─ index.html (app)                          │
│ ├─ dashboard.html (dashboard)                │
│ └─ dashboard-data.json ← CRIA/ATUALIZA       │
│     ↓                                         │
├──────────────────────────────────────────────┤
│ GitHub Pages                                  │
│ https://libanius.github.io/...               │
│     ↓                                         │
├──────────────────────────────────────────────┤
│ Dashboard (navegador de qualquer pessoa)     │
│ ├─ Carrega dashboard.html                    │
│ ├─ Lê dashboard-data.json                    │
│ └─ Renderiza progresso atualizado! ✅        │
└──────────────────────────────────────────────┘
```

---

## ✨ RECURSOS

### **No App:**
- ☁️ Sincronizar Agora (aba Relatórios)
- 🔑 Configurar GitHub (aba Ajustes)
- 🧪 Testar Conexão (aba Ajustes)
- 📊 Ver última sincronização

### **No Dashboard:**
- 📈 Estatísticas gerais
- 🏗️ Progresso por projeto
- 🏢 Progresso por unit
- ⏰ Deadlines e contagens
- 👷 Supervisores
- 🎨 Design profissional

---

## 📞 SUPORTE

Se tiver problemas:

1. Verifique este guia primeiro
2. Teste a conexão no app (Ajustes → Testar Conexão)
3. Revise os passos do token
4. Limpe cache do navegador

**Lembre-se:** Dados ficam **sempre no seu celular**. O GitHub é só uma cópia para o dashboard público!

---

**✅ SETUP COMPLETO!** 

Agora você pode atualizar o dashboard do seu celular com um clique! 🚀
