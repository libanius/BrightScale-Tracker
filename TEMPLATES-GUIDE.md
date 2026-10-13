# 📋 Guide: Creating Custom Templates

The app's interface is currently in Portuguese. UI labels are shown below as **English (Portuguese)** so you can find them on screen.

## 🎯 What are templates?

Templates are predefined sets of **scopes** (phases) and **tasks** that can be reused across many units. They standardize your process and save setup time on every job.

The repository ships with ready-made templates: `template-kitchen-remodel.json`, `template-bathroom-remodel.json`, `template-home-remodel.json`, `template-paint-job.json` and `template-hvac-installation.json`.

---

## 📐 Basic JSON structure

### Minimal format
```json
[
  {
    "title": "Scope name",
    "weight": 0.25,
    "tasks": [
      {"title": "Task 1", "order": 1},
      {"title": "Task 2", "order": 2}
    ]
  }
]
```

### Full example
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

## 🔑 Fields

### Scope (required)

| Field | Type | Required? | Description |
|-------|------|-----------|-------------|
| `title` | string | ✅ Yes | Scope name (e.g. "Painting", "Tile Work") |
| `weight` | number | ❌ No | Weight from 0.0 to 1.0 (default: 0.1) |
| `tasks` | array | ❌ No | List of tasks inside the scope |

### Task (optional, inside each scope)

| Field | Type | Required? | Description |
|-------|------|-----------|-------------|
| `title` | string | ✅ Yes | Task name (e.g. "Prime", "Install Tile") |
| `order` | number | ❌ No | Execution order (default: 1, 2, 3…) |

---

## 💡 How weight works

**Weight** sets how much each scope counts toward overall progress.

- Weight is a number from **0.0 to 1.0**.
- **All weights should add up to 1.0** (or close to it).
- Bigger or more important scopes get a bigger weight.

```json
[
  { "title": "Demolition",  "weight": 0.1, "tasks": [] },
  { "title": "Painting",    "weight": 0.4, "tasks": [] },
  { "title": "Tile",        "weight": 0.3, "tasks": [] },
  { "title": "Final Phase", "weight": 0.2, "tasks": [] }
]
```
**Total:** 0.1 + 0.4 + 0.3 + 0.2 = **1.0** ✅ — Demolition is 10% of the job, Painting 40%, Tile 30%, Final Phase 20%.

---

## 📝 Practical examples

### Example 1 — Simple template (3 scopes)
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

### Example 2 — Detailed template (electrical work)
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

## ✅ Validation checklist

Before importing a template, check that:

- [ ] The file is in `.json` format
- [ ] It starts with `[` and ends with `]`
- [ ] Every scope has a `"title"`
- [ ] Weights add up to roughly 1.0
- [ ] All quotes are double quotes `"` (not single `'`)
- [ ] There is no comma after the last item of each array
- [ ] Every task has a `"title"`
- [ ] The JSON passes an online validator

---

## 🚀 How to use a template

### Method 1 — Upload a file
1. Save your template as `my-template.json`.
2. In the app, open a unit.
3. Tap **📥 Template**.
4. Choose the **Upload File (Upload Arquivo)** tab.
5. Select the `.json` file. Scopes and tasks are created.

### Method 2 — Paste JSON
1. Copy the template JSON.
2. In the app, open a unit.
3. Tap **📥 Template**.
4. Choose the **Paste JSON (Colar JSON)** tab.
5. Paste the JSON and tap **Import (Importar)**.

### Method 3 — Built-in templates
1. In the app, open a unit.
2. Tap **📥 Template**.
3. Choose the **Default Templates (Templates Padrão)** tab.
4. Pick Full Remodel, Paint Only or Tile Only.
5. Tap **Import Template (Importar Template)**.

---

## 🎨 Organization tips

**Use descriptive names**
❌ Weak: `"title": "Phase 1"`
✅ Good: `"title": "Demolition & Site Prep"`

**Put tasks in a logical order**
```json
"tasks": [
  {"title": "Measure & Mark", "order": 1},
  {"title": "Cut Materials", "order": 2},
  {"title": "Install", "order": 3},
  {"title": "Test & Verify", "order": 4}
]
```

**Keep weights proportional**
- Quick work (1–2 days) = 0.05–0.1
- Medium work (3–5 days) = 0.15–0.3
- Large work (1+ week) = 0.4–0.6

---

## ⚠️ Common mistakes

**1. Invalid JSON (missing comma)**
```json
// ❌ Wrong
[
  {"title": "Scope 1"}
  {"title": "Scope 2"}
]

// ✅ Right
[
  {"title": "Scope 1"},
  {"title": "Scope 2"}
]
```

**2. Weights that don't add up to 1.0**
```json
// ❌ Wrong (total = 0.5)
[
  {"title": "Scope 1", "weight": 0.2},
  {"title": "Scope 2", "weight": 0.3}
]

// ✅ Right (total = 1.0)
[
  {"title": "Scope 1", "weight": 0.4},
  {"title": "Scope 2", "weight": 0.6}
]
```

**3. Single quotes**
```json
// ❌ Wrong
[{'title': 'Scope 1'}]

// ✅ Right
[{"title": "Scope 1"}]
```

---

## 🔧 Useful tools

**Online JSON validators:** https://jsonlint.com · https://jsonformatter.org

**Text editors:** VS Code (with JSON support) · Sublime Text · Notepad++ (Windows) · TextEdit in plain-text mode (Mac)

---

## 📞 If a template won't import

1. Copy the JSON.
2. Paste it into https://jsonlint.com.
3. Read the specific error.
4. Fix it and try again.

**That's it — you can now build as many custom templates as you need. 🎉**
