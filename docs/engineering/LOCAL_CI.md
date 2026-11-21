# ManagerHub — Local-first CI/CD

Runs the former GitHub quality gates on the developer's own Windows machine. This change does not assert any tests passed. GitHub Actions is retained for manual workflow_dispatch only.

Requirements: Git for Windows, Node.js 24.x, npm and Playwright Chromium prerequisites. In PowerShell:

    git config core.hooksPath .githooks
    node scripts/local-ci.mjs --profile quick
    node scripts/local-ci.mjs --profile full
    node scripts/local-ci.mjs --profile release

Quick: npm ci, oxlint, limited Prettier baseline, TypeScript, Vitest + AFE/FM2013 Node tests, Vite build and bundle budget.
Full: all Quick gates plus Chromium desktop/mobile E2E. Release: all Full gates and local staging; requires clean Git worktree.

Evidence is kept in ignored .local-ci/runs/<timestamp>-<profile>/summary.json and individual logs. Playwright failure traces are under test-results/.
Local CD only stages apps/web/dist with a commit-linked manifest under .local-ci/releases; it NEVER deploys to production or handles signing/credentials.

The .githooks/pre-push hook runs Quick if git config core.hooksPath .githooks is set. It is not a substitute for Full on the exact PR/release commit. Local hooks do not protect GitHub browser merges or other computers. Keep independent review and evidence.

Limitations: GitHub branch protection cannot consume local statuses automatically. Real FM2013 save decoding/writing and other unimplemented modules are not certified by this CI. Never mark native editing safe based on CI alone.

## Commit-bound evidence (new; subject to PR review and rerun)

Every `summary.json` now records `source.gitHead` (full 40-character SHA), branch, clean Git worktree state at start/end, SHA-256 of `ci/local-pipeline.json` and `package-lock.json`, and whether those identities remained stable. Each executed stage has `logSha256`, letting reviewers verify that its local log bytes match the summary. No private paths, complete source tree or save contents are embedded in these hashes.

**`success` means the configured stages executed with zero exit codes AND the checkout/CI inputs did not change during the run.** `acceptanceEligible` additionally requires a clean worktree at both endpoints. Quick/Full on dirty sources may legitimately return `success: true` for diagnosis, but must **never** be used for release or PR acceptance. Release refuses dirty source before expensive stages. A passing `summary.json` by itself is not authenticated proof of who executed the tests; preserve original logs and run from a trusted local machine.

After running, check `summary.source.gitHead` against `git rev-parse HEAD` and the remote PR commit, `summary.acceptanceEligible === true`, every stage exit status and `logSha256` against the on-disk log. A local run does **not** create GitHub branch-protection statuses. For a new PR/merge commit, rerun the full applicable profile; previous PASS on another SHA cannot be carried over.

The synthetic regression tests for this contract are part of `npm run test` and can be run independently with `npm run test:node:ci`. These tests use temporary fixture Git repositories and do not read any FM saves or contact GitHub.


## FM2013 Windows native host gate (Phase 2 / Issue #88)

The research-only native smoke host uses **.NET 10 LTS** (not .NET 8, which reached end of support on 2026-11-10). Windows host build validation is additive: `ci/local-pipeline.json` now contains `native-windows`, which compiles `native/ManagerHub.Fm2013Host` and runs its **no-attach** JSON/parser self-test. No previously existing quality, lint, test, E2E or release stage has been removed.

Current profile stage counts on this feature branch: **Quick 6 / Full 9 / Release 10**. Quick includes additional mocked broker lifecycle tests through the existing `test:node:fm2013` script; Full and Release additionally require a Windows machine and the .NET 10 SDK/runtime. `native-windows` failing due to missing .NET or on a non-Windows machine is a **real gate failure**, not a reason to skip the stage and still claim acceptance. Keep its failure logs and rerun on a correctly provisioned Windows Node24 machine.

A clean pass only attests to compilation and parser/broker test execution. It does **not** attest to a user-authorized live FM2013 read, RTTI/ABA correctness, a secure browser IPC channel, Actual CA/PA, or an offline save decoder. See [native smoke host](../../native/README.md).
