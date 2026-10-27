# ManagerHub — Liquid Glass UI, Motion, Transition & GSAP Design Spec

> **Taste v2 (verified upstream):** supports dashboards and app screens with dedicated `references/app-screens.md` and `library/app.json`. For ManagerHub apply its **app-screen workflow**, not marketing landing layouts. See `.agents/SKILLS-SOURCES.md`.

**Design intent:** Original premium football-management workstation influenced by Apple's **Liquid Glass principles**, not a pixel-for-pixel Apple copy and not native `glassEffect` on web. Apple limits prominent Liquid Glass to functional navigation/controls over a solid/standard-material content layer; use that distinction to protect dense statistics and football pitch clarity. Sources at bottom.

## Product identity
- Football club command center: visual language based on dark graphite, field green, cool neutral glass and restrained team-color highlights. Strong typographic hierarchy, fixed-width tabular digits for money/attributes, sober charts and tactical diagram.
- Desktop-first: multi-pane squad board + depth chart and scouting tables. Tablet collapses navigation and split panels. Mobile keeps readable essential workflows with alternatives to drag.
- Dark and light themes, high-contrast variant, accessibility-safe glass-off preference.
- **Taste Skill v2 app mode:** upstream explicitly supports dashboard/admin/analytics screens in `references/app-screens.md`. Apply that dedicated app-screen workflow alongside Impeccable Operate, Vercel guidelines and ManagerHub data/motion skills; do not substitute its public-website run.

## Material system — five semantic surfaces
| Surface | Usage | Material behavior |
|---|---|---|
| base | body and primary app content | solid/opaque graphite neutral; no backdrop blur |
| content | tables, radar, shot maps, pitches, charts | opaque or near-opaque neutral, high contrast, low shadows |
| glass.navigation | side rail/header/floating dock | semitransparent tint + bounded backdrop-filter blur + thin border; steady text readability |
| glass.overlay | inspector, menu, command palette, tooltip/drawer | elevated adaptive tint, stronger contrast backing, focused content; modal scrim behind |
| glass.control | active segmented controls, small floating buttons | small subtle refraction-like highlight, feedback on interaction |
No full-page blur, repeating glossy metric tiles or several large frosted panes overlapping each other. Translucency is **decoration of the control layer**, never the information-bearing chart layer. Content stays legible over complex backgrounds.

## Responsive glass behavior
- Large desktop: floating pill-like action bar and a **single** glass nav panel; don't stack five blurred layers.
- Dense player tables: solid table rows and sticky headers; glass only for global navigation/search.
- Pitch: solid field with subtle pitch-line/grid; draggable tokens may have tiny highlight and outline while active.
- Mobile: reduce blur and translucency; glass bottom toolbar on simple screens when it saves space; avoid unsupported hover assumptions.
- Fallback for unsupported backdrop-filter / forced colors / user glass-off or high-contrast mode: opaque material with border and shadow. Test actual focus and readability behind moving content.

## Proposed CSS tokens (to validate with contrast and profiling)
```css
:root {
  --surface-base: #0c1016;
  --surface-content: #151b23;
  --glass-tint: rgba(30, 39, 49, 0.76);
  --glass-border: rgba(238, 245, 255, 0.16);
  --glass-highlight: rgba(255, 255, 255, 0.08);
  --accent-field: #56bc8c;
  --accent-analysis: #8bb8ff;
  --motion-fast: 140ms;
  --motion-base: 220ms;
  --motion-layout: 340ms;
  --motion-ease: cubic-bezier(0.16, 1, 0.3, 1);
}
.glass-navigation {
  background: var(--glass-tint);
  border: 1px solid var(--glass-border);
  box-shadow: 0 8px 24px rgba(0,0,0,.16);
}
@supports ((backdrop-filter: blur(12px)) or (-webkit-backdrop-filter: blur(12px))) {
  .glass-navigation {
    -webkit-backdrop-filter: blur(12px) saturate(1.1);
    backdrop-filter: blur(12px) saturate(1.1);
  }
}
@media (prefers-reduced-motion: reduce) {
  .motion-decorative { animation: none !important; transition: none !important; }
}
@media (forced-colors: active) {
  .glass-navigation { background: Canvas; color: CanvasText; border-color: ButtonBorder; -webkit-backdrop-filter: none; backdrop-filter: none; }
}
```
These tokens are prototypes, not WCAG-verified palettes. Use theme-aware opaque fallback and typography tests. Avoid global `backdrop-filter`, SVG turbulence/refraction on every frame or full-window compositing.

