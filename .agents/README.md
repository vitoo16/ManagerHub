# ManagerHub — Agent Skills installed in Git

**Installed in this repository on 2026-10-27**, under `.agents/skills/`, with pinned upstream commit IDs recorded in [skills-lock.json](skills-lock.json). This is **actual checked-in SKILL.md content and support files**, not merely an installer script. The project also has four original ManagerHub skills.

## Installed third-party skills

| Skill folder | Upstream | Content included |
|---|---|---|
| web-design-guidelines | Vercel | Official SKILL.md; fresh Web Interface Guidelines are fetched by the skill when used |
| vercel-react-best-practices | Vercel | Official SKILL.md, compiled AGENTS.md rules, directly referenced rule files |
| vercel-composition-patterns | Vercel | Official SKILL.md, compiled AGENTS.md rules, directly referenced rule files |
| design-taste-frontend | Taste v2 | Official SKILL.md, **app-screens.md**, relevant reference files, app design library/assets, draw, inspect and lint scripts |
| impeccable | Impeccable | Official SKILL.md, core reference Markdown files, CLI launcher and basic metadata; **native CLI engine and its full live-browser helpers are not bundled** |
| gsap-core | GreenSock | Official SKILL.md |
| gsap-react | GreenSock | Official SKILL.md |
| gsap-timeline | GreenSock | Official SKILL.md |
| gsap-plugins | GreenSock | Official SKILL.md |
| gsap-performance | GreenSock | Official SKILL.md |
| gsap-scrolltrigger | GreenSock | Official SKILL.md; optional for teaching/tutorial scroll interactions |

Original project skills: `managerhub-football-intelligence`, `managerhub-save-safety`, `managerhub-data-ux`, `managerhub-motion-glass`.

## Where to find them

```text
ManagerHub/
├── .agents/
│   ├── README.md
│   ├── skills-lock.json
│   ├── licenses/
│   │   ├── GSAP-SKILLS-MIT.txt
│   │   ├── TASTE-SKILL-MIT.txt
│   │   └── IMPECCABLE-APACHE-2.0.txt
│   └── skills/
│       ├── web-design-guidelines/
│       ├── vercel-react-best-practices/
│       ├── vercel-composition-patterns/
│       ├── design-taste-frontend/
│       ├── impeccable/
│       ├── gsap-core/
│       ├── gsap-react/
│       ├── gsap-timeline/
│       ├── gsap-plugins/
│       ├── gsap-performance/
│       ├── gsap-scrolltrigger/
│       ├── managerhub-football-intelligence/
│       ├── managerhub-save-safety/
│       ├── managerhub-data-ux/
│       └── managerhub-motion-glass/
└── AGENTS.md
```

## Using the skills

For agents recognizing project-local `.agents/skills/` (including Codex), clone the repo and use the skill via the agent's skill selector or its name. For coding agents that read other locations (`.claude/skills/`, `.cursor/skills/`, `.github/skills/`), configure the agent to scan `.agents/skills/` or create **links** rather than duplicating source; verify your agent's current project-scope skill search paths. Always start with root `AGENTS.md`.

- Dashboard screens: Taste v2 **app-screen mode** in `design-taste-frontend/references/app-screens.md`, Impeccable Operate/Shape/Audit, Vercel guidelines and ManagerHub Data UX.
- Apple-inspired Liquid Glass navigation, GSAP animation: `managerhub-motion-glass`, GreenSock official skill family, Vercel and Impeccable Animate.
- React tables/performance: Vercel React Best Practices and Composition Patterns.
- Save and scoring: our dedicated football/save skills, not unrelated styling skills.

## Important runtime differences

- **Vendored SKILL.md ≠ installed npm runtime.** The app will still need `gsap` and `@gsap/react` added in the actual application phase.
- **Impeccable**: the included official launchers can bootstrap/download the external Impeccable engine on first use; this repository does not ship that engine, extensive live-browser helpers or provider hooks. Review the launchers, network behavior, privacy/telemetry settings and [official docs](https://github.com/pbakaus/impeccable) before enabling these features. The core design skill and its Markdown references are present.
- **Taste**: the selected app-screen workflow is included; site-gallery reference libraries and app-specific resources are now vendored. For site-generation beyond ManagerHub's app screens, review/install the full upstream distribution.
- **Vercel**: compiled guidance is included, but the individual `rules/` collections are now fully vendored (72 React and 10 composition files). SKILL.md-linked rule examples are present. The Web Interface Guidelines skill fetches its latest rulebook when invoked.
- **Security**: external scripts are checked into the repo but **have not been executed** during this GitHub installation. Neither a developer machine nor a coding agent's runtime is magically initialized by a Git commit. Read source before running scripts, especially network/browser automation.
- **Licensing**: see `licenses/` and [upstream provenance](skills-lock.json). Vercel React/Composition SKILL.md declare MIT; Web Guidelines SKILL.md does not carry an explicit license field and should be reviewed before redistributing outside intended installation use.

## Updates

Keep sources pinned. To update: inspect upstream diffs, security behavior and licenses, replace sources from a specific commit, update `skills-lock.json`, run file-integrity/skill-reference checks and commit together. **Do not run the old installer blindly over vendored files**: it may replace pinned copies. For local provider-specific Impeccable hooks or full upstream engines, follow official installation guidance separately.

The correct project plan is [7-phase full delivery](../docs/implementation/01-full-delivery-plan.md); all functionality (not MVP) uses these installed skills as relevant.
