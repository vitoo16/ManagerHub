# ManagerHub

**Football Management Intelligence Platform** — một công cụ phân tích và hỗ trợ quyết định cho Football Manager, hướng tới đọc save, đánh giá cầu thủ, eCA, chiến thuật, Squad Planner, tuyển trạch, quản trị CLB và (chỉ khi xác minh được) chỉnh sửa CA/PA an toàn.

**Project status (2026-10-27):** Implementation has started. React/Vite application shell, local .fm signature inspection, the 27-module directory, theme/motion primitives and automated tests are committed. Full game-save decoding and native editing are NOT implemented. No affiliation with Sports Interactive, SEGA, Football Manager or FMRTE.

## Project documentation
- [Docs Home](docs/README.md) — Business, System, Product and Engineering.
- [Full catalogue: all 27 modules](docs/product/01-full-feature-catalog.md).
- [Player Intelligence: eCA, charts, role & scouting](docs/system/08-player-intelligence-engine.md) · [UX detail](docs/product/04-player-intelligence-ux.md).
- [Data-first ManagerHub UI/UX design system](docs/product/02-design-system.md).
- [Agent skills research and install guide](docs/engineering/agent-skills-research.md).
- [AGENTS.md](AGENTS.md) — instructions for coding agents.
- [Installed 15 Agent Skills](.agents/README.md) — Vercel, Taste, Impeccable, official GSAP, and four ManagerHub-specific skills.

## Agent Skills are installed directly in GitHub
**15 project-local skills are checked into `.agents/skills/` (11 pinned upstream + 4 original ManagerHub skills).** No installer is required to retrieve these skill files after cloning. See [installed skills and limitations](.agents/README.md), [upstream SHA lock](.agents/skills-lock.json) and [AGENTS.md](AGENTS.md). The external scripts were not executed, and Impeccable's optional engine/provider hooks require separate reviewed setup; application npm dependencies are not installed by simply cloning. The existing `scripts/install-agent-skills.ps1` is now an optional local refresh/agent-provider setup helper; it may replace vendored copies and should only be run deliberately.

## Run the actual app (Phase 1 source)
Requires Node.js 22.12+ and npm with registry access.

```bash
git clone https://github.com/vitoo16/ManagerHub.git
cd ManagerHub
npm install
npm run dev
# browse http://127.0.0.1:4173/
npm run typecheck
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

The Save Library recognizes .fm container signatures, optional SHA-256, and an **experimental bounded listing of internal archive member names** when structurally available. **Player Lab** now imports user-exported **HTML/CSV/TSV/TXT**, analyzes actual visible 1–20 attributes and displays provisional role-fit scores and attribute charts in-browser. It does **not** decode game edition, players or CA/PA and does not upload save bytes. The Tauri desktop host and Rust parser have not been built. See [implementation evidence/limits](docs/implementation/06-code-started.md).

## Next implementation milestone
Validate with real FM print/export fixtures, continue versioned .fm reader/persistent snapshots, then train and calibrate eCA from independently verified same-version CA labels, and integrate Tactical Lab, Squad Planner and decision-aware scouting. Native save editing remains a separately gated phase.
## Full product implementation — no MVP
- [Full seven-phase plan](docs/implementation/01-full-delivery-plan.md)
- [Execution charter — clean code, DRY and no accepted known avoidable debt](docs/implementation/00-execution-charter.md)
- [Ready-to-paste coding agent prompts (master + phases 01–07)](docs/implementation/02-agent-prompts.md)
- [Apple-inspired Liquid Glass UI and GSAP motion](docs/implementation/03-liquid-glass-motion-spec.md)
- [Animation/transition skills and verified references](docs/implementation/04-motion-skills-and-references.md)

The project uses **7 production-grade integration phases**, not an MVP release strategy. The primary motion stack is official GSAP with React; translucency belongs mainly to navigation and controls, while football charts and data remain readable.

- [27-module acceptance ledger and status](docs/implementation/05-feature-acceptance-ledger.md)

## Player Lab (actual exported attributes)
Open `/#/players` and import your **native HTML printout** from Football Manager, or an exported **CSV/TSV** view with Name, Position and player attributes. The file stays in browser memory and is not uploaded. See [Player Lab implementation and limitations](docs/implementation/07-player-lab-and-export-import.md). Estimated scores are **not actual CA/PA or calibrated eCA**. For FM26 the native Print Screen / Web Page export can produce HTML without third-party plugin.
