# System knowledge / Kiến thức hệ thống

Architecture and implementation proposals; **no parser, solver, editor or AI has been implemented in this repository**.

| Specification | Responsibility |
|---|---|
| [S01 — Requirements](01-product-requirements.md) | Feature priority and quality gates |
| [S02 — Architecture](02-architecture-and-deployment.md) | Tauri/React/Rust candidate, local-first and service boundaries |
| [S03 — Data Model & Evidence](03-domain-schema-and-provenance.md) | Game identity, snapshots, provenance, missingness |
| [S04 — Save Reader](04-save-reader-compatibility.md) | FM family detection, edition-specific adapters and fixture validation |
| [S05 — Save Editor](05-player-editor-ca-pa.md) | Opt-in CA/PA editing with backup and roundtrip checks |
| [S06 — Tactical Engine](06-tactical-engine-role-fit.md) | Role catalogs, four phases, cohort/team logic |
| [S07 — Squad Optimizer](07-squad-optimizer.md) | XI allocation, rotation, depth and succession |
| [S08 — Recruitment/Development](08-recruitment-and-development.md) | Scouting, wages, loans, academy and load |
| [S08e — eCA / Player Intelligence](08-player-intelligence-engine.md) | Ability estimator, positions/roles, verdicts, evidence and chart contracts |
| [S09 — Safety & Tests](09-security-privacy-and-testing.md) | Binary threats, privacy, testing and release gates |
| [S10 — API & Workflows](10-api-and-workflow-contracts.md) | Typed service contracts and error states |

Read [product catalogue](../product/01-full-feature-catalog.md), [business domain](../business/README.md) and [AGENTS instructions](../../AGENTS.md) before implementation. Never claim a score is the game's internal algorithm unless independently verified.