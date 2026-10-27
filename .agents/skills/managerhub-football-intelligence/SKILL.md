---
name: managerhub-football-intelligence
description: Use when specifying or implementing ManagerHub football analytics, estimated CA (eCA), role suitability, tactical fit, squad optimization, scouting recommendations, player development, or football decision engines. Requires version-aware provenance and explainable football logic.
---

# ManagerHub Football Intelligence

## Read first
Read docs/business/README.md; docs/business/02-interview-player-evaluation.md; docs/business/03-interview-tactical-model.md; docs/business/04-interview-squad-construction.md; docs/business/13-player-intelligence-and-scouting.md; docs/system/08-player-intelligence-engine.md; docs/product/01-full-feature-catalog.md.

## Workflow
1. Define the football question (evaluate player vs role, compare XI, transfer decision).
2. Identify precise FM edition, build, role catalog and source coverage.
3. Separate factual game fields from our computed indices and hypothetical scenarios.
4. Specify constraints and objective: tactic, phase, slot, squad gaps, wages and candidate availability.
5. Build smallest explainable baseline; report weighting, input units, missing coverage and sensitivity.
6. For eCA, use held-out same-edition verified CA labels, stratify goalkeeper/outfield/position, provide MAE and prediction intervals before claiming a 1-200 CA estimate. No training labels = attribute index only.
7. For best XI, enforce unique player/slot and eligibility; recompute whole XI when a versatile player moves.
8. For recruitment, compare marginal team gain and economics; verdict Buy/Shortlist/Loan/Promote/Pass/Insufficient Data with reasons and uncertainties.
9. Evaluate counterexamples and produce acceptance tests; annotate all handoffs with source and assumption.

## Never
- Claim eCA equals internal FM CA formula; claim exact PA from current attributes.
- Turn role fit (0–100) into game CA or a success probability.
- Create fake event-based xG/passing data from attributes.
- Use FM24 duty mapping for FM26 without verified catalog.
- Have AI fabricate player statistics or make ungrounded confident buy decisions.

## Required output
Business rule IDs, inputs with provenance, algorithm type/version, eligibility constraints, outputs, explicit uncertainty and counterexample tests.
