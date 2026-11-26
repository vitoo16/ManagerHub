# ManagerHub Multi-Edition RCA Implementation Guide

## 1. Architectural Principles

ManagerHub integrates multi-edition RCA analysis directly into the existing `@managerhub/domain` and `@managerhub/web` workspaces **without creating duplicate packages, parallel stores, or fake certification states**:

1. **Single `.fm` Load → Unified `SaveSession`:** Loading one `.fm` file populates `baseDecodedSave` (immutable) + `editorState` (transactional draft overlay) → `workingDecodedSave`, which feeds Classic Editor, Player Lab, Development Simulator, Recruitment Preview, Squad Planner, and Tactical Lab simultaneously.
2. **Clean-Room Modular Domain Layer (`packages/domain/src/rca-engine.ts`):**
   - `RCA_EVIDENCE_REGISTRY` — Cryptographic SHA-256 & REA Evidence ID ledger.
   - `FMRTE26_RCA_ARCHETYPES` — Exact 10-archetype weights from `Ratings/rca.json` (`v24.4.0.35`) + empirically verified affine scaling coefficients.
   - `FM2013_RCA_EDITION_PROFILE` & `FM2026_RCA_EDITION_PROFILE` — Edition-isolated profiles with explicit position support (`15` vs `14` positions, `SW → DefenderCentral` fallback) and `certifiedForAutoMatch: false`.
   - `evaluateFootAbility(...)` — Pure weaker-foot (`min(leftFoot, rightFoot)`), preferred-foot, and positional `WeakerFoot` cost evaluator.
   - `evaluatePlayerRca(player, options)` — Pure, deterministic, side-effect-free diagnostic engine.
   - `getAttributeRcaWeight(position, attribute, edition)` — Direct CA-cost weight lookup (`0..10`) for side-by-side display next to tactical Role Demand weights (`1..3`).
3. **Strict Domain Separation:**
   - **Native `Actual CA` / `PA` (`1..200`):** Decoded from `game_db.dat`, redacted in **Realism** mode, editable in **Editor** mode.
   - **Certified `Recommended CA` (`recommendedCa: null`):** Reserved strictly for future build-certified native parity; keeps `Auto match CA with RCA` fail-closed (`disabled`).
   - **Research `Advisory RCA` (`advisoryRca: 1..200`):** Shown transparently in **Editor** mode (`AbilityBudgetFields.tsx`) and **Development Simulator** (`PlayerDevelopmentPanel.tsx`) with live recalculation on attribute/foot/position edits and `RCA > PA` warnings.
   - **Tactical `Role Fit` (`0..100`):** Computed by `scoreRole` in `player-analysis.ts` from `FM2013_ROLES` demands; never conflated with CA/RCA.
   - **Development `Priority` (`gap × roleDemandWeight`):**Displayed alongside `RCA weight` (`0..10`) in `PlayerDevelopmentPanel.tsx` so users can spot high-impact, zero-CA-cost training/editing targets (such as `Flair` or `Aggression`).

---

## 2. Module Responsibilities & Data Flow

```mermaid
flowchart TD
  SAVE[".fm Save File\n(Immutable Source)"] --> DEC["decodeFm2013Save\n(@managerhub/domain/fm2013-offline)"]
  DEC --> BASE["baseDecodedSave\n(IndexedDB Cache Safe)"]
  BASE --> OVERLAY["applySaveDraftOverlay\n(Transactional Undo/Redo)"]
  OVERLAY --> WORK["workingDecodedSave"]

  WORK -->|Editor Mode Only| EDITOR["PlayerEditorRecord.tsx\n+ AbilityBudgetFields.tsx"]
  WORK -->|Mode-Projected| DATASET["saveDatabaseToPlayerDataset\n(Realism Redacts CA/PA/Hidden)"]
  DATASET --> PLAB["PlayerDetails.tsx\n(Role Fit 0-100 vs Strength Index)"]
  DATASET --> DEV["PlayerDevelopmentPanel.tsx\n(Role Fit Δ + Advisory RCA Δ + RCA Weight)"]
  DATASET --> SQUAD["Squad Planner & Tactical Lab\n(Role Fit + Position Familiarity)"]

  RCA["rca-engine.ts\n+ ability-budget.ts"] --> EDITOR
  RCA --> DEV
```

---

## 3. Adding or Certifying a Future Edition Profile

To register a new Football Manager edition (e.g., `FM2024` or a certified `FM2013` native formula):

1. **Collect Primary Evidence:** Record exact binary/asset SHA-256 digests and REA Evidence IDs in `RCA_EVIDENCE_REGISTRY` (`packages/domain/src/rca-engine.ts`) and `docs/research/fmrte/RESEARCH-EVIDENCE-INDEX.md`.
2. **Define `RcaEditionProfile`:** Specify `profileId`, `edition`, `supportedBuilds`, `positionsSupported`, `positionArchetypeMap`, and `positionFallbackNotes`.
3. **Keep `certifiedForAutoMatch: false` Until Proven:** Only flip `certifiedForAutoMatch` to `true` after independent holdout verification proves exact integer parity for that exact `edition` + `build`, and add golden regression tests in `packages/domain/src/rca-engine.test.ts`.
4. **Preserve `PA` Immutability:** Even when `certifiedForAutoMatch` is enabled for a profile, `autoMatchDecision.preservesPa` **must remain `true`** — `Auto Match CA` updates draft `actualCa` only and never alters `potentialAbility`.
