# Implementation update — Player Lab and import adapters

**2026-10-27 · Integrated development slice, NOT a completed product or a separate MVP.**

## What is coded
- `packages/domain/src/player-import.ts`: shared type-safe parser of user-supplied CSV/TSV and native HTML print-view tables. Handles semicolon/comma/tab separators, escaped quotes, embedded line breaks, BOM, capped input, 1–20 attributes, masked/ranged values as unknown, partial columns, unverified CA/PA claims.
- `packages/domain/src/player-analysis.ts`: shared version `heuristic-v0` role-demand definitions, score coverage suppression below 65%, transparent weighted contributors, basic group averages and Attribute Strength Index. **Index 0–100 != FM CA 1–200 and != calibrated eCA.** Does not infer PA.
- `apps/web/src/PlayerWorkspace.tsx`: full Player Lab route `/#/players`. User can import locally, search/player-select, see attribute radar with numeric equivalent, attribute bars, role-fit breakdown, strengths/lowest measured attributes, a head-to-head comparison against another player in the same export and provisional recruitment assessment. Data is kept in browser memory for the current page session, not uploaded or written to a save.
- Shared design tokens/UI and motion system from Phase 1. No unverified transfer verdicts; actual CA and PA stay unknown.
- Vitest tests for bad/masked/ranged attribute imports and score coverage, Playwright E2E for CSV/TSV/HTML and player UI on desktop/mobile.

## How to export data from Football Manager
1. In game, configure a Squad or Player Search view with **Name**, Position, Age and technical/mental/physical attributes.
2. **Native FM26 HTML route:** use the game's Print Screen/Web Page export to produce a locally saved `.html` table, then import it into Player Lab.
3. **CSV route:** use your own saved CSV/TSV export, for example from a third-party exporter or a converted in-game table. Use the actual data, not hand-created CA/PA values. Semicolon delimiter is supported.
4. Open `Player Lab` in ManagerHub, choose HTML/CSV/TSV/TXT, select a footballer and inspect the source-backed report.
5. Use **Compare** to view the same 1–20 attributes and the same role models for two players from the current import. Score gaps are only useful when comparable observed inputs exist.
6. For match-event charts, true CA/PA, transfer-value conclusions and calibrated eCA, additional verified sources or version-specific save decoding are still required.

External reference for native FM26 web-page export: https://github.com/AlbertShen31/FMExport ; https://www.fmdossier.dev/guides/exporting-player-data . Third-party CSV exporter reference: https://www.fmscout.com/a-fm26-player-csv-export.html . No plugin is bundled or required for native HTML export.

## Quality and compatibility caveats
- HTML content is read in a detached DOM document and only text from tables is used; no HTML pasted into the UI. Capped 12MB import, 20k rows and 160 columns.
- All exporter values are marked provisional `game_export`. CA/PA-like columns are explicitly ignored instead of falsely interpreted as verified hidden stats.
- Masked `-` and range values cannot be treated as numeric zeros. Attribute names use visible exporter names/known abbreviations; unusual translated/custom headers may require additional mapping.
- Role-fit model is a product-authored **heuristic**, not FM-specific in/out phase role logic. It does not account for positional familiarity/footedness because those are not reliably present in many exports.
- Position familiarity, squad vacancy/registration, financial affordability, opponent impact, calibrated eCA and native save writing remain in the full product roadmap.
- Identity is unique only within that import, not automatically merged across unrelated game saves.
- Native HTML tables can differ across FM releases; validate with real export fixtures before saying any edition is universally supported.

## Build and verification
```bash
npm install
npm run typecheck
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

CI runs on GitHub Actions; a committed test does not guarantee passing until its run completes. Track [implementation acceptance](05-feature-acceptance-ledger.md) and [features](../product/01-full-feature-catalog.md).

## Next meaningful work
- Validate player import with real FM26 print HTML exports and custom attribute headers.
- Source a legally suitable *same-edition labeled CA dataset* before calling any model eCA.
- Continue versioned `.fm` parser and stable local snapshot storage using bounded file access.
- Integrate Player Lab with Squad Planner and decision-aware recruitment, without copying role scoring into UI.
