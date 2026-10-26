# AI Agent Instructions — BrightScale Tracker 2.0

**Mandatory for all AI coding assistants** working in this repository.

1. **Read first:** [Continuity Protocol](docs/CONTINUITY_PROTOCOL.md) and the [canonical Smart Remodeling handoff](docs/SMART_REMODELING_HANDOFF_2026-10-26.md) **in full**. Treat the latter as the single living source for confirmed decisions, progress, test evidence, and next action.
2. **Do not restart the interview.** The owner confirmed 34 Smart Remodeling decisions and stopped further questioning to prioritize a field-tested MVP. Decision 35 has **not** been made.
3. **Before editing:** inspect current code and migrations; verify actual implementation instead of relying on historical claims in README or handoff. Preserve existing offline-first functionality, Supabase RLS, and deployed workflows.
4. **Non-negotiable boundaries:** PM authorizes official progress, payment and operational revisions; subcontractor progress and potential credit are not approvals or payouts; keep all client/sub financial terms separate; contract changes require formal Change Orders. Protect historic baseline and credits. Never expose internal financials to client or client revenue to subs.
5. **Supabase shared project:** Tracker-only schemas are `tracker` and `tracker_private`. **Never modify `public` or `private`** schemas belonging to other production services.
6. **Security:** Repository is public. Never commit credentials, customer-identifying details, live project/estimate contents, private links, logs containing personal data or production secrets. Do not imply the Git history was audited.
7. **End of meaningful work:** Update the checkpoint and append a verified entry to the *same* canonical handoff; include changed files, commit/PR, test evidence, blockers and the next concrete action. Use `DECIDED`, `PROPOSED`, `IMPLEMENTED`, `TESTED`, `BLOCKED` precisely. If unable to write, state `NOT SYNCED` and supply a patch.

**Priority:** deliver the smallest usable end-to-end MVP for real-world field validation; do not implement all 34 decisions up front. Follow [the protocol](docs/CONTINUITY_PROTOCOL.md) for session start, evidence, versioning, and close-out.
