> **Updated superseding research (2026-10-27):** [Official GSAP Skills + Motion Reference](../implementation/04-motion-skills-and-references.md) and [Liquid Glass Motion Spec](../implementation/03-liquid-glass-motion-spec.md). Taste Skill v2 **does support dashboards/app screens** via `references/app-screens.md`. Use the app-screen branch with Impeccable, Vercel and the ManagerHub data/motion skills. Official GreenSock gsap-skills are the default GSAP agent source. The installer now includes them.

# E01 — Agent Skills Research & Installation Strategy

**Research date:** 2026-10-27. **Repository:** vitoo16/ManagerHub.
**State:** This file is a reviewed skills catalogue and instructions, **not proof that third-party skills have been installed in any developer machine**. Our original project-specific skills are stored in `.agents/skills`.

## Why curated skills, not "install everything"
ManagerHub spans FM binary ingestion, quantitative football analysis, professional dashboards, desktop integrations and optional AI assistance. An agent that loads dozens of overlapping style skills will be inconsistent. Apply skills **by task**, prioritize official maintainers, review executable scripts and licenses, and pin versions/commits in a reproducible team setup once production coding starts. Never execute code from a new third-party skill without review.

## Required UX/design stack — user selected

| Skill (exact name) | Upstream | Priority | Use in ManagerHub |
|---|---|---|---|
| `web-design-guidelines` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | **Must** | Accessibility, keyboard, focus rings, validation, forms, motion, chart legibility, responsive review |
| `design-taste-frontend` | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | **Must** | Brand work plus a separate dashboard/analytics app-screen workflow in `references/app-screens.md` |
| `impeccable` | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | **Must** | Shape before code; critique, audit, polish, harden and reusable product design context |
| `vercel-react-best-practices` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | **Must if React** | Tables with thousands of players, split views, chart lazy-load, render perf, no waterfalls |
| `vercel-composition-patterns` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | **Must if React** | Reusable tactical board, slots, cards, tables and flexible role-based UI |

