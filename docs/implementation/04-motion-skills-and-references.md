# E02 — Researched UI, Animation, GSAP & Agent Skills for ManagerHub

**Research verified:** 2026-10-27. **Status:** skill-selection instructions and references; 3 original ManagerHub skills exist in repo, external skills are NOT considered locally installed until the user executes/inspects the installer.

## Required / enabled external skills

| Priority | Skill name | Trusted upstream | Why / trigger | Scope caveat |
|---|---|---|---|---|
| MUST | `web-design-guidelines` | [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills/blob/main/skills/web-design-guidelines/SKILL.md) | Audit responsive, focus, form, keyboard, accessibility, motion and performance; fetch freshest linked guideline when used | UI **review** skill, not standalone art director |
| MUST | `vercel-react-best-practices` | [Vercel](https://github.com/vercel-labs/agent-skills) | Data-table virtualization, render optimization, async boundaries and bundles | React stack only |
| MUST | `vercel-composition-patterns` | [Vercel](https://github.com/vercel-labs/agent-skills) | Shared shell, headless stateful component contracts, preventing prop/state duplication | React stack only |
| MUST | `impeccable` | [Official pbakaus](https://github.com/pbakaus/impeccable) | `shape` → `critique` → `audit` → `animate` → `harden` → `polish`; strongest fit for apps/dashboards | Follow [Operate](https://github.com/pbakaus/impeccable/blob/main/skill/reference/operate.md) and [Animate](https://github.com/pbakaus/impeccable/blob/main/skill/reference/animate.md) |
| MUST (app UI) | `design-taste-frontend` | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | v2 dedicated app-screen rules for dashboard/admin/analytics in `references/app-screens.md` | Use `draw.mjs --app` and app inspector when feasible; avoid fake vanity KPI cards and landing-page defaults |
| MUST | `gsap-core` | [GreenSock official gsap-skills](https://github.com/greensock/gsap-skills) | Reliable tween/timing primitive in package/motion | GSAP is the primary advanced animation lib |
| MUST | `gsap-react` | [GreenSock official](https://github.com/greensock/gsap-skills/blob/main/skills/gsap-react/SKILL.md) | Scoped `useGSAP`, cleanup and contextSafe handlers | Required for React + GSAP |
| MUST | `gsap-timeline` | [GreenSock official](https://github.com/greensock/gsap-skills) | Coordinated sidebar/overlay/route transitions, interruption and reversal | No pointless page-load choreography |
| MUST | `gsap-plugins` | [GreenSock official](https://github.com/greensock/gsap-skills) | Flip shared-element morph; Draggable for pitch with keyboard alternative | Add plugins only when use case exists |
| MUST | `gsap-performance` | [GreenSock official](https://github.com/greensock/gsap-skills) | Animation jank audit, transform/opacity, cleanup | Budget against actual devices |
| OPTIONAL | `gsap-scrolltrigger` | [GreenSock official](https://github.com/greensock/gsap-skills) | Tutorial/report narrative scroll only | Not for daily roster/table UI |
| OPTIONAL | `vercel-react-view-transitions` | [Vercel](https://github.com/vercel-labs/agent-skills) | Alternative for simple React route/shared-element transition | Choose one transition owner per target; default GSAP Flip |
| OPTIONAL | `animation-systems` | [MengTo/Skills](https://github.com/MengTo/Skills/blob/main/agent-skills/web-design/animation-systems/SKILL.md) | Design motion tokens, timing/easing philosophy | Community-authored, code review required; do not add as blanket runtime dependency |
| OPTIONAL | `gsap` | [MengTo/Skills](https://github.com/MengTo/Skills/tree/main/agent-skills/web-design/gsap) | Additional examples | Draft/community and overlaps official GSAP. **Prefer official GreenSock** |
| OPTIONAL | `webapp-testing` | [Anthropic](https://github.com/anthropics/skills/tree/main/skills/webapp-testing) | QA, screenshot, interaction tests | Needs browser infrastructure |
| OPTIONAL | Motion AI skill | [Motion official](https://motion.dev/docs/react) | Useful for evaluation if changing animation stack | **Not mandatory**. GSAP already chosen; Motion+GSAP ownership overlap adds code debt |

## Three original ManagerHub skills already committed
- [managerhub-football-intelligence](../../.agents/skills/managerhub-football-intelligence/SKILL.md): eCA/CA/Role Fit/football rules.
- [managerhub-save-safety](../../.agents/skills/managerhub-save-safety/SKILL.md): safe parser/reader/writer boundaries.
- [managerhub-data-ux](../../.agents/skills/managerhub-data-ux/SKILL.md): honest football charts, provenance and accessible UX.
- [managerhub-motion-glass](../../.agents/skills/managerhub-motion-glass/SKILL.md): Apple-inspired materials and GSAP ownership (project-specific, original).

## Installation and verification (Windows, Codex)
Run in ManagerHub repo *after review*:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-agent-skills.ps1 -Agent codex
```
Or install separately via official Skills CLI:
```bash
npx skills add vercel-labs/agent-skills --skill web-design-guidelines --skill vercel-react-best-practices --skill vercel-composition-patterns
npx skills add https://github.com/Leonxlnx/taste-skill --skill design-taste-frontend
npx skills add pbakaus/impeccable
npx skills add https://github.com/greensock/gsap-skills --skill gsap-core --skill gsap-react --skill gsap-timeline --skill gsap-plugins --skill gsap-performance
npx skills list
npx skills check
```
Project-local vs global installation depends on CLI flags/agent; wrapper script uses project scope. Do not claim these were installed on any user machine or that Apple native Liquid Glass runs in Chrome merely because skills were selected. Inspect upstream content, scripts, licenses, package requirements and version pinning before running. Do not automatically commit installed third-party source without licensing review.

## Runtime references (direct primary docs)
1. [Apple HIG Materials](https://developer.apple.com/design/human-interface-guidelines/materials) — glass for functional navigation/controls, not entire content; use sparingly.
2. [Apple Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/liquid-glass) — native platform material; web CSS is an approximation.
3. [GSAP official installation](https://gsap.com/docs/v3/Installation/) — GSAP 3.13+ distributed via npm.
4. [GSAP with React](https://github.com/greensock/react) — useGSAP and cleanup.
5. [GSAP Flip](https://gsap.com/docs/v3/Plugins/Flip/) — spatial continuity after layout changes.
6. [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) — selectively for learning/tutorial scroll, not mandatory app navigation.
7. [Impeccable animate](https://github.com/pbakaus/impeccable/blob/main/skill/reference/animate.md) — don't animate without meaning, benchmark perf and reduced motion.
8. [MDN CSS performance](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Performance/CSS) — reduce expensive CSS and excessive animation.
9. [Motion React](https://motion.dev/docs/react) and [useReducedMotion](https://motion.dev/docs/react-use-reduced-motion) — alternative evidence; not extra dependency by default.

## Task-to-skill dispatch
- **Visual shell / Glass UI:** `impeccable` shape/animate/critique + `web-design-guidelines` + `managerhub-motion-glass`; `design-taste-frontend` dedicated app-screen workflow for dashboard, and separate marketing-page workflow for public pages.
- **React and shared components:** Vercel best-practices+composition + project Data UX; charts require event/source policy.
- **Complex motion:** `gsap-core`, `gsap-react`, `gsap-timeline`, `gsap-plugins`, `gsap-performance` + Impeccable animate.
- **TACTIC field switching:** `managerhub-football-intelligence`, `managerhub-motion-glass`, GSAP Flip, React, a11y; keep source player identity constant.
- **Player eCA/charts:** domain and data UX skills + Vercel render perf, no fake data.
- **Save parsing:** save safety (GSAP/Taste irrelevant).
- **QA:** Vercel web-design-guidelines, Impeccable critique/harden/polish and actual Playwright tests.
- **Content-heavy marketing docs (later):** Taste's website/landing skill, optional ScrollTrigger and GSAP timeline.

## Avoid skill conflicts
Do not have Impeccable recommend opaque readable content surfaces while another skill coats every chart in glass. Do not run Motion React and GSAP on same transform. Do not install every MengTo animation/landing skill. Do not abuse ScrollTrigger or smooth-scroll frameworks in a high-frequency operator UI. Review command output, not vague agent claims.

See [Implementation Charter](00-execution-charter.md) and [Liquid Glass spec](03-liquid-glass-motion-spec.md).
