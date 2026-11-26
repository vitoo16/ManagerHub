# RCA Calculation Specification

## 1. Scope & Epistemic Separation

ManagerHub distinguishes strictly between three concepts that are frequently conflated in third-party tools:

1. **Sports Interactive Native `Actual CA` (`1..200`):** Persisted signed 16-bit integer inside `game_db.dat` (`T25 PERSON` offset `+6` in FM2013 `13.3.3f359652`, `CERTIFIED` read/write in offline `.fm` saves).
2. **FMRTE 26 `Recommended CA` (`RCA`):** Weight-driven estimate configured by `<FMRTE26_INSTALL_ROOT>/Ratings/rca.json` (`SettingsVersion: "24.4.0.35"`, weights `OBSERVED`, exact `Fmrte.Framework.dll` internal normalization `UNKNOWN` due to packed `uAutp` resource).
3. **ManagerHub `Advisory RCA` (`1..200`):** Clean-room, pure deterministic calculation implemented in `packages/domain/src/rca-engine.ts` combining the exact `OBSERVED` `rca.json` weights with `INFERRED` / `VERIFIED` affine weighted-mean scaling calibrated on shipped FM2013 tutorial saves (`n = 5,211`, `R² = 0.9800`) and verified out-of-sample (`n = 4,058`, `MAE = 4.87`).

> [!IMPORTANT]
> **Advisory RCA is never treated as certified native `Actual CA`.** Automatic `CA` mutation (`Auto Match CA`) remains fail-closed (`allowed: false`) unless an edition/build profile reaches `CERTIFIED` status. `Potential Ability (PA)` is **never** modified by RCA calculations under any condition.

---

## 2. Input Domain & Normalization

### 2.1 Storage Scale vs Calculation Scale

- **FM2013 `game_db.dat` (`T27 PLAYING_DATA`):** Visible and hidden playing attributes (plus `LeftFoot` byte `39` and `RightFoot` byte `40`) are stored internally on `1..100` and projected to `1..20` via `clamp(1, 20, floor((raw + 2) / 5))` (`VERIFIED` `4,058 / 4,058` exact match).
- **Personality (`T26 PERSON_DATA`):** 8 bytes stored directly on `1..20` (`VERIFIED`).
- **Positional Familiarity (`T27 PLAYING_DATA`):** 15 bytes (`GK`, `SW`, `DL`, `DC`, `DR`, `WBL`, `WBR`, `DM`, `ML`, `MC`, `MR`, `AML`, `AMC`, `AMR`, `ST`) stored directly on `1..20` (`20 = Natural`, `15..19 = Accomplished`, `1 = Unconvincing/None`).
- **RCA Input Scale:** All attribute and weaker-foot inputs to the RCA engine are integer ratings $r_i \in \{1, 2, \dots, 20\}$. Missing or non-integer values outside $[1, 20]$ are rejected (treated as unobserved, never silently defaulted to `10` or `0`).

---

## 3. Mathematical Formulation (Clean-Room Independent Specification)

For a candidate position $p$ mapped to archetype $A(p) \in \{\text{Goalkeeper}, \dots, \text{Striker}\}$:

1. **Active Attribute Set:** Let $\mathcal{K}_{A}$ be the set of visible attributes with positive weight $w_{A,k} > 0$ in `rca.json`, and let $w_{A,\text{wf}} \in [3.0, 7.5]$ be the archetype's `WeakerFoot` weight.
2. **Total Archetype Weight:**
   $$W_A = w_{A,\text{wf}} + \sum_{k \in \mathcal{K}_A} w_{A,k}$$
3. **Weaker Foot Rating:**
   $$r_{\text{wf}} = \begin{cases} \min(r_{\text{left}}, r_{\text{right}}) & \text{if } r_{\text{left}}, r_{\text{right}} \in \{1,\dots,20\} \\ \text{null} & \text{otherwise} \end{cases}$$
4. **Observed Weight Coverage Gate:**
   Let $\mathcal{O} \subseteq \mathcal{K}_A$ be the subset of attributes with observed integer values $r_k \in [1, 20]$, and $\mathbb{I}_{\text{wf}} \in \{0, 1\}$ indicate whether $r_{\text{wf}}$ is observed:
   $$C_A = \frac{\mathbb{I}_{\text{wf}} \cdot w_{A,\text{wf}} + \sum_{k \in \mathcal{O}} w_{A,k}}{W_A}$$
   If $C_A < 0.70$, evaluation fails closed (`status: 'insufficient-attributes'`, `advisoryRca: null`).
5. **Weighted Mean Attribute Rating ($\bar{r}_A \in [1, 20]$):**
   $$\bar{r}_A = \frac{\mathbb{I}_{\text{wf}} \cdot w_{A,\text{wf}} \cdot r_{\text{wf}} + \sum_{k \in \mathcal{O}} w_{A,k} \cdot r_k}{\mathbb{I}_{\text{wf}} \cdot w_{A,\text{wf}} + \sum_{k \in \mathcal{O}} w_{A,k}}$$
