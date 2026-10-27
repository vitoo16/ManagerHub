---
name: managerhub-data-ux
description: Use when designing or coding ManagerHub football dashboards, player scouting reports, radar charts, role comparison, tactical pitch maps, transfer analyses, tables or visualization interactions. Ensures chart provenance, accessibility and data-first design.
---

# ManagerHub Data Visualization UX

## Read first
Read docs/product/02-design-system.md and docs/product/04-player-intelligence-ux.md, docs/business/12-football-analytics-glossary.md and docs/engineering/agent-skills-research.md.

## Pair with external UI skills (if installed)
Use Impeccable shape -> Taste Skill appropriate for dense app -> Vercel React/composition implementation -> Vercel web-design-guidelines audit -> Impeccable critique/harden/polish -> browser verification.

## Workflow
1. State user decision and data source, confidence, units, cohort and minimum sample.
2. Choose exact encoding:
   - absolute attribute radar/bars: native edition attribute values;
   - percentile radar: defined comparison cohort and enough observed match minutes;
   - position heatmap: verified familiarity or explicitly modeled suitability;
   - time series: consistent snapshots/identities;
   - shot map/pass network/touch map: real XY event data only;
   - financial scatter: real price/wage fields or clearly labeled ranges;
   - tactic pitch: scenario positions and role phases, not observed movement.
3. Label Actual CA / eCA / Role Fit / Tactical Fit distinctly, including exports and screen readers.
4. Specify legends, axes, tooltips, chart-equivalent table, zoom, download, keyboard navigation and colorblind-safe category encoding.
5. Handle loading, no data, partial parse, restricted Realism Mode, unsupported edition and model-insufficient states.
6. Verify with screenshot and accessibility checks against Vercel guidelines; never mark tested if not actually run.

## Design contract
Professional football workbench: dense readable information, restrained motion, tabular numbers, clear hierarchy, persistent save/edition context, keyboard-friendly pitch alternatives; no generic glowing-card dashboard or meaningless radar polygons.

## Required output
Page journey, chart input contract, missingness policy, interaction map, empty/error states, a11y criteria, and real browser-test evidence when code exists.