Direct verified vendor references: [Vercel guidelines](https://vercel.com/design/guidelines); [Vercel skills](https://vercel.com/docs/agent-resources/skills); [Taste documentation](https://www.tasteskill.dev/docs); [Taste README](https://github.com/Leonxlnx/taste-skill/blob/main/README.md); [Impeccable documentation](https://impeccable.style/docs/). Taste's descriptions and repository layout have changed during 2026; use the documented current install name, not historical paths/aliases.

### Recommended UX add-ons

| Skill / tool | Source | When to enable |
|---|---|---|
| `frontend-design` | [anthropics/skills](https://github.com/anthropics/skills) | Optional exploratory design alternative; avoid concurrent contradictory creative directions from multiple skills |
| `webapp-testing` | [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/webapp-testing) | Browser-based verification of UI flow, keyboard, error and responsive states |
| `playwright-cli` skills | [Microsoft Playwright](https://github.com/microsoft/playwright.dev/blob/main/agent-cli/skills.mdx) | Preferred when standardizing on Microsoft's Playwright CLI for screenshot, tracing and deterministic UI tests; may replace rather than duplicate webapp-testing |
| `agent-browser` | [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser) | Agent-driven screenshot inspection and workflows; use cautiously with local/private saves |
| `find-skills` | [vercel-labs/skills](https://github.com/vercel-labs/skills) | Discover future specialist skills, inspect maintenance/licensing before adding |
| `skill-creator` | [anthropics/skills](https://github.com/anthropics/skills) | Improve our three original ManagerHub SKILL.md modules and evaluate triggering |

### Conditional technical and product capabilities

| Category | Preferred approach and reason | Condition |
|---|---|---|
| FM binary decoding / version adapters | **ManagerHub original skill** `managerhub-save-safety`; Rust testing, fuzzing and format fixtures prescribed in docs | Always in Save Reader branch; generic third-party "reverse engineering" skills cannot attest FM build compatibility |
| Football tactical/role model | **ManagerHub original skill** `managerhub-football-intelligence` referencing business vocabulary, eCA provenance and confidence | Always for football algorithms/recruitment |
| Chart and source integrity | **ManagerHub original skill** `managerhub-data-ux` with metric definitions, per90 cohorts and chart restrictions | Always for player scouting/dashboard charts |
| AI recommendation / tool-calling | [Vercel AI SDK skill](https://vercel.com/docs/agent-resources/skills) if AI SDK adopted; otherwise implement provider-neutral service contracts | After choosing model stack; prevent LLM write access |
| Next.js conventions | Vercel `next-best-practices` only **if Next.js chosen** | Not needed for Tauri + React/Vite alone |
| Component system | Official shadcn component guidance (see [shadcn](https://ui.shadcn.com/)) if design system chooses it | Avoid premature dependency |
| CI/TDD | `tdd` from [mattpocock/skills](https://github.com/mattpocock/skills) is an optional productivity helper; test quality still specified by S07 | When actual tests and CI exist |
| Desktop security / Rust parsing | Build project-specific agent guidance from versioned [Tauri](https://tauri.app/) and [Rust](https://doc.rust-lang.org/book/) docs, not an arbitrary unreviewed community skill | When framework chosen and parser coding starts |
| Statistical modeling | project data-quality skill + reproducible ML protocol (held-out data, confidence interval, MAE, subgroup checks); review with domain experts | Before advertising eCA as calibrated |
| Deployment, databases, cloud | Adopt provider official skills only when architecture is selected and privacy boundaries are designed | Later, avoid forced Vercel deployment for local-first app |

**Do not install:** duplicate design philosophies for every task, React Native skills for desktop web, marketing-only landing skills for scouting dashboards, speculative FM save-editor skills with no edition-specific tests, deploy-to-Vercel unless hosted mode becomes a real requirement.

## Reproducible install — project-local (Windows PowerShell / terminal)

**Prerequisites:** Git, Node 22.20+ (check official Skills CLI version compatibility), internet for downloads, a coding agent supporting SKILL.md. Run commands **inside the ManagerHub repository**, choose project scope and appropriate agents (e.g. Codex, Claude Code, Cursor). Review third-party source before execution.

```bash
# Vercel core
npx skills add vercel-labs/agent-skills --skill web-design-guidelines --skill vercel-react-best-practices --skill vercel-composition-patterns

# Taste Skill — verified install name
npx skills add https://github.com/Leonxlnx/taste-skill --skill design-taste-frontend

# Impeccable — app UI reviews, motion and polish
npx skills add pbakaus/impeccable

# Official GreenSock GSAP animation skills
npx skills add https://github.com/greensock/gsap-skills --skill gsap-core --skill gsap-react --skill gsap-timeline --skill gsap-plugins --skill gsap-performance

# Optional — only if using this workflow
npx skills add anthropics/skills --skill webapp-testing --skill skill-creator
npx skills add vercel-labs/skills --skill find-skills

# Confirm local skill installation and check updates
npx skills list
npx skills check
```

For Codex-specific non-interactive installation, each `npx skills add` supports `-a codex -y`. For Claude Code use `-a claude-code -y`. You can also use `--copy` if Windows or your chosen client has trouble with symlinks.

Impeccable's preferred full-featured installer is `npx impeccable install`; do not run both installers blindly and create duplicate skills. Read [Impeccable install docs](https://impeccable.style/docs/). For Microsoft Playwright CLI specifically, install the `@playwright/cli` package first, then `playwright-cli install --skills=agents` for shared `.agents/skills`; verify the CLI version/documentation before use.

A team setup can use [scripts/install-agent-skills.ps1](../../scripts/install-agent-skills.ps1) which targets Codex by default; inspect the script and skill source first. It is a setup convenience, **not evidence that skills are present in the remote repo**. Installation changes local project files and should be reviewed before committing generated third-party sources (licensing, size, security).

## Mandatory UI workflow / Agent orchestration

1. **Read** `AGENTS.md`, product catalogue, B01–B13 relevant topics and our DESIGN specification.
2. **Impeccable shape**: list task, real data constraints, user journey, empty/error states, layout choices.
3. **Impeccable Operate** and ManagerHub motion/data skills: establish data-first design for the football workstation. Use **Taste v2 app-screen mode** for dashboards; public-page flow stays separate.
4. **Vercel composition + React**: implement lean components, charts with valid numeric units, keyboard alternatives.
5. **Impeccable critique + Vercel web-design-guidelines**: review with file:line/actionable findings, test keyboard/focus and responsive behavior.
6. **Browser QA**: actual screenshots desktop/tablet/mobile, keyboard-only workflow, reduced motion, missing data states; no claim tested unless run.
7. **Impeccable harden + polish**: typography, alignment, overflow, validation, translations, edge cases.
8. **Document**: screenshots, implementation notes, performance numbers where measured, known limitations and acceptance pass/fail.

## Engineering workflows
- **Save Reader:** first read `managerhub-save-safety`, then edition adapter specs, fixtures, limits, error behaviors and fuzz cases; never mutate save in reader tests.
- **Player scoring and scouting:** use `managerhub-football-intelligence` and `managerhub-data-ux`; distinguish Actual CA, eCA, RCA, Role Fit, tactical cohesion and PA; derive only from available input.
- **Chart build:** only show percentile/shot/pass/network charts if cohort/minutes/event data actually exist; show source and sample size.
- **Safe writer:** separate reviewed milestone only with backup, reparse, independent in-game validation and rollback; no opportunistic editor writes.
- **AI assistant:** evidence-grounded explanations and explicit uncertainty; never include hidden fields in Realism Mode, never trigger editor operations autonomously.

## Skills source review checklist
Upstream maintainer and repo verified? SKILL.md read? license? tool/scripts inventory and network/file permissions? dependencies and minimum versions? pinned hash for production? test with non-private fixtures? compatibility with active coding agent? overlaps resolved? install lock/review documented? If not, keep skill optional/uninstalled.

## Planned build/coding stack
Repo currently contains documentation but no React/Tauri product implementation. Skills policies are **ready-to-use instructions**; avoid saying third-party skills were already activated or used to audit UI until they are installed and real UI exists.

## Sources
Official sources listed above; [Skills CLI reference](https://github.com/vercel-labs/skills/blob/main/docs/commands.md), [Playwright CLI skills](https://github.com/microsoft/playwright.dev/blob/main/agent-cli/skills.mdx), [Vercel React/Composition source](https://github.com/vercel-labs/agent-skills), [Anthropic webapp-testing](https://github.com/anthropics/skills/tree/main/skills/webapp-testing), [Impeccable README](https://github.com/pbakaus/impeccable).
