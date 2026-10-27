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
- Web currently holds inspected file **metadata in the browser session**, not the file bytes in a backend database. Files are not uploaded.
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
Verify the initial UI with actual browser screenshots and tests, fix any CI failures, migrate common state/error primitives into shared packages when actual reuse emerges, then create safe versioned Rust save adapters and Tauri local persistence according to [seven-phase roadmap](01-full-delivery-plan.md).

**Related:** [execution charter](00-execution-charter.md), [agent skills](04-motion-skills-and-references.md), [full feature ledger](05-feature-acceptance-ledger.md).

## Updated: read-only internal archive index prototype
- `packages/domain/src/archive.ts` implements strictly bounded deflate-based inspection of a candidate trailing FMF directory, with UTF-16LE filenames, offsets, sizes and explicit unverified flag.
- Tested on a user-provided private file **without committing its bytes**: the observed AFE file includes a 69-entry directory with members such as `game_info.dat`, `game_db.dat` and `tactics_man.dat`.
- `apps/web` lists member metadata only when the directory passes structural validation. This is NOT proof of player extraction or a safe writer.
- Added parser malformed/extent tests and a synthetic browser E2E test. Check latest CI before claiming these tests passed.
