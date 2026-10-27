# P04 — Player Intelligence & Scouting Lab: UX specification

**Status:** Proposed. No implementation yet.

## Primary jobs
1. See estimated CA from available attributes, with explicit uncertainty, plus actual verified CA when available.
2. Explain strengths, weaknesses and playing style in football terms.
3. Compare best natural, retraining and squad-specific positions / roles.
4. See performance charts based ONLY on existing reliable data.
5. Decide buy/shortlist/loan/pass versus current squad and alternatives.

## Screen information architecture
Header: player identity, age, club, position, foot, condition, injury, contract, source snapshot.
Hero KPI strip: Actual CA [when verified] / eCA with uncertainty / PA [when verified] / role fit / tactical fit / availability.
Persistent switch: Realistic Scouting (hidden attributes restricted) vs Editor Data (requires authorized, verified decoder).
Tabs:
- Overview: analyst summary, six attribute families, strengths, weaknesses, caveats.
- Abilities: attributes table, eCA, diagnostic Actual CA – eCA (only if both), estimated CA explanation, sensitivity toggles, model card.
- Position & Roles: pitch heatmap of position suitability, top roles in possession and out of possession if supported, natural familiarity vs retraining, weaknesses.
- Performance: supported match statistics, minutes, sample size and league/role cohorts.
- Tactics: performance of player in own XI, partner roles, rest-defence risk, alternatives.
- Recruitment: Buy / Shortlist / Loan / Internal alternative / Pass / Insufficient Data, spending scenarios and confidence.
- Development: age/contract, attribute trends and season snapshots, youth plan if appropriate.
- Compare: pinned candidates and own-club baseline.
- Notes & Evidence: scout notes, flags, model versions, provenance, source links.

## Chart inventory: choose based on input coverage
| Visualization | Question answered | Minimum inputs | Caveat |
|---|---|---|---|
| Radar / pizza of ability dimensions | What kind of footballer? | Relevant attributes or stats | Label whether absolute 1–20 attributes or cohort percentiles |
| Horizontal attribute bars | Which exact qualities drive role? | Complete attributes with valid edition scale | Show required vs optional values |
| Role fit bars/top-5 | Where can he play well? | Verified edition roles, attributes, position familiarity | Not actual match-engine role star |
| Pitch suitability map | Natural position vs retraining opportunities | Positions/familiarity and verified attribute groups | Never imply training instantly completed |
| Percentile radar | How he ranks among peers? | Statistics, minutes and named cohort | Show percentile cohort, sample threshold |
| Scatter plot | Value for money vs ability/fit | Price, expected wage and score | Missing prices exclude affordability conclusions |
| Time-series | Is he improving? | Linked snapshots with time and matching version | Show gaps, mark edits and patch changes |
| Shot map/xG | Where shots come from? | Shot-level XY, type, xG model if present | Hide if raw events absent; no invented xG |
| Pass network | How he interacts? | Pass-event XY, teammates and minutes | Not derivable from total passes alone |
| Carry/pass progressive chart | How he progresses? | Position-resolved ball event data | Define progress threshold/version |
| Touch heatmap | Where does he play? | Touch positions | Attribute-based "likely areas" belongs in a separate simulation |
| Availability timeline | Can he play reliably? | Match minutes and injury/availability history | Not clinical injury prediction |
| Transfer cost breakdown | What does signing cost? | Wage, fees, expiry, installments, currency | Unknown is not free |

## Example insight cards
- **Strength:** "Progression through centre: Passing and Vision are strong relative to role requirements." Supporting attributes clickable.
- **Weakness:** "Limited defensive screening: Marking/Positioning below your chosen threshold." Define thresholds.
- **Position:** "CM playmaker fits his attributes; DM ball-winning specialist is a poor match. Retraining may be explored, not guaranteed."
- **Transfer verdict:** "Shortlist, if the asking price and wages fall within parameters. Your team already has two playmakers, so defensive ball winner may be more urgent."

## UX conventions
- Never put eCA next to actual CA without labels.
- eCA must show estimate interval and confidence/model status; no false single-number certainty.
- Source badges on hover: game field / third-party stats / calculated / human input / hypothetical.
- Missing data empty-state invites export/import alternative, never fabricated chart.
- Full keyboard navigation and mobile stacking; accessible equivalent to visual charts.
- Side-by-side player compare keeps the *same axes and cohort*, otherwise comparison is misleading.
- Each chart offers table and download of underlying values and definitions.
- Use restrained dark visual design and meaningful accent. Chart color carries legend and remains distinguishable in colorblind modes.

## Key acceptance stories
- Switching role immediately updates weighted attributes, role fit, weakness cards and transfer suitability, but **does not update actual CA**.
- When performance events are unavailable, overview/attribute charts work and shot maps/pass networks are hidden with explanation.
- Switching to Realism Mode suppresses hidden ability values across all cards and the AI explanation.
- Candidate is evaluated marginally against user's squad; cannot recommend signing without noting unknown price.
- Percentile chart shows competition/position/season cohort and minutes threshold; chart export includes definitions.

See ../system/08-player-intelligence-engine.md, ../business/13-player-intelligence-and-scouting.md and ../references.md.