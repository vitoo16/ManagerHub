# Vendored Agent Skills — Source & License Manifest

**Installed in GitHub repository** under `.agents/skills/`; source files copied verbatim from official/public upstream at 2026-10-27. Does not execute any installation on the user's machine and does not auto-run third-party scripts. Review scripts before executing.

| Local skill folder | Upstream original | Upstream Git tree SHA | License |
|---|---|---|---|
| web-design-guidelines | https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines | 6ec269328bc400712ee225a173a14b6b29128df7 | No standalone root LICENSE was observed; attribution remains to Vercel, review before redistributing beyond project |
| vercel-react-best-practices | https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices | 6ec269328bc400712ee225a173a14b6b29128df7 | MIT in skill frontmatter |
| vercel-composition-patterns | https://github.com/vercel-labs/agent-skills/tree/main/skills/composition-patterns | 6ec269328bc400712ee225a173a14b6b29128df7 | MIT in skill frontmatter |
| design-taste-frontend | https://github.com/Leonxlnx/taste-skill/tree/main/skills/taste-skill | 12af471f627f866411b4bd785b19646d3672784c | MIT; copied LICENSE inside skill |
| impeccable | https://github.com/pbakaus/impeccable/tree/main/.agents/skills/impeccable | d34c87e1a00989ae8dbdd7f6b30b70f23319e860 | Apache-2.0; copied LICENSE inside skill |
| gsap-core, gsap-react, gsap-timeline, gsap-plugins, gsap-performance, gsap-scrolltrigger | https://github.com/greensock/gsap-skills/tree/main/skills | aed9cfd3277740755f6bfc1155c7aa645403b760 | MIT; copied LICENSE in gsap-core (applies to all copied GSAP skill text) |

Four additional `managerhub-*` skills are original project-specific instructions, not copied upstream.

## Important correction from actual current source
The current **Taste v2 SKILL.md explicitly supports app screens, dashboards, analytics and admin views** and has app-specific `references/app-screens.md` and `library/app.json`. Older project docs incorrectly said it did not; treat the vendored source as authoritative and use Taste's **app-screen mode** on ManagerHub (not its marketing-landing mode). Coordinate with Impeccable, Vercel guidelines and our project data UX skill.

## Installation mechanics
A coding agent that supports project-local `SKILL.md` discovery may load these directly when opening ManagerHub. Actual discovery rules differ by Codex, Claude Code, Cursor and others; verify with the agent's installed skill listing rather than promising automatic activation. This repository also keeps `scripts/install-agent-skills.ps1` for opt-in update/install of skill versions. Running that script may overwrite vendored copies and should be preceded by review.

**Runtime dependencies:** GSAP skills provide **instructions**, not the GSAP JavaScript library. Installing GSAP runtime `gsap` and `@gsap/react`, React, Tauri and Playwright belongs to the application development phase. Never claim they run from skill files alone.

## Updating safely
1. Record upstream commit SHA/tag, diffs and review scripts/assets/permissions/licenses.
2. Replace exactly affected local skill folder from upstream; do not splice unversioned fragments.
3. Ensure relative references and scripts included in skill can resolve locally.
4. Verify frontmatter names and invoke skill; test safe example actions with nonprivate fixture.
5. Commit manifest SHA updates and changes as one reviewed dependency update.
