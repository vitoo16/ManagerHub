# Frontend component boundaries and performance guardrails

**Status: implementation in progress — 2026-10-29**

This document records the component/performance work for Player Lab and Squad Planner. It does not claim a measured performance improvement until the production build and a browser profile are checked on the same dataset and environment.

## Component ownership

### Player Lab

- `PlayerWorkspace` owns session/selection state and composes the import, library, summary, list and report components.
- `usePlayerImport` owns file validation, browser-side HTML/CSV/TSV parsing and readable import-error mapping.
- `PlayerImportToolbar` owns file-selection and save/clear controls.
- `SavedPlayerLibraryPanel` owns the local saved-export list and its error/empty states.
- `PlayerDatasetSummary` owns export provenance and import warnings.
- `PlayerListPanel` owns search and selected-player list rendering.
- `PlayerDetails` composes the player identity, ability summary, report tabs and active tab panel.
- `PlayerIdentityHeader`, `PlayerAbilitySummary`, and `PlayerReportTabs` own their corresponding report sections.
- Attribute radar, ranked attributes, role results, head-to-head comparison, and recruitment sensitivity analysis are separate components under `features/player-lab/components`.

### Squad Planner

- `SquadWorkspace` owns the two plan configurations and coordinates calculations/actions.
- `TacticalPitch`, `LineupResults`, `PinEditor`, `ScenarioComparison`, and `SquadIssue` have separate UI responsibilities under `features/squad-planner/components`.
- Shared role-title presentation is centralized in `features/squad-planner/getRoleTitle.ts`.
- `useSquadPlannerModel` owns optimizer calls, scenario state transitions and stable callbacks, keeping calculation orchestration out of workspace JSX.

## Applied performance techniques

- The Player Lab and Squad Planner workspaces are loaded with `React.lazy` behind a `Suspense` boundary. This defers those route chunks until needed.
- Player report panels (radar, ranked attributes, role results, player comparison and recruitment) are lazy-loaded when their tab is selected.
- Presentational sections with stable, meaningful props use `React.memo`; this is a boundary optimization, not a blanket rule for every element.
- Expensive derived player insights and role analysis are memoized by player identity. Role results reuse the same analysis supplied by `PlayerDetails` instead of recalculating it for the overview and role tab.
- Head-to-head analysis memoizes role calculations, matching attributes and sorted differences. Its candidate is reconciled when the imported dataset changes.
- Roster and constraint search use `useDeferredValue` so input updates can stay responsive while large lists are filtered. The roster is still capped to 100 rendered entries and the pin/exclusion editor caps candidate lists.
- Squad Plan A and Plan B are optimized independently; changing one plan no longer forces the other plan's optimizer call to run again.
- Constraint callbacks, import actions and local-library actions are stabilized with `useCallback`. The library hook memoizes its returned API object.

## Guardrails

1. Keep calculations that can be expressed as pure domain functions outside JSX components.
2. Do not add `memo`, `useMemo` or `useCallback` without a reason: use them for expensive calculations, stable component boundaries, or measured render hotspots.
3. Use lazy loading at meaningful route/tab boundaries. Avoid splitting every small icon or label into a chunk.
4. Keep all visible copy behind the existing VI/EN i18n mechanism.
5. Never replace missing player attributes or positions with inferred values for performance or convenience.
6. Check that changing Plan A leaves Plan B's solution referentially stable when its inputs have not changed.
7. Verify typecheck, unit tests, production build and desktop/mobile E2E before merging.

## Validation still required

- CI on the current PR head must pass typecheck, unit tests, build and E2E.
- Inspect the production build output to confirm route and report-tab chunks are emitted as separate dynamic chunks.
- Use React Profiler with a representative large roster to verify whether memo boundaries reduce avoidable renders and whether search remains responsive.
- Record baseline and after-refactor measurements before making quantitative performance claims.
