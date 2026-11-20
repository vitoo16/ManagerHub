# ManagerHub — Agent Entry Point

This file routes coding agents to **one source of truth per concern**. It is not a second engineering charter or a command to restart the project.

## Project mandate

- Build the **full 27-module ManagerHub product (MH-01..MH-27)** across the existing **seven integration phases**. **No MVP** or fake production features.
- **FM2013** is the current native compatibility/research target. Other Football Manager editions and builds require independently verified adapters; do not silently transpose game rules between editions.
- Keep original save files immutable until an exact-build writer has passed the certification and user-consent gates.
- Never invent football data, verified CA/PA, source values, model accuracy, player access or native-reader capabilities. Label experimental capture, read-only research and estimated metrics honestly.
- Respect local-first privacy, Editor/Realism field isolation, and Vietnamese/English i18n.

## Canonical references and ownership

| Question | Authoritative reference |
| --- | --- |
| Product scope and module IDs | [Feature catalogue](docs/product/01-full-feature-catalog.md) |
| Delivery phases and dependencies | [Seven-phase delivery plan](docs/implementation/01-full-delivery-plan.md) |
| What is actually implemented / accepted | [Feature acceptance ledger](docs/implementation/05-feature-acceptance-ledger.md), verified against current source and CI |
| Engineering rules, architecture, security and quality gates | [Engineering execution charter](docs/implementation/00-execution-charter.md) |
| Visual design and motion | [Design system](docs/product/02-design-system.md) and [Liquid Glass/motion spec](docs/implementation/03-liquid-glass-motion-spec.md) |
| Football semantics and data/provenance | [Business docs](docs/business/README.md) and [System docs](docs/system/README.md) |
| Optional task-oriented instructions | [Agent phase prompt templates](docs/implementation/02-agent-prompts.md) |
| FM27 public editor design research, FM2013 adaptation RFC, and agent review forum | [FM27 reference study](docs/research/fm27-editor/README.md) and [discussion #78](https://github.com/vitoo16/ManagerHub/issues/78) |\n| Installed skills and their source/activation rules | [Skill registry](.agents/README.md) and [source manifest](.agents/SKILLS-SOURCES.md) |

**Conflict resolution:** Protect user data, source truth and explicit user requirements first. For implementation status, inspect current code/tests/CI and compare with the acceptance ledger; do not treat historical plans or old prompt examples as evidence of shipped functionality. The delivery plan owns phase scope; the engineering charter owns engineering standards; the relevant product/domain spec owns its subject. If real contradictions remain, document and resolve them narrowly rather than silently rewriting the roadmap.

## How to execute a task

1. Identify the requested feature or defect and the affected MH module(s).
2. Inspect the latest default branch, recent changes, relevant files and tests. Read only the relevant sections of the charter, product/domain spec, ledger and plan; do not recursively load the entire repository documentation.
3. Activate only the smallest useful set of skills for the task. Follow [skill routing](.agents/README.md); do not load every vendored reference or run third-party scripts automatically.
4. Trace existing contracts/data flow before adding layers, components or dependencies. Prefer coherent, tested changes; avoid unrelated rewrites and perform architecture migrations only with an explicit decision and acceptance plan.
5. Preserve trust boundaries, data compatibility, safe async lifecycle, UI accessibility, clear VI/EN copy, and measured performance. Never claim tests or validations that were not run.
6. Verify relevant automated/manual checks, update acceptance evidence when changed, and report the exact commands/results, limitations, and PR. Stop at an evidence-backed blocker instead of faking success.

## Status vs aspirations

The current repository uses **npm workspaces, React/Vite, TypeScript, browser storage and bounded read-only research**. Earlier plan/prompt examples discuss possible future Tauri, Rust, SQLite, pnpm and other packages. **These are architecture candidates, not instructions to replace existing implementations.** Changes to package manager, persistence engine or native runtime require an explicit architecture decision, migration plan and tests.

Phase prompts are templates for **assigned remaining work**, not an instruction to rerun Phase 1 or overwrite current modules. Do not modify the seven-phase roadmap or 27-module scope during a documentation-only governance task.
