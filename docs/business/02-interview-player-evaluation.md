# B02 — Evaluating the footballer, not just the rating

> Fictional Ferguson-inspired questions and answers, NOT real interview quotations.

### Q1. Is the player with the highest CA automatically the best starter?
**Imagined answer:** "Not unless he can do this job, in this side, on this Saturday."

Evaluate **six separate dimensions**:
1. Raw player ability/attributes (where verified in the save).
2. Position competence and role demands.
3. Tactical context: partners, distances, transitions and manager instructions.
4. Current readiness: injury, fitness, suspension, fatigue and schedule.
5. Reliability: decisions, concentration and mental demands.
6. Time horizon: age, contract, development ceiling and resale potential.

**Invariant:** A game CA is not a role score; role score is not expected match performance. Do not display derived values under FM's own stars without a strong disclosure.

### Q2. How do you judge a winger?
**Imagined answer:** "Look beyond dribbling. What does he create, and what does he cost us when possession turns?"
Example dimensions: carrying, crossing/passing, off-ball timing, final action, weaker foot, defensive recovery, role width, output under pressure. The weighting changes for a touchline winger versus an inside attacker, and also changes by tactical phase.

### Q3. How do we handle hidden attributes and imperfect scouting?
**Imagined answer:** "Confidence matters; don't pretend the unknown is known."
- **Manager realism mode:** show only observed/scouted information, ranges and confidence; don't reveal hidden numbers without explicit toggle.
- **Editor mode:** show verified hidden game values when accessible; label origin.
- Never guess missing values into actual CA/PA. Use null + reason: missing, unknown version, unavailable, or low coverage.

### Q4. Can a player have high potential and still be a poor signing?
Yes. Probability of reaching a ceiling depends on development environment, opportunities, injuries, age, finances and uncertainty. FM PA is a game value, NOT a probabilistic guarantee or a real-world growth forecast. Account for tactical need and contract economics.

### Q5. What should a comparison screen say?
For every candidate show: strengths; missing thresholds; role-fit components; position fit; current readiness; known-versus-inferred provenance; financial impact; robust alternative. Comparison must allow selection of different weights, display sensitivity and handle missing inputs.

**Acceptance examples:** A 150-CA defensive specialist can rank ahead of a 175-CA creator for a holding role; the screen explains which tactical deficits favor the former. An unknown PA is displayed unknown, never 0.

**Outputs:** player profile, transparent role fit, uncertainty labels, compare and shortlist.
**Systems:** [Domain model](../system/03-domain-schema-and-provenance.md), [role scoring](../system/06-tactical-engine-role-fit.md), [CA/PA editor](../system/05-player-editor-ca-pa.md).