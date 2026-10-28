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
- Standalone responsive HTML concept of all 3 screens and mobile screenshots **generated as local conversation artifacts**, not published on an external domain and not committed to the app.
- Next: user design review of the HTML concepts, then transfer approved designs to editable Figma screens when access permits, critically review microinteractions, and only then implement approved React/Motion components on a separate development branch.
