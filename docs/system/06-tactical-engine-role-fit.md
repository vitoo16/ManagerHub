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
## FM2013 role/duty reference registry — candidate

One canonical catalog (`packages/domain/src/football-role-registry.ts`) contains 28 community-reference role candidates and 15 native position keys. Baseline 10 roles retain their original IDs, order and weights; current squad optimization and default scouting comparison continue consuming that subset for compatibility. The Player Lab opt-in FM2013 explorer selects a position, role and concrete duty and displays observed familiarity separately from attribute-fit. Automatic duty has no fixed score without a selected strategy. The `target-forward` ID is retained for persisted plans while the FM13 reference displays Target Man. No FM14-only roles imported.

Evidence (consulted 2026-11-26):
- https://fromthemarshesfm.wordpress.com/2013/03/19/how-to-understand-and-use-player-roles-and-duties/ — FM13-era role and duty descriptions, positional constraints.
- https://community.sports-interactive.com/forums/topic/274736-fm-2013-a-simple-guide/ — January 2013 community guide, selected role attributes and duties, not a native formula.
- https://footballmanagerstory.com/football-manager-2013-guide-how-to-create-your-own-tactic-part-2/ — FM13 tactical combinations and defensive duties.
- https://fm-base.co.uk/threads/player-roles-duties-explained.76169/ — 2011 predecessor reference for sweeper/libero and duty details; **not** exact FM13 menu evidence.
- https://community.sports-interactive.com/forums/topic/268248-how-to-play-fm13-a-twelve-step-guide/page/3/ — FM13 discussion corroborates legacy specialist roles, including libero and defensive forward.
- https://www.fmscout.com/a-fm14-new-player-roles-explained.html — excludes the eight new FM14 roles.

Role and position/duty combinations are conservative community-reference candidates, not certified full game menus. In particular, DM Ball-Winning Midfielder and wide-striker position variants are not asserted in the FM13 explorer without direct build verification; the prior generic BWM slot remains unchanged. Defensive Forward duties need direct 13.3.3 verification. Importance values and duty overrides are original product heuristics informed by described responsibilities, not scraped numerical SI weights, training predictions or CA costs. Missing/noninteger/out-of-range attributes suppress evidence; 65% weighted coverage gate retained. Exact build menu screenshots/native role highlighting and independent review remain required for parity; no RCA or writer capability changes.
