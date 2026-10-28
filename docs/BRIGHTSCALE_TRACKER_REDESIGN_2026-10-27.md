# BrightScale Tracker 2.0 — Approved brand-led redesign direction
_Date: October 27, 2026 (Florida) • Status: APPROVED DESIGN DIRECTION, NOT AN APP RELEASE_

## Authoritative brand source

The user uploaded `BrightScale-Remodeling-Brand-Kit.zip`, containing `BRAND.md`, `tokens.json`, `tokens.css` and original SVG/PNG assets. Brand source rules supersede previous informal palette/logo assumptions. **Do not include the source ZIP in a public repository by default.** Keep the brand assets private until sharing is explicitly reviewed.

Exact principles from `BRAND.md` (kit revision October 19, 2026; package October 27):
- Brand name: **BrightScale Remodeling**. Never use retired `CONTRACTOR` lockups. Never redraw/retype the brand wordmark.
- Primary full logo, on light background: `assets/Remodeling/brightscale-remodeling-horizontal.svg`. Reverse for dark: `assets/Remodeling/brightscale-remodeling-horizontal-reversed.svg`. For app icon only, the official `assets/Logos/brightscale-mark.svg` is permitted.
- Colors: `brand #18C95F`, `ink #000000`, `ground #F5F5F5`, `paper #F7F6F2`, `ink-muted #5B5B5B`, `line #D6D6D6`, `brand-deep #0B7A37`, `brand-tint #DFF7E9`, `on-ink #F5F5F5`. Use green for primary shapes; black text on green buttons; dark green, NOT brand green, for small text on light background.
- About 70% light/neutral, 20% ink, 10% green; green used for scarce points of attention.
- Typography: Montserrat Bold/Light pairing, body Regular, caption Medium. Official ramp includes display 64/60 800; headline 36/40 700 and 300; title 20/28 700; body 16/26 400; caption 13/18 500.
- Spacing: 8/16/24/48 px. Geometry: square corners by default, only 2/4 px for buttons/callouts; architectural grid, restrained lines, no generic piles of rounded cards.
- Copy: **Smart Remodeling** always two words, precise claims, no unverified license or credential claims.

## Experience direction

Take inspiration from Apple Human Interface Guidelines for hierarchy, discoverability, progressive disclosure, touch targets and deliberate motion, but do not copy Apple visual identity. Use Impeccable / Taste / Emil Kowalski design critique and Motion for React after a reviewed design is approved. Explicit `prefers-reduced-motion`; no animation for legal approvals that obscures the result.

Three priority screen specs, **all PM-first concept with sample data**:
1. **Dashboard:** decision queue; one featured validated progress metric; project shortlist; separate CO approvals, reports to validate and Smart Delay risks. Avoid indiscriminate cards.
2. **Project Detail:** frozen baseline status, validated scope execution, 7-phase rail, inspection/dependency priorities, Smart Delay Control; PM authority over final schedule, scope/contract not silently changed.
3. **Change Orders:** standalone additional scope/terms and multi-step PM → client → PM activation → sub report → PM validates. Financial projections by role: PM internal + client, client only contract charge, sub only assigned subcontract + recognized credit. Display approval history. Never confuse recognized credit with payment or simulated role switch with authentication.

## Implementation boundaries

- Decisions **1–39** remain intact. Existing Supabase production schemas/data are untouched.
- **Prototype is UX only**: all names, dates, prices, percentages are fictional. No login, Supabase, IndexedDB, real Change Order approval, signature, payment, notification or background sync.
- Do not replace current production UI before formal visual review and confirmation, independent backend Auth/RLS validation with three real test profiles, and a controlled migration/release.
- Previous PR #5 is the isolated staging backend and PR #6 is the older synthetic navigation prototype; redesign should be developed independently and not automatically merged.
- Accessibility: minimum touch areas, visible focus, strong contrast, motion reduction, textual state descriptions.

## Design assets and current status

