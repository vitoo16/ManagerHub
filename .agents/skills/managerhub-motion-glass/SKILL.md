---
name: managerhub-motion-glass
description: Use when designing, implementing, auditing or refactoring ManagerHub's Apple-inspired Liquid Glass navigation, premium football workspace visuals, GSAP/React animations, tactical board player transitions, panels, modals, hover states, page transitions or motion accessibility. Enforces control-layer glass, single animation ownership, source-backed analytics and reduced-motion fallbacks.
---

# ManagerHub Liquid Glass & Motion Engineering

Read before coding:
- docs/implementation/00-execution-charter.md
- docs/implementation/03-liquid-glass-motion-spec.md
- docs/implementation/04-motion-skills-and-references.md
- docs/product/02-design-system.md
- AGENTS.md

Use with official external skills **only if installed**:
- Impeccable: shape, animate, critique, audit, harden, polish; Operate guidance for workstations.
- Vercel: web-design-guidelines, vercel-react-best-practices, vercel-composition-patterns.
- GreenSock: gsap-core, gsap-react, gsap-timeline, gsap-plugins, gsap-performance, optionally gsap-scrolltrigger for tutorials.
- Taste (`design-taste-frontend`) v2 supports dashboard and analytics screens; read its `references/app-screens.md` and use the app-screen workflow for ManagerHub.
- Project managerhub-data-ux for charts and source labels.

## 9-step implementation method
1. **Choose meaning:** name the user action and the state change; no motion without spatial continuity or feedback value.
2. **Choose surface:** GLASS for nav, transient overlay and small active controls; OPAQUE content for tables, statistics, pitch and important forms. Apple's native Liquid Glass is not web CSS `backdrop-filter`, so claim Apple-inspired design only.
3. **Use shared design tokens:** dark/light/contrast theme, semantic material classes, typography, elevation, glass-off and reduced motion, not inline per-page blur values.
4. **Use the smallest motion tool:** CSS for hover/focus; GSAP for orchestrated timelines, phase morph (Flip) and drag settling; no competing libraries animating the same node.
5. **Implement lifecycle-safe GSAP:** React `useGSAP()`, scoped refs, contextSafe delayed callbacks, revert/cleanup on unmount, route switch and repeated rapid actions. Register only needed plugins.
6. **Preserve interaction truth:** DOM state/control state is source of truth; animation is visual feedback, NEVER the owner of football player position or save mutation.
7. **Reduce motion:** prefer same action with instant or opacity-only feedback and accessible focus. Honor system setting and explicit app preference.
8. **Bound expensive effects:** avoid fullscreen backdrop blur, many stacked translucent panels, always-on refraction/shader loops, layout-affecting animation, retained will-change, or ScrollTrigger in data-heavy user workflows. Profile on normal/low-end device if available.
9. **Verify:** keyboard-only pitch and panels, focus return, pointer/touch, high contrast, 200% zoom, responsive, reduced motion, route cancellation and screen reader chart alternatives, plus actual browser screenshots/metrics.

## Product-specific choreography
- Save import: honest real state progress, no fabricated percentage.
- Player card → detail: optional shared-element/Flip with fallback; source badges remain readable.
- In/out possession tactical swap: same stable PlayerKey, animated position changes, never altered player assignment.
- Reassign RW to RB: update optimizer and roster first, then animate; interrupted drag must not leave ghost player slots.
- Scouting tabs and charts: prioritize numerical comparability; transitions shouldn't delay decision or visually imply phantom values.
- Sidebar/command palette: restrained translucent functional layer; overlays handle focus and Escape.

## Definition of done
Built via shared GlassSurface and Motion primitives, no duplicate GSAP timeline in every route, accessible and interruptible, reduced motion, real tests/screenshots, no source/metric fabrication, animation audit passes with no known avoidable debt.

Primary references:
- https://developer.apple.com/design/human-interface-guidelines/materials
- https://developer.apple.com/documentation/technologyoverviews/liquid-glass
- https://github.com/greensock/gsap-skills
- https://github.com/greensock/react
- https://gsap.com/docs/v3/Plugins/Flip/
- https://github.com/pbakaus/impeccable/blob/main/skill/reference/animate.md
