# 🔑 Setup Guide — GitHub Sync

The app's interface is currently in Portuguese. UI labels are shown below as **English (Portuguese)** so you can find them on screen.

## 📋 Step by step

### 1️⃣ Create a GitHub token (5 minutes)

On a computer or phone:

1. Go to **https://github.com/settings/personal-access-tokens** and choose **Fine-grained tokens → Generate new token**.
2. Configure it:
   ```
   Token name: BrightScale Tracker Upload
   Expiration: 1 year (or your preference)
   Repository access: Only select repositories → BrightScale-Tracker
   Permissions → Repository → Contents: Read and write
   ```
3. Click **Generate token** at the bottom of the page.
4. **⚠️ Copy the token now** — it is shown only once.
5. Store it somewhere safe.

> A fine-grained token limited to this one repository is the safest option. A classic token with the `repo` scope also works, but it can read and write **every** repository on your account.

---

### 2️⃣ Configure the app (2 minutes)

1. Open **BrightScale Tracker** on your phone.
2. Go to **Settings (Ajustes)** — the last tab.
3. In **GitHub Sync (Sincronização GitHub)**, confirm the fixed destination and paste the token:
   ```
   GitHub Username: libanius (fixed)
   Repository Name: BrightScale-Tracker (fixed)
   GitHub Token: [paste the token]
   ```
4. Tap **Save Configuration (Salvar Configuração)**.
5. Tap **Test Connection (Testar Conexão)**.
   - ✅ "Conexão OK!" (Connection OK) → you're set.
   - ❌ Error → check the token and try again.

---

### 3️⃣ Files in the repository

```
BrightScale-Tracker/
├─ index.html           ← main app
├─ dashboard.html       ← team and client dashboard
└─ dashboard-data.json  ← created and updated automatically by the app
```

---

### 4️⃣ Sync and back up your data

Every edit you save in the tracker updates `dashboard-data.json` on GitHub automatically, so the dashboards stay current. The app also blocks uploads from a device working on an outdated copy, so one phone can't overwrite changes made on another.

For a permanent snapshot, go to **Settings (Ajustes)** and tap **Create Backup Now (Criar Backup Agora)**. To roll back, use **Choose and Restore Backup (Escolher e Restaurar Backup)**, which lists the backup history stored on GitHub.

---

### 5️⃣ Share the dashboard

**Team dashboard (all projects):**
```
https://libanius.github.io/BrightScale-Tracker/dashboard.html
```

**Client dashboard (one project):** on the team dashboard, tap **Share Dashboard with Client (Compartilhar Dashboard com Cliente)** on the project card to copy a link that shows only that project.

**⚠️ Important:**
- Links have **no login** — anyone with the link can view it.
- Dashboards are **read-only** — nobody can edit through them.
- Internal daily notes appear only on the team dashboard, never on a client link.

---

## 🔄 Daily workflow

```
1. Work happens on site
   ↓
2. Update progress in the app (phone)
   ↓
3. Save — the app syncs to GitHub automatically
   ↓
4. Dashboards refresh automatically
   ↓
5. Clients, designers and the team see current progress
```

---

## 🔒 Token security

### ✅ Good practices
- The token is stored **only on your phone** (browser localStorage).
- Never share it.
- If it leaks, **revoke it immediately** and create a new one.

### 🗑️ How to revoke
1. Go to https://github.com/settings/personal-access-tokens
2. Find **BrightScale Tracker Upload**.
3. Click **Delete**, then create a new token if needed.

---

## 🐛 Troubleshooting

**"Invalid token"**
- Make sure you copied the whole token.
- Confirm it has access to `BrightScale-Tracker` with Contents: Read and write.
- Create a new token if needed.

**"Repository not found"**
- Repository name must be exactly `BrightScale-Tracker`; username `libanius`.
- The token must have access to that repository.

**Dashboard doesn't update**
- Wait 30–60 seconds (GitHub Pages takes a moment).
- Force refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows).
- Check that `dashboard-data.json` was updated on GitHub.

**"Connection error"**
- Check your internet connection and try again.
- Check GitHub's status: https://www.githubstatus.com/

---

## 📊 How it works (technical)

```
┌──────────────────────────────────────────────┐
│ Phone (BrightScale Tracker)                  │
│ ├─ IndexedDB (local data)                    │
│ └─ Save / Sync                               │
│     ↓                                        │
│ fetch('https://api.github.com/repos/...')    │
│     ↓                                        │
│ Sends the data as JSON                       │
├──────────────────────────────────────────────┤
│ GitHub repository                            │
│ ├─ index.html (app)                          │
│ ├─ dashboard.html (dashboard)                │
│ └─ dashboard-data.json ← created / updated   │
├──────────────────────────────────────────────┤
│ GitHub Pages                                 │
│ https://libanius.github.io/...               │
├──────────────────────────────────────────────┤
│ Dashboard (anyone's browser)                 │
│ ├─ Loads dashboard.html                      │
│ ├─ Reads dashboard-data.json                 │
│ └─ Renders current progress ✅               │
└──────────────────────────────────────────────┘
```

---

## ✨ Features

**In the app:** automatic sync on save · GitHub setup and Test Connection (Settings) · versioned backups and restore (Settings).

**On the dashboard:** overall stats · progress by project and unit · deadlines and days left · scopes and tasks · per-client links.

---

**Remember:** your data always lives on your phone. GitHub holds the copy that powers the dashboards and the versioned backups.
