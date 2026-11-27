# S08b — Recruitment, Contract, Academy and Training Decision Support

Business: [B05 recruitment](../business/05-interview-recruitment.md), [B06 youth](../business/06-interview-youth-development.md), [B07 training](../business/07-interview-training-medical.md), [B10 finance](../business/10-interview-finance-board.md).

## Recruitment
Begin with verified squad functional gap and tactical constraints. Define role/position and salary/fee limits, short-list by required attributes and availability. Compare candidate role fit **and marginal improvement to the whole XI** against existing players, internal youth, retraining, loan and tactical change. Return Buy / Shortlist / Loan / Internal Alternative / Pass / Insufficient Data, with explanations, sensitivity and assumptions. No invented prices or willingness to join.

## Finance/Contracts
Money fields have currency, season, payment schedule, wage period, option/clauses and provenance. Estimated budgets are scenarios, not official FM ledger calculations. Plot expiration risk, wage concentration and likely squad depth after renewals/sales. Unknown clause = unknown, not zero.

## Youth and development
Snapshots linked by native player ID within career and version; compare actual attributes/CA deltas and dates where verified. Model training/retraining as possible development paths, not guaranteed outcomes. Assess minutes, loan quality, position preparedness, age and how position change affects current XI.

## Training and availability
Track match congestion, workload/minutes, injury/condition flags, return-to-play context. Labels are qualitative alerts unless clinically validated injury probabilities exist; do not make medical claims.

## Acceptance
High PA alone cannot trump urgent short-term positional need; selling multi-role player recalculates coverage; unknown transfer fee blocks unconditional BUY; snapshots from unrelated careers cannot merge; role/finance changes reveal tradeoffs. See [Player Intelligence](08-player-intelligence-engine.md).
## Development scenario foundation (candidate)
The manual role what-if evaluator reuses the FM2013 duty registry and scoreRole. Explicit user-selected benchmark and growth-only attribute overrides are scenario data, never native draft patches. Locked, unknown, incompatible, decreased and invalid observations are rejected; remaining gaps are ranked by role importance × gap (not CA cost). The same player can be assessed against different role objectives without implying equivalent CA budget. Advisory RCA is research-only and disclosed in Editor mode; target-CA optimization, feasibility and training-time forecasts remain blocked without appropriate edition/build validation. This does not complete MH-14 or the full master prompt optimization/scenario-persistence contract.

Two manually configured role scenarios can be compared within one player panel; they are explicitly non-persistent and may have different unknown RCA costs. Stable initial-priority ordering keeps editing predictable. Current and proposed values, numeric delta, remaining gap priority, observed familiarity and coverage are visible. The user-selected reference level is a planning threshold, not a training target inferred by FM. A role change clears that scenario’s assumptions. No timeline, certified target-CA feasibility or automated growth allocation is produced.

### Saved development assumptions (candidate)
Versioned local library stores only explicit role/duty, reference level, attribute overrides and locks, names/IDs/timestamps, model versions and SHA-256 scope/revision bindings. No native CA/PA, hidden traits, player names, raw save bytes or computed ability metrics are stored. Exact save/player/build scope; export scope is the existing import identity. Visible inputs are canonicalized independently of mode; stale revisions cannot restore. Explicit save, restore, rename, duplicate, delete, JSON import and reviewed rebase; limit 20 records per player/source. JSON export contains assumptions rather than claimed forecasts. No native transaction or writer involvement.

**Scenario import and rebase (candidate):** Import previews a bounded v1 JSON library before an explicit confirmation, accepts only the exact scope and compatible model, rejects duplicate IDs, overflow and invalid current-revision inputs atomically, and never replaces active A/B assumptions. Stale records remain un-restorable until explicitly reviewed. Rebase is limited to the same source/player scope (for example, a changed visible draft); it is not a cross-save or career migration. It compares saved absolute targets with current observed attributes, removes already-met targets, retains unmet targets and applies locks at the current value. Missing/invalid inputs block the copy. No historical baseline is available from v1 records. A rebased record has a new ID and current revision, leaving the old record intact; restore is still explicit. Neither action invokes a native transaction or changes CA/PA. This is candidate scenario lifecycle implementation, not validated development forecasting or release acceptance.
