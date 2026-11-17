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
