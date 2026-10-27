# ManagerHub

**Football Management Intelligence Platform** — một công cụ phân tích và hỗ trợ quyết định cho Football Manager, hướng tới đọc save, đánh giá cầu thủ, eCA, chiến thuật, Squad Planner, tuyển trạch, quản trị CLB và (chỉ khi xác minh được) chỉnh sửa CA/PA an toàn.

**Project status (2026-10-27):** Documentation-first; **features not implemented yet**. Parser/save editor support is not established. No affiliation with Sports Interactive, SEGA, Football Manager or FMRTE.

## Project documentation
- [Docs Home](docs/README.md) — Business, System, Product and Engineering.
- [Full catalogue: all 27 modules](docs/product/01-full-feature-catalog.md).
- [Player Intelligence: eCA, charts, role & scouting](docs/system/08-player-intelligence-engine.md) · [UX detail](docs/product/04-player-intelligence-ux.md).
- [Data-first ManagerHub UI/UX design system](docs/product/02-design-system.md).
- [Agent skills research and install guide](docs/engineering/agent-skills-research.md).
- [AGENTS.md](AGENTS.md) — instructions for coding agents.
- [Project skills](.agents/skills/) — our football, FM-save safety and data-UX SKILL.md files.

## Coding agent setup (local, explicit opt-in)
After reviewing third-party upstream scripts and license, with Node 22.20+ and Git:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-agent-skills.ps1 -Agent codex
```
This installs selected Vercel Web Design Guidelines / React / Composition, Taste and Impeccable **on your local machine**, not on GitHub merely by reading this README. You can also use [individual vendor commands](docs/engineering/agent-skills-research.md). No installer was executed as part of this repository documentation work.

## Next implementation milestone
Validate one Football Manager save parser/edition using test fixtures, deliver a read-only player explorer and honest data coverage, then implement calibrated eCA, Role Fit, Squad Planner and source-backed football charts. Treat game editing as a separately gated later phase.
## Full product implementation — no MVP
- [Full seven-phase plan](docs/implementation/01-full-delivery-plan.md)
- [Execution charter — clean code, DRY and no accepted known avoidable debt](docs/implementation/00-execution-charter.md)
- [Ready-to-paste coding agent prompts (master + phases 01–07)](docs/implementation/02-agent-prompts.md)
- [Apple-inspired Liquid Glass UI and GSAP motion](docs/implementation/03-liquid-glass-motion-spec.md)
- [Animation/transition skills and verified references](docs/implementation/04-motion-skills-and-references.md)

The project uses **7 production-grade integration phases**, not an MVP release strategy. The primary motion stack is official GSAP with React; translucency belongs mainly to navigation and controls, while football charts and data remain readable.

- [27-module acceptance ledger and status](docs/implementation/05-feature-acceptance-ledger.md)
