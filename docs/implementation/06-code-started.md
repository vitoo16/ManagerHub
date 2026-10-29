# Implementation status — code started 2026-10-27

**Actual work:** a React/Vite TypeScript workspace was committed to GitHub, separate from earlier specifications and agent skills. This does NOT mean the full seven-phase plan is complete.

## Implemented source paths
- `apps/web`: React application, keyboard route navigation, project command panel, theme and glass controls, overview, 27-module directory, local Save Library, evidence explanation.
- `packages/ui`: reusable SVG icon, button, status, surfaces, semantic styling with bounded Liquid Glass, light/dark and forced-color fallback.
- `packages/domain`: typed source evidence and future metric contracts, 27-feature catalogue, read-only AFE/FMF header detection and local SHA-256 for files up to 64 MiB.
- `packages/motion`: single scoped GSAP React transition with reduced-motion support.
- `tests/e2e`: Playwright flows for navigation, signature detection, theme and keyboard command.
- `packages/domain/src/save.test.ts`: format classifier and explicit no-decoder tests.
- `.github/workflows/ci.yml`: Node install, TS checks, Vitest, Vite build, Playwright desktop/mobile.

## Honest current limitations
- File import is *signature inspection only*, not version-specific save parsing. No player records, Actual CA/PA, eCA calibration, tactics or game editing.
- Save Library can explicitly persist validated inspection metadata in IndexedDB schema v2 and restore it after reload. The separate save-inspections store contains metadata only; original .fm bytes are not saved or uploaded. This still does not decode player records, identify an exact edition/build or validate CA/PA.
- Tauri native host and Rust parser are **not implemented yet**. Do not claim the native desktop app is available.
- Production components do not synthesize FM player statistics, financial data or match events.
- Dependency install/build/browser runs need a Node environment with npm registry access and a browser. A commit of tests is not evidence they passed; check CI run status.
- Full-product 27-feature scope is unchanged; Phase 1 frontend foundation is **in progress**, not complete.

## Getting started
```bash
git clone https://github.com/vitoo16/ManagerHub.git
cd ManagerHub
npm install
npm run dev
# http://127.0.0.1:4173/
npm run typecheck
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

The repo uses npm workspaces for now; `package-lock.json` should be generated and committed by a CI-capable developer after dependency resolution. Do not claim reproducible installs without that lock. No use of `npm ci` until present.

## Next engineering work
Verify the UI with browser screenshots and tests, validate the metadata-only IndexedDB migration, obtain permissioned and game-verified save fixtures, then build safe versioned Rust save adapters and Tauri local persistence according to [seven-phase roadmap](01-full-delivery-plan.md).

**Related:** [execution charter](00-execution-charter.md), [agent skills](04-motion-skills-and-references.md), [full feature ledger](05-feature-acceptance-ledger.md).

## Updated: read-only internal archive index prototype
- `packages/domain/src/archive.ts` implements strictly bounded deflate-based inspection of a candidate trailing FMF index, with UTF-16LE member names, offsets, sizes and an explicit experimental evidence flag.
- The user-provided real save has an **AFE outer signature** and a trailing marker matching the experimental FMF index pattern. The observed catalogue contains 69 entries, including `game_info.dat`, `game_db.dat` and `tactics_man.dat`. Its bytes remain private and are not committed.
- Keep outer container detection (`afe`) distinct from the internal trailing index candidate (`fmf-index-candidate`); the latter does not imply the save is an FMF-family container.
- `apps/web` lists member metadata only when the directory passes structural validation. This is NOT proof of member decompression, player extraction, edition/build identification, CA/PA decoding or a safe writer.
- Synthetic tests cover the 69-member catalogue shape and an AFE outer signature coexisting with the trailing FMF index marker. CI run [#156](https://github.com/vitoo16/ManagerHub/actions/runs/40888143543) passed TypeScript strict checks, unit tests, production build and desktop/mobile Playwright.