6. **Affine Scaling, Rounding & `[1, 200]` Clamping:**
   $$\text{RCA}_A = \operatorname{clamp}\!\Big(1,\; 200,\; \operatorname{round}\big(\alpha_A + \beta_A \cdot \bar{r}_A\big)\Big)$$
   where $(\alpha_A, \beta_A)$ are the archetype's empirically calibrated intercept and slope (Section 4).
7. **Marginal Advisory CA Cost per $+1$ Attribute Point:**
   $$\Delta \text{CA}_{A,k} = \frac{w_{A,k}}{W_A} \cdot \beta_A$$

---

## 4. Archetype Scaling Parameters & Multi-Position Selection

| Archetype $A$ | $\sum w_{A,k}$ | $w_{A,\text{wf}}$ | Total $W_A$ | Intercept $\alpha_A$ | Slope $\beta_A$ | Zero-Point $\bar{r}_0$ |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `Goalkeeper` | `114.0` | `3.0` | `117.0` | `-108.18` | `19.576` | `5.53` |
| `DefenderCentral` | `103.0` | `4.5` | `107.5` | `-106.61` | `19.147` | `5.57` |
| `FullBack` | `87.0` | `4.0` | `91.0` | `-102.71` | `18.587` | `5.53` |
| `WingBack` | `85.0` | `4.0` | `89.0` | `-101.24` | `18.673` | `5.42` |
| `DefensiveMidfielder` | `98.0` | `5.0` | `103.0` | `-103.27` | `18.685` | `5.53` |
| `MidfielderCentral` | `99.0` | `6.0` | `105.0` | `-97.73` | `17.997` | `5.43` |
| `WideMidfielder` | `88.0` | `5.0` | `93.0` | `-101.24` | `18.673` | `5.42` |
| `AttackingMidfielderCentral` | `98.0` | `7.0` | `105.0` | `-110.25` | `19.270` | `5.72` |
| `Winger` | `98.0` | `5.5` | `103.5` | `-90.52` | `17.895` | `5.06` |
| `Striker` | `116.0` | `7.5` | `123.5` | `-90.64` | `17.700` | `5.12` |

### Position Selection & Multi-Position Rules

```text
FUNCTION SelectCandidatePositions(player, targetPositionOverride):
  IF targetPositionOverride IS PRESENT:
    RETURN [targetPositionOverride]                        // basis = 'explicit-override'
  natural := [pos FOR (pos, fam) IN player.positions WHERE fam == 20]
  IF LENGTH(natural) > 0:
    RETURN natural                                         // basis = 'natural-20'
  IF LENGTH(player.positions) > 0:
    maxFam := MAX(fam FOR (_, fam) IN player.positions)
    RETURN [pos FOR (pos, fam) IN player.positions WHERE fam == maxFam] // basis = 'highest-familiarity'
  IF player.attributes.handling >= 12 AND player.attributes.handling > COALESCE(player.attributes.finishing, 1) + 4:
    RETURN ['GK']
  RETURN ['MC']                                            // basis = 'default-mc'
```

- When multiple natural positions (`fam == 20`) exist, each natural position's $\text{RCA}_{A(p)}$ is evaluated independently and the **maximum** $\text{RCA}_{A(p)}$ is selected (`INFERRED`).
- Empirical FM2013 save analysis (`basics.fm`, `n = 4,704`) proves that players with 2 natural positions average **`+2.57` CA points** higher than single-position players with identical attributes (`+3.76` vs `+1.19` residual), and 3 natural positions average **`+3.11` CA points** higher. Because FMRTE 26's exact internal multi-position surcharge inside packed `Fmrte.Framework.dll` is `UNKNOWN`, ManagerHub surfaces an explicit `multiPositionPenaltyNote` diagnostic rather than inventing an unverified surcharge multiplier.

---

## 5. Auto Match CA Rules (`MatchCaWithRCA`)

1. **Observed FMRTE 26 Surface (`OBSERVED`):** `PersonalInformationViewModel.MatchCaWithRCA` (`0x0a000907`/`0x0a000908`) is a per-player `bool` checkbox in `AbilityView` (`"Match CA with RCA"`).
2. **ManagerHub Fail-Closed Policy:**
   - `autoMatchDecision.allowed` is `true` **if and only if** `edition` and `build` are known, match `profile.supportedBuilds`, **and** `profile.certifiedForAutoMatch === true`.
   - Because `FM2013-research-v1` and `FM2026-research-v1` have `certifiedForAutoMatch: false`, `Auto match CA with RCA` stays **disabled** in the UI and cannot create a draft/save transaction.
   - **RCA > PA Invariant:** When $\text{Advisory RCA} > \text{PA}$, `exceedsPotentialAbility` is set to `true` and an explicit warning is shown; **`PA` is never auto-incremented** (`preservesPa: true`).
