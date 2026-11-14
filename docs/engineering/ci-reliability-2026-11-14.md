# ManagerHub — CI reliability and resource optimization (2026-11-14)

**State: candidate PR; NOT TESTED ON A RUNNER; NOT AN ACCEPTED PERFORMANCE IMPROVEMENT.**
Scope: GitHub Actions workflow configuration only, with no football domain, save reader/writer, gameplay or web application behavior changes.

## Existing gates preserved
- `code-quality`: npm clean install; oxlint, Prettier, TypeScript strict checks, all Vitest/Node AFE/FM2013 tests, and production build/bundle-budget check.
- `browser`: npm clean install; Chromium Playwright desktop and mobile E2E; upload failure evidence.
- No tests, job, stage or workflow removed or made non-blocking.

## Implemented changes
1. Keep PR-specific `cancel-in-progress` to avoid repeating obsolete PR revisions. Do **not** cancel verification of pushes on `main`.
2. Constrain the GITHUB_TOKEN to `contents: read` for both jobs.
3. Cache only Playwright browser downloads in `~/.cache/ms-playwright` keyed to the runner OS and committed `package-lock.json`. The Chromium installer still runs on every job and resolves missing browser revisions and OS dependencies.
4. Retain `npm ci`, existing npm dependency caching, exact test steps, existing runner labels/timeouts, and seven-phase/27-module acceptance scope.

## Verification and blockers
- Review the workflow diff and confirm both jobs and every original run command still exist.
- Once GitHub-hosted runner allocation is functional: run on this exact commit, require all original checks to pass, examine actual Playwright download/cache behavior, compare warm/cold critical path and billable runtime, and record job IDs and screenshots/traces where relevant.
- GitHub Actions has repeatedly failed before runner assignment for this account; a new commit is **not** a CI PASS.
- Do not merge or mark the 27-module ledger complete on configuration review alone.

## Rollback
Revert this PR's workflow and documentation commit(s); there is no lockfile, data schema or source-code migration.
