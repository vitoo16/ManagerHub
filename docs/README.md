# Manager Hub — Knowledge Base

**Status:** Product discovery / specification, not implemented features. **Language:** Vietnamese with canonical English football and engineering terms. **Last reviewed:** 2026-10-27.

Manager Hub is a local-first Football Manager companion: inspect compatible saves, distinguish true game fields from derived metrics, compare squads and tactical systems, plan recruitment and development, and eventually offer safe editing where a verified adapter exists.

## Navigate
- [Business / Nghiệp vụ bóng đá](business/README.md): simulated Ferguson-style interviews, coaching principles, scouting, youth, finance and football measurement.
- [System / Đặc tả kỹ thuật](system/README.md): versioned save adapters, typed domain model, ability editing, tactical rules, optimizers, validation and security.
- [Product / Sản phẩm](product/README.md): personas, user stories, priorities, release gates and end-to-end traceability.
- [Sources and evidence policy](references.md): verified references, assumptions, limitations.

## Editorial contract
1. **REAL_FOOTBALL:** general coaching concepts supported by known practice; never claim precise quantitative effects without data.
2. **FM_VERIFIED:** game-specific behavior confirmed through official manuals/release notes or repeatable in-game observation, always versioned.
3. **EXTERNAL_TOOL:** behavior of third-party editors/parsers documented by their authors; never assume equivalent Manager Hub capability.
4. **PROPOSED_MODEL:** product scoring, optimization, and simulations we invent. They are NOT internal Football Manager algorithms.
5. **UNVERIFIED:** reverse-engineering hypotheses and missing fields; must never silently become facts.
6. **FICTIONAL_INTERVIEW:** imagined questions and answers inspired by Ferguson's publicly discussed management principles. **Not Sir Alex Ferguson's own words or an actual interview**.

Each business document should yield decisions and business rules. Each system document specifies inputs/outputs, acceptance tests, failure states and safeguards. Maintain cross-references rather than duplicating rules. For any new FM version, refresh [compatibility](system/04-save-reader-compatibility.md), [role-fit design](system/06-tactical-engine-role-fit.md) and [sources](references.md).

## Product boundaries
Read-only analysis first; never write a user's save or running-game memory as part of exploratory analysis. Original save is immutable by default. Editing requires explicit opt-in, validated compatible version, backup, transactional checks and a recovery path.

This documentation is independent of Football Manager, Sports Interactive, SEGA and FMRTE. No affiliation is implied.