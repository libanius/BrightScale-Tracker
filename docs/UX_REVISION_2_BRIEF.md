# BrightScale Tracker 2.0 — UX Revision 2

**Status:** Visual design proposal for approval; **not** production-ready, not merged, no real project data.

## Authorized objective

Create high-fidelity, mobile-first + desktop visual treatments of the three approved priorities:

1. **PM Dashboard** — actionable overview, active projects, reviews, Change Orders, Smart Delay Control.
2. **Project Details** — protected original baseline, PM-validated progress, scope phases, review queues, audit timeline and separate changes.
3. **Change Orders** — a clearly distinct CO register, customer versus subcontractor price privacy, independent credits, PM/client/sub role-specific views and approval audit.

Approved design review changes: larger type, greater visual breathing room, softer rounded cards. Preserve existing 39 product decisions, contracts, Smart Delay Control governance, credit and financial privacy, PM approval rules, and legal retention constraints.

## Brand identity and UI foundation

These style values derive from BrightScale Remodeling's recorded email/Tracker brand notes; **Canva connector returned no accessible Brand Kits**, so final visual approval should reconcile with any newer official kit before engineering release.

| Token | Value | Usage |
|---|---|---|
| `brand.primary` | `#18C95F` | Core green: CTAs, progress, active nav, approved states |
| `brand.primaryStrong` | `#0B8742` | Accessible green text accents on white |
| `surface.canvas` | `#F6F8F6` | Page background |
| `surface.default` | `#FFFFFF` | Card surfaces |
| `text.primary` | `#17221B` | Primary headings and content |
| `text.secondary` | `#6D7A72` | Supporting information |
| `border.subtle` | `#E7ECE7` | Delicate card borders |
| `surface.green` | `#E7F8ED` | Selected nav, supported green statuses |
| `color.warning` | `#BF801F` | Schedule risk / awaiting approval |
| `font.brand` | Montserrat / available system fallback | Brand family; no font binary bundled |
| `radius.card` | `22px` | Primary cards |
| `radius.projectHero` | `26px` | Project hero |
| `radius.control` | `12px` | Inputs / buttons |
| `spacing.unit` | `4px` | 8pt rhythm: 16 / 24 / 32 / 40 |
| `type.display` | desktop 41px; mobile 31px | Page title |
| `type.metric` | desktop 36-38px; mobile 30px | KPIs |
| `type.body` | 14-16px | Primary readable content |
| `type.metadata` | 11-13px | Metadata only; not substantive actions |

Layout: sidebar + wide work area on desktop; bottom 3-item navigation on mobile; controls target roughly 44px minimum. Use progressive disclosure, a single primary action per context, no card overload, and user-visible review / approval states.

## Three screens (example content is fictional)

### 1 — PM Dashboard

- KPIs: Active projects 06, PM reviews 03, Change Orders pending 02, Schedule on track 83%.
- Projects: Oakwood Residence, Lakeside Bathroom, Palm Ridge Kitchen with PM-validated progress.
- Attention queue rather than all tasks; Smart Delay Control risk presented as an assisted recommendation, never an automatic contractual schedule change.
- 'Original baseline protected' indication.

### 2 — Project Details

- One project hero with clear progress 72% PM validated.
- Execution by scope, explicit acceptance/progress separation, original baseline locked.
- Change Orders separated from original contract, PM approval queue, upcoming milestones, recent activity with actors/timestamps.
- Smart Delay Control can suggest options; PM alone publishes schedule revisions. No silent CO/payment/contract updates.

### 3 — Change Orders

- Separate CO register and detail panel.
- PM prototype can see customer contract amount, subcontract price and recognized credit; client prototype **cannot** see subcontract price or internal credits; sub prototype **cannot** see the amount charged to client.
- Client approval and PM activation are separate actions; silence is not consent. Audit timeline is readable and immutable in eventual backend.
- No blame, penalties, liabilities, payment or contractual change is inferred automatically.
- Sample amounts **$3,500 client price, $800 subcontract, $0 recognized credit** are fictional and must never be synced to a real project.

## Interaction / Motion design contract

- **Implementation target:** Motion for React after visual sign-off, with transition choreography appropriate to Apple-style direct manipulation; this HTML sample uses lightweight CSS only, **not the Motion library**.
- Page navigation: 240-360ms transform/opacity, subtle 8-10px rise, intentional.
- Hover/tap: slight lift on actionable cards/buttons; no animated value jumps on every repaint.
- Approval, rejection and credit validation: emphasize status language, explicit confirmation and stable layout; never convey a legal approval through animation alone.
- `prefers-reduced-motion: reduce` disables nonessential transitions; functional states remain accessible without motion.

## Architecture boundary / non-negotiable implementation rules

- This artifact is standalone HTML/CSS/JS with **NO network, Supabase, Stripe, cookies, IndexedDB, localStorage, external analytics or actual role authentication**. Sample button actions open only informational modals.
- The role switcher is a **DESIGN REVIEW ONLY** selector, not real access control. Production privacy depends on server-side auth and RLS.
- No production deploy or changes to `tracker`/`tracker_private` schemas or active Supabase projects.
- No actual contract/e-signature, payment, CO, baseline or credit updates.
- The source handoff remains `docs/SMART_REMODELING_HANDOFF_2026-10-26.md` on GitHub, with decisions 1-39 preserved.

## Deliverables

- `brightscale_tracker_ux_revision_2.html` — responsive, interactive three-screen design study.
- `revision_2_three_screens_preview.png` — three mobile first-view screenshots.
- `revision_2_desktop_preview.png` — three desktop screenshots.
- Individual mobile/desktop PNGs for review.
- An empty Figma design file was created at `https://www.figma.com/design/oXeiZ9g4kbkoEbtZxKaRv7`, but its layers could not be populated because **Figma Starter MCP reached its call limit**. **Do not describe this empty Figma file as a completed design.**

## Acceptance checklist for Astra / next design engineer

- [ ] Review actual latest logo/Brand Kit; reconcile Montserrat and exact primary logo variant.
- [ ] Preserve all 39 approved Smart Remodeling product decisions.
- [ ] Produce editable Figma components and tokens from approved visual draft when Figma access permits.
- [ ] Use Impeccable / taste / Emil Kowalski skills as design and motion review lenses, not a license to reinterpret contract/financial rules.
- [ ] Accessibility: AA text contrast, keyboard/touch states, 44px hit targets, reduced-motion handling.
- [ ] Design mobile + desktop for PM dashboard, project detail, Change Orders, and later derive restricted client/sub experiences.
- [ ] Build actual code with React + Motion after visual signoff; keep backend isolated until proper auth/RLS field verification.