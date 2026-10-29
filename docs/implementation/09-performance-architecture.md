# ManagerHub performance architecture

**Status as of 2026-10-29:** merged into `main` via [PR #7](https://github.com/vitoo16/ManagerHub/pull/7). GitHub Actions run [#125](https://github.com/vitoo16/ManagerHub/actions/runs/40857301253) passed TypeScript strict typecheck, unit tests, production build/bundle budget, and desktop/mobile Playwright. This verifies correctness and bundle guardrails, not a measured runtime improvement; no before/after performance percentage is claimed without a representative browser profile.

## Principles

1. **Measure with guardrails, do not optimize by superstition.** Use bundle budgets, bounded DOM, existing domain tests and browser profiling. `memo` is reserved for components whose inputs are stable and whose work is meaningful; it is not a blanket wrapper for every component.
2. **Keep the main thread available for interaction.** File hashing/archive inspection and CSV/TSV tokenization are performed in dedicated Web Workers. HTML player export parsing remains on the main thread because the current hardened parser relies on `DOMParser`; do not replace it with unsafe HTML regex parsing just to claim all parsing is off-thread.
3. **Keep rendered work bounded.** Player Lab virtualizes the loaded portion of the roster with a fixed-height row window and overscan. It loads another 100 records only when requested; the number of DOM nodes stays bounded as the loaded list grows. Squad exclusion and pin options remain capped.
4. **Do not repeat expensive calculations without a reason.** Player analysis is memoized by immutable player identity. Recruitment's optimizer runs only after its tab is first opened and remains mounted when the user switches tabs. Plan A and Plan B are optimized independently so editing one plan does not re-run the other.
5. **Cache by a trustworthy lifetime.** Unconstrained XI solutions are cached in a `WeakMap` keyed by the imported players-array identity and formation. This allows Player Lab and Squad Planner to reuse the same baseline while letting discarded datasets be garbage-collected. Do not mutate imported arrays in place.
6. **Filter before scoring.** Each active search surface builds a normalized index once per imported roster; deferred query values keep input updates responsive. Candidate text filtering happens before positional parsing and role scoring. The optimizer reuses role scores when a formation repeats the same role in multiple slots. Squad Planner's slot-candidate dropdowns cache normalized text and declared positions by immutable roster identity, so the eleven selectors reuse one search index across queries.

## Implemented controls

### Code splitting

- `PlayerWorkspace` and `SquadWorkspace` load through `React.lazy` with an accessible, translated `Suspense` fallback.
- The Recruitment Preview is a separate lazy chunk, loaded only when a user first opens that tab.
- Workspace CSS is imported from the lazy modules, allowing Vite to emit associated CSS chunks.

### Render and calculation boundaries

- Extracted `RecruitmentPreviewPanel`, `CoverageDiagnostics`, `ContributionMetrics`, and `PlayerListItem` into feature-scoped component files.
- Memoized the virtualized player row, player report subcomponents and expensive Squad Planner presentation components.
- Stabilized navigation and scenario callbacks where child memoization depends on callback identity.
- Cached player insight, attribute ordering, role analysis, and comparison search derivations.
- Kept independent Squad Planner scenario calculations separate by plan identity.

### Large data and background work

- Player list: fixed 56px rows, 5-row overscan, bounded window, and incremental loading by 100 records. The virtual window uses the measured scroll-container height (including the smaller mobile viewport), slices only the rows in view, and preserves scroll position when loading another 100 records. Search or roster changes reset the scroll position.
- CSV/TSV import: transfer the input `ArrayBuffer` to a Web Worker and parse there. HTML remains on the main thread for the safety reason above.
- Save inspection: run SHA-256 and bounded archive-index inspection in a Web Worker, keeping the UI responsive while the browser reads larger files.
- Existing parser limits (12 MB player exports / 20,000 rows and bounded save inspection) remain in force.

### Build budget

The web build emits Vite's manifest and runs `scripts/check-bundle-budget.mjs` after compilation.

- Initial static JS + CSS: at most 450 KiB raw and 150 KiB as the sum of per-file gzip sizes.
- Every emitted JavaScript chunk, including lazy and worker chunks: at most 400 KiB raw and 145 KiB gzip.
- Vite's chunk warning limit is set to 400 KiB as an additional warning.

The latest successful build reported an initial static JS+CSS closure of **419.8 KiB raw / 137.5 KiB gzip-sum**, below the 450/150 KiB budgets. This is a manifest-based size metric, not a network transfer or interaction-latency measurement.

The initial asset graph ignores a module's own dynamic-import targets if they also appear in its preload-oriented import list, while retaining a chunk reached through another module's static import path. This prevents shared static dependencies from being undercounted.

The gzip-sum budget is intentionally conservative and is not the same as a real transfer measurement; actual transfer size also depends on server compression, cache state and request headers. The budgets are regression alarms, not a substitute for a browser performance profile.

## Verification gates for future changes

- Strict TypeScript typecheck.
- Full Vitest suite, including the unconstrained-solution cache correctness test.
- Production build and bundle budget check.
- Playwright desktop/mobile suite, including save inspection, CSV import, lazy Recruitment handoff and the large-roster bounded-DOM test.
- Review generated chunk sizes and inspect browser console errors.
- For a measured runtime improvement, profile cold navigation, CSV import and Squad Planner recalculation on a representative low-powered device. Record the device/browser, roster size, cold vs. warm runs, median and p95 timings, main-thread long tasks, memory observations and trace/profile evidence. This measurement remains outstanding; do not infer a percentage improvement from bundle size or CI pass status.

## Deliberate non-goals

- Do not add a virtualization dependency for lists already bounded to 20–60 entries.
- Do not move HTML parsing to a worker using regex that bypasses the existing inert DOM parsing and sanitization.
- Do not introduce a global cache keyed by filenames, mutable arrays or player names; those are not reliable dataset identities.
- Do not memoize tiny, frequently changing components when props cannot remain stable.
- Do not claim that Web Workers reduce total CPU work; they move it away from the UI thread.
