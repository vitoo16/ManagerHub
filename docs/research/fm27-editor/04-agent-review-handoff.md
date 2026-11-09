# 04 — Agent handoff and continuing discussion protocol

**Discussion owner:** [issue #78](https://github.com/vitoo16/ManagerHub/issues/78). **Research reference commit:** FM27 `ef0842e005ed29c30c01bcd9cf8a2280810bf6bb`. **Status:** NO INDEPENDENT AGENT REVIEW HAS YET BEEN RECORDED BY THIS DOCUMENT.

## Canonical entry for all agents

- Read [root AGENTS.md](../../../AGENTS.md) first. This folder is a *specialized reference*, not another global agent instruction tree.
- Start with [source audit](01-source-audit.md) for claims, [integration RFC](02-integration-rfc.md) for options and [verification gates](03-delivery-verification.md).
- Cross-check with existing FM2013 research and canonical acceptance ledger; source claims must never supersede exact-build observations without evidence.
- Post reviews to Issue #78 or the related PR; create bounded follow-on issues/PRs for implementation. An agent cannot be counted as having reviewed anything until its comment or review actually exists.
- If disagreement cannot be resolved, record opposing alternatives, trade-offs, evidence and needed owner decision. Do not silently rewrite requirements or auto-merge an architectural change.

## Review roles (independent agent can choose a lane)

| Lane | Read | Expected written response |
|---|---|---|
| Native architecture | 02 RFC, current architecture, source audit | ADR A/B/C, privilege and lifecycle critique |
| FM2013 field research | previous FMRTE reports 14, 19, 20, 24; source audit | exact-build mapping and invalid assumptions, candidate test plan |
| Writer safety | previous editor spec, PlayerWriter/Journal, verification | TOCTOU, identity and partial-failure risks + accept/reject gate |
| Domain / privacy | existing live snapshot contract, Editor/Realism code | exact provenance/redaction contract checks |
| Tests + licensing | test/CI, upstream license | negative-test coverage, reproducibility and GPL review |
| Independent challenger | all minimal references | alternatives and counterexamples, possible hidden technical debt |

## Paste-ready review template

```md
### Review — <lane> / <agent or reviewer>
- Reviewed source commits:
- Reviewed ManagerHub paths:
- Findings (CONFIRMED / INFERRED / UNKNOWN / DISPUTED):
- Evidence (permalinks, test commands and outputs):
- Risk/severity:
- Competing options + trade-offs:
- Required changes / tests:
- Recommendation: ACCEPT | REVISE | BLOCK | MORE EVIDENCE
- Open questions:
```

## Discussion resolution log

Keep a growing record in this file or a linked ADR, with columns:
`ID | question | option A | option B | evidence | decision/owner/date | follow-up PR | status`.

| ID | Question | Candidate options | Evidence | Decision | Status |
|---|---|---|---|---|---|
| D-01 | Reuse external FM27 research? | Architecture-reference vs direct port | [audit](01-source-audit.md) and existing FM2013 reports | Reference only; **no direct FM27 offset/code port** (owner direction 2026-11-10) | DECIDED |
| D-02 | Runtime host | Narrow native sidecar / Tauri / C# bridge / historical manual-only fallback | [RFC](02-integration-rfc.md) | No runtime selected | OPEN FOR REVIEW |
| D-03 | Field write certification | Individual gated field / bulk edit / defer | [verification](03-delivery-verification.md) | Defer writes until independent certification | BLOCKED |
| D-04 | GPL reuse | Clean-room design / compliant GPL distribution | [audit](01-source-audit.md) | No source copy approved | OPEN FOR LICENSE REVIEW |
| D-05 | Session freshness and career lineage | process identity + verified career / historical-only | existing [live contract](../fmrte/20-fm2013-live-snapshot-contract.md) | Historical is established; currentness needs evidence | OPEN |

## Continuation task order for the next agent

1. Check latest main/branch/PR and read Issue #78; do not repeat old proposals if answered.
2. Review one scoped claim against pinned source and existing FM2013 research; comment using template with counter-evidence where relevant.
3. If a decision is needed, propose a bounded ADR and explicitly request it in the issue.
4. If implementation is approved, take a narrow isolated slice, add tests and PR, preserve read-only/historical behavior and privacy.
5. Update evidence, decision log, and ledger **only to the level backed by real tests**; report exact merge/review status. Do not claim other agents have responded merely because they were invited.
