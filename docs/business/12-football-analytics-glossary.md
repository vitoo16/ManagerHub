# B12 — Football analytics glossary, observability and false precision

This is a **business dictionary**, not proof a particular metric is present in any FM save.

| Metric | Meaning | Misinterpretation to avoid |
|---|---|---|
| CA | Game's Current Ability measure when genuinely decoded | Not a 0–100 role-fit percentage |
| PA | Game's Potential Ability ceiling/parameter when genuinely decoded | Not guaranteed future CA |
| RCA | FMRTE's recommended CA estimate based on attributes/positions | Not an independently verified FM engine field |
| Role fit | Manager Hub's configurable weighted compatibility | Not identical to game stars or performance |
| Tactical fit | Collective compatibility with shape/partners/phase | Cannot be inferred from role fit alone |
| Depth coverage | Feasible substitutes for required functions | One player cannot fill two simultaneous slots |
| xG | Expected goals computed by a defined shot model | A game/third-party number needs source and model |
| xGA | Expected goals against | Not automatically match result or defensive ability |
| xG difference | xG for minus xG against | Sensitive to opposition and sample |
| PPDA | Passes allowed per defensive action in defined zone | Different providers define zones/actions differently |
| Progressive passes | Passes materially advancing the ball by stated threshold | No universal definition without provider |
| Field tilt | Share of final-third passes/territorial volume (provider dependent) | Not equal to quality of chances |
| Shot quality | Goal probability of a specific shot under a model | Unavailable without shot features/model |
| Workload | Recent minutes and intensity proxies | Not clinically validated injury risk |

## Analyst workflow
1. Declare question and cohort (league, opponent, period, minutes).
2. Check source: directly decoded FM field, user-entered, third-party data, inferred, scenario.
3. Capture definition, source version, units and missingness.
4. Normalize for minutes/opponents when justified; avoid 90-minute rates at tiny samples.
5. Calculate uncertainty (confidence/range/sample flag), never imply more certainty than data allows.
6. Show driver breakdown and counter-evidence.
7. Validate usefulness against future held-out matches/saves, not just past fit.

## Units and missing values
Attribute scales and monetary units must be version-specific. Null ≠ 0. Distinguish unverified, unsupported, unreadable, stale and not applicable. In a comparison missing records cannot silently be dropped to make a candidate look stronger.

## Example model card: Role Fit v0
Inputs: verified attributes, positional familiarity, selected role version, tactical phase. Output: 0–100 **product index**, not a probability. Weights: editable. Limitations: does not reproduce FM match engine; player partnership and form must be considered elsewhere. Evaluation: comparison to coach judgments and later match observations, with leakage controls.

## Source grounding
Official FM terms and FMRTE-specific ability labels are linked in [References](../references.md).