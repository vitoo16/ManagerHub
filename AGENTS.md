# AGENTS.md — ManagerHub coding-agent operating contract

> This repository is currently a **documentation-first product specification**. Do not claim a UI, parser, editor, AI model or test is running until implemented and verified.

## Mandatory orientation
Read `docs/README.md`, `docs/product/01-full-feature-catalog.md`, `docs/product/02-design-system.md` and `docs/engineering/agent-skills-research.md` before feature implementation. For football decisions read relevant `docs/business/` interviews and `docs/business/12-football-analytics-glossary.md`. For Player Intelligence read `docs/system/08-player-intelligence-engine.md` and `docs/product/04-player-intelligence-ux.md`.

## Agent skills dispatch
The **official third-party skills must be installed separately in the developer's environment** via instructions in `docs/engineering/agent-skills-research.md`. Do not assume skills exist merely because this file names them.

- UI/UX discovery: `impeccable` (shape) + `design-taste-frontend` app/dashboard workflow.
- React implementation: `vercel-react-best-practices` + `vercel-composition-patterns` (when React chosen).
- UI audit: `web-design-guidelines`, `impeccable` (critique/audit/harden/polish), and actual Playwright browser verification.
- Save/binary ingestion: our `managerhub-save-safety` project skill.
- Football model/eCA/scouting: our `managerhub-football-intelligence` project skill.
- Charts/data UX: our `managerhub-data-ux` project skill.
- Update/add external skills only after inspecting upstream source, scripts, license and permissions.

## Football domain guardrails
1. **Actual CA/PA** = verifiably decoded original game values where edition/build is supported.
2. **Estimated CA (eCA)** = a derived approximation requiring same-version holdout calibration; if unvalidated show only a preliminary attribute index. Show uncertainty and coverage.
3. **RCA-style diagnostic** = distinct derived attribute-budget estimate, NOT promised FMRTE parity.
4. **Role Fit** = our 0–100 role suitability. **Tactical cohesion** = collective heuristic. Neither is actual FM game ability or win probability.
5. Never invent player names, hidden attributes, matches, fees, stats, xG, heatmaps or source positions. Incomplete source yields missing-data UI.
6. Realism Mode must prevent hidden fields leaking via aggregation, sorting, charts and AI outputs.
7. Tactical role catalogs and out-of-possession shapes are edition-specific. No silent FM24 ↔ FM26 role equivalence.
8. Best XI assignment respects one position per player and all verified eligibility constraints.
9. Fictional manager interview text is NOT an authentic Sir Alex Ferguson quotation.

## Binary and editor guardrails
- Read-only imports by default; immutable source file; sandbox malformed untrusted inputs.
- Unknown `.fm` format is unsupported, not an opportunity to guess field offsets.
- Editing requires version-certified adapter, explicit consent, backup, temporary copy, full reparse, diff and game-load verification with rollback. Never mutate a user save while investigating it.
- No secret extraction, process-memory patching or remote save uploads without a separately reviewed and explicitly authorized feature.

## UI/UX guardrails
- Design for a **professional dense football analysis workstation**, not a generic SaaS hero landing page.
- Information hierarchy first: what the player does, role fit, charts grounded in observed data, decision implications, evidence.
- Dark-first/light-ready; avoid gratuitous gradients, gradients as fake depth, repetitive metric cards and irrelevant animation.
- Accessible keyboard, focus, chart descriptions, tabular numbers, colorblind-safe encoding, prefers-reduced-motion, documented cohort/units.
- Preserve navigation state; compare consistent metrics/cohorts; do not hide missingness.
- Validate loading/empty/partial/error/unsupported/offline states before calling a screen done.
- Screenshots and audits are proof only when actually run on the app.

## Coding and review
Prefer small typed, testable changes. Each feature PR should link business rule -> requirement ID MH-xx -> data contract -> test coverage -> UX acceptance. Include caveats about edition/build and unverified parts. Avoid vendor dependency without an architecture decision record. Do not add binary game data, generated screenshots containing private saves or copyrighted FM assets without review.

## Delivery checklist
- [ ] Correct module IDs and documentation links
- [ ] Source and version tags for claims and data
- [ ] Unit/integration/property tests relevant to change
- [ ] UI a11y, keyboard, responsive, missing data, reduced motion checks
- [ ] No unreviewed write path or private data upload
- [ ] Tested results clearly distinguished from planned functionality