## Motion grammar (purposeful; defaults to profile)
| Interaction | Technique | Starting timing target | Behavior |
|---|---|---|---|
| Hover/press/focus | CSS transition (border/opacity/transform) | 100–160ms | semantic feedback, no repeated bobbing |
| Sidebar / inspector open | GSAP timeline or CSS slide, not both | 180–280ms | interruptible/reversible, focus managed |
| Player card → report | GSAP Flip / shared-layout where supported | 280–420ms | continuity between source and destination |
| Position token dragged | pointer-driven transform + optional GSAP Draggable | immediate; settle 180–260ms | snap to slot; keyboard move alternative |
| Switch in/out possession | GSAP Flip for positions | 250–400ms | *same player identity*, logical phase continuity |
| Role change and radar values | chart library interpolation; no global re-animation | 180–320ms | show newly computed info, no data misreading |
| Compare tray expands | GSAP Flip or CSS | 200–340ms | maintain focus and scroll position |
| Save import state | progress/skeleton based on real parser state | truthful loading | no fake progress countdown |
| Toast/confirmation | CSS/GSAP small feedback | 120–220ms | persists long enough to read and keyboard dismiss |
| Onboarding intro | limited GSAP timeline only if needed | <800ms and skippable | never gate core feature access |
| Long scrolling reports | native scroll; optional tiny reveal only | no blanket ScrollTrigger | no marketing parallax in data-heavy workflows |

**One motion owner per element.** GSAP for orchestrated/timeline/Flip and Draggable; CSS for trivial hover/press. Do not concurrently animate the same transform with Motion React and GSAP. Only adopt Motion React later if a documented ADR proves a distinct unmet need; otherwise no extra library.

## GSAP implementation pattern
- Install `gsap` + `@gsap/react` via project lockfile.
- Register only plugins used; use `useGSAP` for scoped animation lifecycle and `contextSafe` for handlers outside hook. Revert/kill timeline & callbacks on unmount, route changes, cancellation, reduced motion and resized breakpoints.
- Flip: capture old coordinates → commit layout state change → tween to new coordinates; maintain logical focus/data state independent of animation and restore after failure.
- ScrollTrigger only where scrolling itself communicates story (help/tutorial): avoid in dense roster screens. No unnecessary smooth-scroll engine.
- No animation imperatively changing React-owned data or leaving stale transforms after a rapid route switch.
- Reduced motion: remove spatial travel/parallax/scrubbing; preserve instant or opacity-only state confirmation, shorten sequences, provide `prefers-reduced-motion` live detection. Avoid motion on chart axis labels that impairs reading.
- Performance: sample on 60Hz and 120Hz where available, large rosters and low-power machine; use transform/opacity over layout properties; isolate blur to small regions, limit will-change lifetime, pause hidden/offscreen effects. Performance budgets set using actual device measurements in Phase 1.

## Animation hooks / reusable primitives
`useMotionPreference`, `useGsapScoped`, `animateSharedElement`, `animateFormationTransition`, `animateDrawer`, `animateFeedback`, `MotionProvider` (only if needed), `GlassSurface`, `GlassNavigation`. Build reusable primitives once, no copy-pasted GSAP timelines in route components. Every primitive offers cancel, cleanup and reduced-motion behavior.

## Visual/UX acceptance
1. Apple-inspired layered UI; original ManagerHub branding, no copied OS assets/icons or Apple trademarks in product identity.
2. Data tables/radar/xG/rich pitch remain readable over surfaces and under keyboard focus; no blurred content blocks.
3. User toggling liquid material off sees fully functional opaque UI with consistent colors/contrast.
4. Position morph preserves mapping/slot assignments even after rapid repeated toggles and route changes.
5. No text clipping at 200% zoom, no hover-only interactions, visible focus, high contrast and colorblind-safe encoding.
6. Browser screenshots desktop/tablet/mobile/dark/light/reduced-motion, measured input responsiveness and animation frame sampling; actual tests attached to phase work. No screenshot-only claims.
7. Non-JS/error/unsupported features show functional readable fallbacks, not blank animated shells.

## Direct references (verified in research, 2026-10-27)
- [Apple HIG — Materials, Liquid Glass usage and content-layer separation](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Apple Liquid Glass technology overview](https://developer.apple.com/documentation/technologyoverviews/liquid-glass)
- [Apple Adopting Liquid Glass](https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass)
- [GSAP official docs & npm installation](https://gsap.com/docs/v3/Installation/)
- [GreenSock React `useGSAP` and cleanup](https://github.com/greensock/react)
- [GSAP Flip](https://gsap.com/docs/v3/Plugins/Flip/)
- [Impeccable animate reference](https://github.com/pbakaus/impeccable/blob/main/skill/reference/animate.md)
- [Impeccable operating application UX](https://github.com/pbakaus/impeccable/blob/main/skill/reference/operate.md)
- [MDN CSS performance and reduced-motion](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Performance/CSS)
- [Motion for React alternative — NOT mandatory in this architecture](https://motion.dev/docs/react)
