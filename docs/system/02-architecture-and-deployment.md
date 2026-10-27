# S02 — System architecture and deployment

Target **local-first modular architecture**, subject to discovery and benchmarks.

Pipeline: user picks save -> sandboxed binary detector/parser version-adapter -> normalization and data evidence/coverage -> immutable SQLite snapshots -> deterministic scoring/optimizer engines -> Tauri/React UI -> optional AI explanation.

Separate bounded contexts: Save Ingestion, Domain/Provenance, Football Rules (eCA/role/tactics), Squad Optimizer, Scouting/Development, Finance/Club, Reports, Optional Cloud AI, and **privileged future Editor**. The web frontend must not directly read arbitrary disk paths or process memory. Use desktop bridge only with user-controlled narrow permissions.

Candidate stack: React/TypeScript UI; Tauri shell; Rust for bounded binary decode; SQLite for private snapshots; optional Rust/TS optimizer or Python worker after measured evaluation. Next.js/hosted database are not mandatory. UI libraries chosen against [design contract](../product/02-design-system.md).

Canonical service boundaries use typed schemas and stable IDs; every field has edition/build, data source, missing state. Each derived model embeds algorithm revision and explainable drivers. Dedicated writer adapter has no dependency path from read-only import.

Data integrity: original save immutable, content hash, fixture corpus with expected IDs and values, parser fuzz tests, optional encrypted credentials, user-driven deletion of locally stored data. Keep game binaries out of repository. External AI receives data only after user opt-in; output cannot be trusted for editor patches.

Architectural decisions pending: which edition parser first; format probe; choice of on-device inference and AI provider; optimizer solver; renderer/performance benchmarking; game-specific writer feasibility.

See [schema](03-domain-schema-and-provenance.md), [save compatibility](04-save-reader-compatibility.md).