- [Official Figma foundations](https://www.figma.com/design/0Zy3vLGc5Tfi2SoFlgcr4E): **created**, 9 color variables, 7 spacing/radius variables, 6 Montserrat text styles, foundation specimen using original official mark. **Three priority screens are NOT yet in Figma**; Figma MCP Starter plan usage limit interrupted further canvas work.
- Standalone responsive HTML concept of all 3 screens and mobile screenshots **generated as local conversation artifacts**, not published on an external domain and not committed to the app. A **single-file HTML** embeds the *exact original* official SVG bytes as data URIs, so opening it does not depend on extracting an assets folder; a ZIP also includes `index.html`, `assets/`, `tokens.json` and `README.md` for further editing.
- **Local verification (2026-10-27):** headless Chromium at 393px iPhone width: dashboard/project/CO navigation, PM→client→PM→sub→PM CO lifecycle, client sees only USD 3,500, sub sees only USD 800, PM verifies USD 240 fictional credit, no console exceptions or horizontal scroll. Storage getters for `indexedDB`, `localStorage` and `sessionStorage` deliberately throw; no storage access occurred. Only optional Google Fonts stylesheet was requested and blocked in test, with system-font fallback. This is not a real login, authenticated privacy test or contract acceptance.
- Next: user design review of the HTML concepts, then transfer approved designs to editable Figma screens when access permits, critically review microinteractions, and only then implement approved React/Motion components on a separate development branch.

## UX Revision 2 — owner selected option B (2026-10-27)

**Visual APPROVED by the owner (2026-10-28):** the three-screen UX Revision 2 with larger fonts, more breathing room, and rounded application cards. This explicitly revises the earlier Brand Kit *application component geometry*; it does **not** amend official SVG logo/mark geometry or the core brand palette. **DESIGN APPROVED ≠ CODE MERGED, RELEASE AUTHORIZED, or COMPLETE FEATURE IMPLEMENTATION.**

- **PR #8:** [Draft visual review](https://github.com/libanius/BrightScale-Tracker/pull/8), `design/ux-revision-2-review` created from `main`, with standalone `ux-revision-2.html` containing Dashboard, Project Detail and Change Orders design concepts. Independent of PR #5 and PR #6; **no merge or production release**.
- **Isolated published preview:** [Cloudflare preview URL](https://design-ux-revision-2-review-brightscale-tracker.brightscalegroup.workers.dev/ux-revision-2.html). Cloudflare GitHub check for commit `f2933a346d3d985f6747bde17c14711b2f5f81c1` reported build and preview deployment SUCCESS. This is **not** `tracker.brightscalegroup.com`.
- **Layout:** 3 responsive screens at iPhone + desktop widths; larger headings (about 34px mobile), body 16px, most controls ≥48px, larger small text, roomier card padding, 22–26px application card radius. Maintains BrightScale green `#18C95F`, `#0B7A37` for green text, light neutrals, Montserrat-first fallback stack; vector mark geometry reused from existing public repository logo. **Before launch, replace prototype mark with the precise official primary Remodeling logo lockup from the private Brand Kit.** Brand ZIP was not published.
- **Business data:** fictional project names, fictional prices and percentages; seven-phase PM project rail; Smart Delay Control assistance with PM decision; frozen original baseline visual; Change Orders client/sub money separation is a **visual simulation**, not authorization. No actual credits/payments/approval/signature.
- **Interactive proof:** local headless Chromium tested Dashboard/Project/CO at 393px mobile and 1440px desktop, financial role-projection, modal selection, no console errors and no network. Additional sizes 320, 360, 375, 390, 430, 768, 1024, 1440px tested with IndexedDB/localStorage/sessionStorage and fetch deliberately disabled; no overflow. `prefers-reduced-motion` supported. Motion for React is **not installed or used** in this design-only prototype.
- **Conversation-local deliverables:** `BrightScale_Tracker_Revision_2.html`, two preview PNGs and `BrightScale_Tracker_Revision_2_Review_Package.zip`, with README/test evidence. Figma currently has only foundation assets; a newly created Figma file may remain empty due to Starter connection limit — **never claim the three screens exist in Figma yet**.
- **Next:** user reviews updated visual design; after visual approval, create editable Figma frames/tokens when access allows, then implement approved React/Motion UI separately from the existing backend. Do not silently migrate contracts or alter production schemas.

## 2026-10-28 — UX Revision 2 VISUAL APPROVED; clarify PM field progress control

**Owner explicitly approved the visual:** “Está muito bom. Pode registrar aprovado.” Record: **APPROVED DESIGN** for Dashboard, Project Detail and Change Orders, including readability, whitespace and softened application card geometry. PR #8 remains draft and intentionally unmerged. This does **not** authorize integrating sample data or rolling out unfinished Auth/RLS.

**Usability question immediately following approval:** “Onde eu mudo as porcentagens de progressão quando eu bater o olho em um trabalho e anoto que tantos porcento está pronto?”

- **In the approved UX prototype**, 72%, 58%, etc. are display-only illustrative figures. The UX demo does **not** include an editable field progress input; do not direct anyone to edit real data in that demo.
- **In the currently deployed legacy Tracker UI**, `Projetos → projeto → Unit → Progresso por Scope → expand Scope → tocar Task ou lápis → Editar Task → slider Progresso (0–100 in steps of 5) → Salvar`. This writes the legacy task progress and recalculates legacy aggregated progress; **it is NOT the new audited subcontractor-report → PM-validate → recognized-credit pipeline**.
- **Desired UX enhancement (not yet designed/implemented or independently ratified):** on Project Detail / 7-phase rail, tap a phase → task → **Registrar progresso da vistoria**. Offer 0–100% entry with numeric input and slider, date/time and optional evidence/note; show **PM-observed** distinct from **sub-reported** and **PM-validated**. The PM can intentionally confirm validated progress after reviewing acceptance criteria, with a separate explicit action and preserved audit history. Any credit recognition follows its independent authorized validation rule; never grant automatic payment. Original baseline and existing recognized credits remain immutable; CO progress is separate.
- Aggregate percentages should be derived from PM-validated task percentages and the approved task/scope weights, **not** arbitrarily set on overall project/phase cards. Include clear provenance: reported / observed / validated and who/when. No silent overwrites.
- The above request is a **UX discovery/placement need within existing decisions 7–10, 29–39**, not product decision 40. The exact final interaction awaits visual design review; no production permission changes.

**Next development:** design the PM field-inspection progress editor in a new isolated prototype, then review; keep the current approved Revision 2 as the visual baseline, with no automatic merge or deployment.
