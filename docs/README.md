# ManagerHub Knowledge Base — docs/

**Updated 2026-10-27.** These are specifications, original fictional coaching interviews and a researched agent workflow, **not built application features**.

## Product (WHAT and user experience)
- [Complete 27-module Feature Catalogue](product/01-full-feature-catalog.md)
- [UI/UX design contract: professional football analytics workstation](product/02-design-system.md)
- [User stories and personas](product/01-user-stories.md)
- [Phased delivery roadmap](product/02-delivery-roadmap.md)
- [Traceability, decisions and risks](product/03-traceability-and-decisions.md)
- [Player Intelligence / Scouting Report UX + chart inventory](product/04-player-intelligence-ux.md)

## Business (WHY, domain rules)
- [B01–B13: Fictional Ferguson-inspired football management interviews](business/README.md)
- [Football analytics terms and data warnings](business/12-football-analytics-glossary.md)
- [Player Intelligence, estimated CA and recruitment verdict](business/13-player-intelligence-and-scouting.md)

## System (HOW, engineering contracts)
- [System index](system/README.md)
- [S01 Requirements](system/01-product-requirements.md)
- [S02 Architecture](system/02-architecture-and-deployment.md)
- [S03 Data schema and provenance](system/03-domain-schema-and-provenance.md)
- [S04 Save reader/compatibility](system/04-save-reader-compatibility.md)
- [S05 Future player editor](system/05-player-editor-ca-pa.md)
- [S06 Tactical Role Fit engine](system/06-tactical-engine-role-fit.md)
- [S07 Squad optimization](system/07-squad-optimizer.md)
- [S08 Recruitment and development](system/08-recruitment-and-development.md)
- [S08e Player Intelligence eCA model](system/08-player-intelligence-engine.md)
- [S09 Security, privacy and tests](system/09-security-privacy-and-testing.md)
- [S10 API and workflows](system/10-api-and-workflow-contracts.md)

## Engineering (AI agents)
- [Research and curated skill selection](engineering/agent-skills-research.md)
- [Agent workflow root](../AGENTS.md)
- [Three in-repo original project skills](../.agents/skills/)

## Evidence policy
1. **REAL_FOOTBALL:** football concepts interpreted from credible practice.
2. **FM_VERIFIED:** game fields only if verified against the exact edition/build and test fixture.
3. **EXTERNAL_TOOL:** FMRTE or independent parser behavior, not automatically ManagerHub features.
4. **PROPOSED_MODEL:** our own scores, eCA estimator, optimizers, what-if forecasts.
5. **UNVERIFIED:** assumptions or hypotheses, never silently promoted to facts.
6. **FICTIONAL_INTERVIEW:** invented questions and answers styled as a demanding manager, NOT authentic Sir Alex Ferguson quotations.

See [sources and evidence](references.md). Read-only/immutable source save by default; editing requires certified compatibility, backup and rollback. Actual CA, eCA, RCA-style estimate, Role Fit and Tactical Fit have different meanings and scales.

## How to contribute
For any new functionality add its MH-ID to [catalogue](product/01-full-feature-catalog.md) → business rules → system inputs/results/errors → UI states + charts → test acceptance and evidence. Do not commit private save files. The 10 curated external SKILL.md files plus 4 original project skills are actually committed under [`.agents/skills/`](../.agents/README.md); their optional runtime engines/agent hooks are not automatically activated on a developer machine.
## Full-product execution (no MVP)
- [Mandatory engineering charter](implementation/00-execution-charter.md)
- [Seven-phase detailed plan](implementation/01-full-delivery-plan.md)
- [Copy-paste prompts for coding agents](implementation/02-agent-prompts.md)
- [Apple-inspired Liquid Glass and GSAP motion design](implementation/03-liquid-glass-motion-spec.md)
- [Official GSAP/Vercel/Impeccable/Taste skill research](implementation/04-motion-skills-and-references.md)

The user chose the **complete product**, not an MVP. These implementation documents supersede earlier release-phase suggestions.

- [27-module acceptance ledger and status](implementation/05-feature-acceptance-ledger.md)
