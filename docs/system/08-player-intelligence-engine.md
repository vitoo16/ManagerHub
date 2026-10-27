# S08 — Player Intelligence, eCA and recruitment decision engine

**Status:** Proposed, not implemented. Related business: ../business/13-player-intelligence-and-scouting.md

## The four values must not be confused
- **Actual CA**: authoritative game field *only if verified from a compatible reader*; conventional FM ability scale 1–200.
- **eCA (Estimated CA)**: ManagerHub prediction from current attributes, positions, foot and other legitimately available inputs. It is not game CA and is not a reproduction of SI internals.
- **RCA-style budget estimate**: a separate model for attribute-cost consistency, inspired by editor workflows; do not claim FMRTE numerical parity.
- **Role Fit / Tactical Fit**: suitability indices (0–100 product units), not actual CA, and not win probability.
- **PA**: never inferred as a precise hidden game PA from attributes alone.

## eCA engine — phases
1. **Input validation:** edition/build, player type (GK/outfield), age, position set/familiarity, both feet, visible/verified hidden attributes and completeness. No invented values. Asterisks/ranges/scouting masks become interval-valued inputs where feasible.
2. **Baseline heuristic:** configurable, documented weighted attribute profiles per positional archetype, with normalized feature encoding. Do not confuse simple weighted attribute averages with exact CA. If positional effects are unknown, output 'insufficient' rather than an authoritative eCA.
3. **Calibration model:** train a supervised estimator on a properly licensed, diverse set of **same-version players where both attributes and actual CA are verifiably available**. Validate with disjoint saves / clubs / players to prevent player leakage. Compare interpretable linear baseline against monotonic GAM/tree model, inspect errors across GK/outfield, positions, ability tiers and foot/versatility.
4. **Model output:** eCA point estimate and calibrated prediction interval, modelVersion, coverage, sample cohort, evaluation metrics (MAE, median AE, calibration). If insufficient data, show preliminary index without presenting it as CA.
5. **Drift:** alert if applying an FM24 model to FM26; require per-edition compatibility or published out-of-domain warning.

Do **not** fit the model to screenshots of CA without legal/test provenance or use the player's own actual CA as model input when producing eCA. If true CA exists, compare Actual CA vs eCA as diagnostic only, never overwrite game field.

## Position/role evaluation
For every compatible role: weighted technical/mental/physical skill bundles, position familiarity, footedness, defensive and attacking phase demands. Separate:
- best natural position
- best *attribute-fit* position even if untrained (retraining candidate)
- best tactical slot in user's current squad
- match-specific availability / workload

Report top three roles with tradeoffs, weak required attributes, partner-role risks and counter-evidence. Edition-specific FM26 in/out-possession catalog; no universal FM24 duty mapping.

## Scout and transfer model
Inputs: current squad gap, incremental tactical utility, starter/backup needs, credible price/wage/fees, age and contract horizon, availability, development opportunity, competition registration, evidence coverage.
Output: **Buy / Shortlist / Loan / Develop Internal / Pass / Insufficient Data** with explanation, price sensitivity and alternative. This is a decision recommendation, not game certainty. No invented fee if save lacks one. A cheap player with limited ability can beat an expensive star as a depth signing.

Example decision criteria (configurable):
- hard gates: affordability, registration, must-have tactical requirements, availability
- weighted comparison: marginal XI value, alternative cost, adaptation uncertainty, useful versatility and growth opportunity
- scenario tradeoffs: signing player vs promoting prospect vs retraining incumbent

## Data contracts (conceptual)
```ts
interface AbilityEstimate {
  value: number | null;                // 1–200 when calibrated
  predictionInterval: [number, number] | null;
  modelVersion: string;
  evidenceCoverage: number;            // [0,1]
  calibrationStatus: "validated" | "experimental" | "insufficient";
  source: "derived_model";
  reasons: string[];
}
interface PlayerReport {
  playerId: string;
  snapshotId: string;
  actualCA: number | null;             // only verified
  estimatedCA: AbilityEstimate;
  abilityBudgetEstimate: AbilityEstimate | null;
  roleFits: { roleId: string; edition: string; phase: string; score: number | null; coverage: number; factors: string[] }[];
  chartAvailability: Record<string, "ready" | "partial" | "unsupported">;
  recommendation: { verdict: string; confidence: string; reasons: string[]; alternatives: string[] };
}
```

## Acceptance
- eCA, actual CA, role fit and percentile remain visually distinct, including exports.
- No exact eCA when calibration invalid or missing > threshold; unknown PA stays null.
- Ranking candidate for role changes with tactical demands; expensive star need not be recommended.
- GK/outfield and FM edition are separated; prevent unsupported model extrapolation.
- Every output yields provenance, missingness, explanation and model revision.
- Training-test isolation and subgroup error reports mandatory before calling output 'estimated CA' (until then 'attribute strength proxy').

## Chart data rules
- Attributes chart uses actual attribute values/scale.
- Football event charts require event-level data (shots, passes, actions, coordinates). No shot map or passing network based on coarse season totals.
- Per-90, percentile and trend require minutes, cohort, season and minimum sample; show n and percentile cohort prominently.
- Never manufacture individual game performance from CA and attributes.

Sources: ../references.md ; FMRTE CA/RCA distinctions and FM26 role split are external references, not proof of our model.
