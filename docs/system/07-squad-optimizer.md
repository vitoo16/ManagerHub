# S07 — Best XI, squad depth, rotation and succession solver

A player-to-slot assignment problem. Let x[p,s] = 1 when player p occupies slot s; each slot has one player; each player occupies <=1 slot. Exclude genuinely unavailable/registration-ineligible players when verified. If constraint unknown, flag it, never invent.

Optimize a chosen scenario:
- **Max Ability:** independent role-specific player utility baseline.
- **Balance:** interactions and cover, pressing and transition risk, tactical completeness.
- **Opposition:** baseline plus observed matchups and opposition weaknesses, only if data exists.
- **Rotation:** recovery/minutes and availability while maintaining role coverage.
- **Future:** replacement and youth pathway in 1/3/5 seasons.

Objective includes weighted slot suitability + partner compatibility - rest-defence/role conflicts - budget/workload pressure. Hard constraints never silently relaxed. Solver may use mixed-integer/CP-SAT for assignable constraints plus evaluation re-ranking for nonlinear chemistry; expose infeasible reasons.

On drag/drop reassignment (e.g. moving winger to RB), recompute the entire XI and rotation coverage. Track opportunity cost and positional alternatives; a versatile player cannot cover two simultaneous matches/slots.

Show scenario cards with strengths/weaknesses, score components, confidence, 2–3 alternatives, manager overrides and saved decision history. Bounded performance benchmark on real squad fixtures; no fake win percentages.

Test: uniqueness, no unavailable starters, edit scenario does not mutate source save, rotation handles missing starters and multi-role players, deterministic solution under fixed inputs, mismatch across snapshots rejected. See [B04](../business/04-interview-squad-construction.md).