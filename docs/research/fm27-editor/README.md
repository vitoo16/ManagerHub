# FM27 Editor source study → ManagerHub FM2013 integration

**Date:** 2026-11-10 · **Status:** RESEARCH-ACCEPTED-AS-REFERENCE / IMPLEMENTATION-UNVERIFIED

**Primary reference:** https://github.com/Jackhamerp24/Football-Manager-27-Editor/tree/ef0842e005ed29c30c01bcd9cf8a2280810bf6bb (pin: `ef0842e005ed29c30c01bcd9cf8a2280810bf6bb`).

**Discussion:** [ManagerHub issue #78](https://github.com/vitoo16/ManagerHub/issues/78). Research findings are a foundation for design; the review remains open.

## Start here (agent handoff)

1. Read root [AGENTS.md](../../../AGENTS.md), the [engineering charter](../../implementation/00-execution-charter.md), [FM2013 research index](../fmrte/README.md), [adapter design](../fmrte/06-managerhub-adapter-design.md), and [acceptance ledger](../../implementation/05-feature-acceptance-ledger.md). Do not preload unrelated docs.
2. [01-source-audit.md](01-source-audit.md): exact FM27 source paths and observations, evidence levels, fundamental FM2013 incompatibilities.
3. [02-integration-rfc.md](02-integration-rfc.md): approved *research transfer*, architecture options, boundaries and ADR questions.
4. [03-delivery-verification.md](03-delivery-verification.md): staged tasks, tests, gated acceptance and stop conditions.
5. [04-agent-review-handoff.md](04-agent-review-handoff.md): collaboration protocol, review form, decision/disagreement record, agent-readable handoff.

## Tracked execution and blockers (2026-11-11)

- [#78 — architecture research and multi-agent critique](https://github.com/vitoo16/ManagerHub/issues/78): receive actual agent comments/reviews, evidence and alternative proposals; **none received yet** at this update.
- [#79 — documentation PR](https://github.com/vitoo16/ManagerHub/pull/79): source audit + RFC + verification and handoff; **not merged while CI is red**.
- [#80 — GitHub Actions runner blocker](https://github.com/vitoo16/ManagerHub/issues/80): job runner unset, zero steps for PRs #75–#79; retry on 2026-11-11 also failed before execution. Exact underlying error annotation is not accessible in this tooling; owner should inspect GitHub UI/settings. Do not assume source code broke the build.
- [#81 — read-only exact-build native session follow-up](https://github.com/vitoo16/ManagerHub/issues/81): bounded agent task, conditional on ADR/quality gate. No native feature delivered.

**Current status report:** GitHub-backed documents and discussion tickets exist. Real independent review, green CI, merged docs and runtime implementation are still pending.

## Decision scope

**Approved:** learn from FM27's Windows process memory abstraction, versioned offset/profile resolver, pointer/object validation, guarded write workflow, read-back checks, fake-memory testing, profile health checks, conservative capability flags and change journal design.

**Not approved:** transplant C# source or its GPL code into ManagerHub without licensing review; reuse FM27 addresses/vtables/layouts, assumptions about direct unencrypted CA/PA, an 8-byte process layout, a speculative native host migration, uncontrolled memory edits, or claim that FM27 provides a standalone FM save-file parser.

**Existing project truth:** ManagerHub's browser app and historical FM2013 imports are not a native live reader. The existing FM2013 exact-build x86 research is provisional. Neither a production native writer nor offline .fm decoder is certified. Preserve Editor vs Realism provenance boundaries and all 27 module IDs / seven phases.

## Evidence vocabulary

- **CONFIRMED (static):** evidenced by exact source text; does *not* imply runtime verification.
- **CONFIRMED (ManagerHub research):** backed by a linked prior report/test; scope of that report matters.
- **INFERRED:** plausible interpretation, requires evidence.
- **PROPOSED:** future design not implemented.
- **UNKNOWN / BLOCKED:** no accepted evidence; cannot enable runtime capability.

When new upstream code lands, re-pin the commit, compare source, update the claim and link the PR/issue. Historical entries are not erased.

## Record of adoption

| Item | Decision | Evidence | Owner / gate |
|---|---|---|---|
| Reference FM27 memory architecture | ADOPT AS DESIGN REFERENCE | [source audit](01-source-audit.md) | Native adapter review |
| Transplant FM27 offsets / CA/PA transforms | REJECT | FM2013 x86 and obfuscated word transform; [FM2013 report](../fmrte/14-fmrte13-field-transforms.md) | Exact-build certification |
| Reuse validated domain boundary | PRESERVE | [snapshot contract](../fmrte/20-fm2013-live-snapshot-contract.md) | Domain review |
| Live read-only native bridge | PROPOSED, NOT IMPLEMENTED | [integration RFC](02-integration-rfc.md) | ADR + tests |
| Live memory writer | BLOCKED PENDING CERTIFICATION | [verification plan](03-delivery-verification.md) | Explicit owner consent / separate gate |
| Offline .fm decoder/writer | INDEPENDENT UNVERIFIED TRACK | [offline format](../fmrte/05-offline-save-format.md) | Independent fixture/roundtrip gate |
| Source code reuse | BLOCKED UNTIL LICENSE REVIEW | Upstream GPL-3.0-or-later | Legal/licensing review |
