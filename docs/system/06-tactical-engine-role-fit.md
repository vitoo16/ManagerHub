# S06 — Tactical Intelligence and versioned Role Fit

Business principles: [B03 tactics](../business/03-interview-tactical-model.md), [B02 evaluation](../business/02-interview-player-evaluation.md).
FM editions differ: separate In Possession and Out of Possession shapes and updated roles in FM26 need an edition-specific catalog; do not silently map FM24 duty roles.

## Four tactical moments
Possession: build-up, progression, chance creation, width and occupation.
Out-of-possession: defensive block, pressure/cover, line height and compactness.
Attacking transition: outlets, runners, counterattack routes.
Defensive transition: counter-press, rest defence and protection against counterattacks.
Set pieces: separate rules and player matchups.

## Distinct derived outputs
Position familiarity = how familiar a player's in-game position is. Role Fit = suitability for role-specific attribute demands (0–100 ManagerHub index). Tactical Fit = compatibility with current manager instructions and phase. Cohesion = complementary combination of all XI roles/players. None is Actual CA or win probability.

Illustrative explainable baseline: weighted normalized role attributes + position familiarity with configurable weights. This is a **product model** only; inspect missing coverage and show score contributors. If too many core fields are absent, report insufficient data.

Collective warnings: two advanced fullbacks without cover; exposed high line without effective ball pressure; isolated lone forward; insufficient progression lanes; redundant narrow attacking roles. Explain trigger and cost of alternatives.

UX: phase-specific pitch, side panel listing causes and recommended fixes, comparator A/B, player-role cards, reasoned override.

Tests: role conflict triggered under defined model inputs; removing attacking FB/adding midfielder cover updates warning; incompatible roles don't map silently; missing attrs don't inflate scores; 11 unique IDs in lineup. See [optimizer](07-squad-optimizer.md) and [full feature catalogue](../product/01-full-feature-catalog.md).