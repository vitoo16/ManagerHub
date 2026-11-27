# RCA Foot Ability Rules

## 1. Native Storage vs Editor Scale

| Edition / Tool | Left & Right Foot Storage | UI / Engine Scale | Evidence |
| --- | --- | --- | --- |
| **FM2013 (`13.3.3f359652`)** | `T27 PLAYING_DATA` byte `39` (`LeftFoot`) and byte `40` (`RightFoot`), raw `1..100` | `1..20` via `clamp(1, 20, floor((raw + 2) / 5))` | Historical reported match; independent row-level verification pending |
| **FMRTE 26 (`26.3.2.42`)** | `PhysicalAttributesViewModel::get_LeftFoot` (`0x0a0008f8`) & `get_RightFoot` (`0x0a0008fc`), generic `HighlightableAttribute<sbyte>` | `1..20` (`sbyte` display value) | `OBSERVED` (`ev_bdf1ea070b38a8c685160958522acf7fce6383af642029c8d8373c25e122580e`) |
| **FM26 Pre-Game Editor** | `pers,PDlf` (`left foot`) and `pers,PDrf` (`right foot`) in `shared/data/editor.fmf` | `1..20` | `OBSERVED` (`editor.fmf` byte offset `39,582`) |

---

## 2. How `rca.json` Prices Foot Ability (`OBSERVED`)

Inside `<FMRTE26_INSTALL_ROOT>/Ratings/rca.json` (SHA-256 `a378c8e0be5e268dc7ed2a2b932ed9d478f135976c0bf45788f77294b63d4ffa`), every single archetype sets:

```json
"PhysicalAttributes": {
  "LeftFoot": { "Weight": 0.0 },
  "RightFoot": { "Weight": 0.0 }
}
```

For the historical FM2013 advisory coefficients and complete observed weights only, the following are unrounded affine sensitivities (not certified native cost; neither clamping nor rounding included). Instead, each archetype declares a dedicated top-level **`WeakerFoot`** weight:

| Archetype | `WeakerFoot.Weight` | Total Archetype Weight $W_A$ | Share of Total Weight | Marginal Advisory CA per $+1$ Weaker Foot (`1..20`) | Max Gain (`wf = 1 → 20`) |
| --- | ---: | ---: | ---: | ---: | ---: |
| `Goalkeeper` | **3.0** | `117.0` | `2.56%` | `+0.502` CA | **`+9.5` CA** |
| `FullBack` | **4.0** | `91.0` | `4.40%` | `+0.817` CA | **`+15.5` CA** |
| `WingBack` | **4.0** | `89.0` | `4.49%` | `+0.839` CA | **`+15.9` CA** |
| `DefenderCentral` | **4.5** | `107.5` | `4.19%` | `+0.801` CA | **`+15.2` CA** |
| `DefensiveMidfielder` | **5.0** | `103.0` | `4.85%` | `+0.907` CA | **`+17.2` CA** |
| `WideMidfielder` | **5.0** | `93.0` | `5.38%` | `+1.004` CA | **`+19.1` CA** |
| `Winger` | **5.5** | `103.5` | `5.31%` | `+0.951` CA | **`+18.1` CA** |
| `MidfielderCentral` | **6.0** | `105.0` | `5.71%` | `+1.028` CA | **`+19.5` CA** |
| `AttackingMidfielderCentral` | **7.0** | `105.0` | `6.67%` | `+1.285` CA | **`+24.4` CA** |
| `Striker` | **7.5** | `123.5` | `6.07%` | `+1.075` CA | **`+20.4` CA** |

---

## 3. Domain Rules & Invariants

1. **Strong Foot Invariance (reference-weight and synthetic arithmetic evidence):**
   - Because `LeftFoot.Weight == 0.0` and `RightFoot.Weight == 0.0`, no assumption about either missing rating is made. Changing `RightFoot` from `18 → 20` when `LeftFoot = 5` leaves $r_{\text{wf}} = \min(5, 20) = 5$ unchanged and costs **`0` RCA**.
2. **Weaker Foot Definition:**
   - $r_{\text{wf}} = \min(\text{LeftFoot}, \text{RightFoot}) \in \{1,\dots,20\}$.
   - Preferred foot classification in `evaluateFootAbility` (`packages/domain/src/rca-diagnostics.ts`):
     - `isTwoFooted = (leftFoot >= 15 && rightFoot >= 15)`
     - `preferredFoot = 'both'` when `leftFoot === rightFoot` or `(isTwoFooted && |leftFoot - rightFoot| <= 2)`, else `'left'` if `leftFoot > rightFoot`, else `'right'`.
3. **Positional Sensitivity Ordering:**
   - Central attackers (`Striker` `7.5`, `AMC` `7.0`) and central playmakers (`MC` `6.0`) pay the highest CA cost for two-footedness because shooting/passing angles open on both sides of central zones, whereas `Goalkeeper` (`3.0`) and touchline defenders (`FullBack`/`WingBack` `4.0`) pay the lowest cost.
4. **Missing Foot Data Handling (CSV/HTML Exports):**
   - Standard FM squad exports often omit numerical `1..20` `LeftFoot` and `RightFoot` columns. When either foot rating is absent, `evaluatePlayerRca` sets `foot.weakerFootRating = null` and normalizes the weighted mean strictly over the observed attribute weights ($\sum_{k \in \mathcal{O}} w_{A,k}$) rather than fabricating a weaker-foot value.
