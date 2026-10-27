# ManagerHub — Local Player Library & Squad Planner

**Implementation slice:** 2026-10-28. This is a connected part of the complete 27-module ManagerHub roadmap, **not a separate MVP**.

## Local Player Library (real code)

The local browser app supports opt-in persistence of **normalized player exports**. Flow:

1. Go to Player Lab, import a genuine FM-exported HTML/CSV/TSV list.
2. Review provisional player attributes and role scoring.
3. Click **Save on this browser**. Nothing is persisted until explicit user action.
4. Reload the page or reopen the browser; select a saved export from the local library and press **Open**.
5. Press **Delete**, then **Confirm delete** to delete its locally stored data.

Storage: IndexedDB `managerhub-local`, schema v1, separate `player-exports` and summary object stores, both changed in a single transaction. Maximum 20 saved exports; no `.fm` binaries, scripts or raw HTML are saved. This is per browser profile/origin and is **not encrypted or cross-device synchronized**. Browser storage deletion/private mode may erase it. Data corruption or unsupported schema fails with an actionable message, not an invented replacement.

Relevant code: `packages/domain/src/player-library.ts`, `packages/storage/src/index.ts`, `apps/web/src/usePlayerLibrary.ts`, `apps/web/src/PlayerWorkspace.tsx`.

## Squad Planner — strict, evidence-aware 11-player draft

Connected to the same Player Lab data via shared `PlayerDataset` state. It currently provides:
- 4-3-3 and 4-2-3-1 formations, with fixed versioned *ManagerHub heuristic* role templates.
- Native/clear position parsing, e.g. `GK`, `D (LC)`, `M (C)`, `AM (R)`, `ST (C)`. Unknown positions are **not** interpreted as eligible.
- Per-slot weighted attribute-fit score only when at least 65% of required weighted attributes are observed.
- A minimum-cost exact bipartite assignment solver with **one player per slot and at most one slot per player**. If a complete compatible XI does not exist, it reports infeasible and shows per-slot candidate counts instead of filling gaps.
- Responsive pitch diagram, accompanying accessible eleven-player list, average heuristic role score and positional-coverage diagnostics.
- No invented players, native CA/PA, predicted win percentages, fitness, contracts, competition registration or squad chemistry.

### Manager-controlled Plan A / Plan B

The Squad Planner now supports two independent, user-editable planning configurations in the same current imported roster. Each plan has a formation, a slot-to-player lock map, and a set of excluded players. From the UI, use **Plan A** and **Plan B**, search candidate dropdowns, pin a player to an eligible position, toggle an exclusion, **Clear all constraints** or **Copy A into B**. Every modification re-runs the exact 11-slot assignment engine across the whole available roster. The plans currently exist in app component state and are intentionally **not silently saved** or synced. IndexedDB persistence applies to player-export snapshots only.

Hard failure conditions include duplicate pins, player exclusion/lock conflict, missing player IDs, unsupported positions, insufficient attribute coverage, unmatched slots and impossible assignments. Under any of these, the pitch shows an explicit infeasible state, not a partial eleven disguised as a playable lineup. Candidate dropdowns list the **50 highest scoring eligible players** or results matching the user search; the solver itself still considers all eligible players.

Comparison reports player changes and role-score changes only for **two complete starting elevens using the exact same formation**. Different formations have different role requirements and their averages are not treated as directly comparable. Comparisons are not claimed to predict the match outcome or measure dressing-room chemistry.

This is **not a validated FM26 in-possession/out-of-possession engine** and not a full Squad Planner 2.0 yet. Position eligibility comes from the exported text; it is **not** in-game positional familiarity. The current optimizer maximizes sum of individual role attribute fit under hard eligibility/uniqueness only; partner interactions, fatigue, phase-specific roles and economic scenarios remain planned. A role-fit index is not the match engine's exact internal score.

Relevant code: `packages/domain/src/squad-optimizer.ts`, `apps/web/src/SquadWorkspace.tsx`, `apps/web/src/squad-workspace.css`.

## Quality and expected edge cases

- Read-only FM save inspection remains unchanged and isolated from exporter-based Player Lab.
- 20k-row imports render **only 100 player list rows at a time**, with a visible progressive Show more control and full search over the import.
- Versioned storage schema and unknown-field handling; no silent 0 substitution for absent attributes.
- Unit tests verify schema rejection, role coverage, strict position parsing, 11 unique IDs, pins, exclusions, repeated assignments, infeasibility and A/B score-comparison compatibility.
- Playwright desktop/mobile tests cover import, explicit save, reload, restore, delete, 11-player lineup, formation change, scenario tabs, locked slots and impossible exclusions.
- Running tests is documented in root README and workflows. **Do not claim CI success for an unverified commit.**
- Original `.fm` save is never modified or uploaded by these features.

## Next integration work

1. User override/pinning and saved tactical scenarios, followed by phase-specific role catalogues and position constraints.
2. Import real FM26 exporter fixtures (different locale, actual native HTML table layout); harden coverage and attributes.
3. Expand `.fm` format reader only with exact-build test fixtures and independently game-verified values.
4. Solve multi-season stable player identifiers rather than identifying players by name.
5. Calibrate estimated CA only after a labeled, authorized same-edition CA dataset and holdout MAE confidence testing.

See [all 27 requirements](../product/01-full-feature-catalog.md), [core plan](01-full-delivery-plan.md), [Player Lab](07-player-lab-and-export-import.md).
