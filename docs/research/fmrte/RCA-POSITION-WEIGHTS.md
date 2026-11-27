# RCA Position Weights & Familiarity Rules

## 1. Pitch Slot to RCA Archetype Mapping

Football Manager 2026 defines **14** playable pitch positions (`SW` Sweeper was retired in modern FM), whereas Football Manager 2013 (`13.3.3f359652`) persists **15** positional familiarity bytes in `T27 PLAYING_DATA`.

FMRTE 26 `Ratings/rca.json` (`SettingsVersion: "24.4.0.35"`, SHA-256 `a378c8e0be5e268dc7ed2a2b932ed9d478f135976c0bf45788f77294b63d4ffa`) groups symmetric left/right slots into **10 RCA archetypes**:

| Pitch Slot | FM2013 `T27` Offset | FM2026 AdvancedSearch Property (`FmrteAvalonia.dll`) | `rca.json` Archetype | Mapping Status |
| --- | --- | --- | --- | --- |
| `GK` | `pd[41]` | `get_GKPositionValue` (`0x0a0006f8`) | `Goalkeeper` | `OBSERVED` |
| `SW` | `pd[42]` | *(Removed in FM2026)* | `DefenderCentral` (FM2013 fallback) | `Compatible but unverified` |
| `DL` | `pd[43]` | `get_DLPositionValue` (`0x0a0006f2`) | `FullBack` | `OBSERVED` |
| `DC` | `pd[44]` | `get_DCPositionValue` (`0x0a0006f0`) | `DefenderCentral` | `OBSERVED` |
| `DR` | `pd[45]` | `get_DRPositionValue` (`0x0a0006f6`) | `FullBack` | `OBSERVED` |
| `DM` | `pd[46]` | `get_DMCPositionValue` (`0x0a0006f4`) | `DefensiveMidfielder` | `OBSERVED` |
| `ML` | `pd[47]` | `get_MLPositionValue` (`0x0a0006fc`) | `WideMidfielder` | `OBSERVED` |
| `MC` | `pd[48]` | `get_MCPositionValue` (`0x0a0006fa`) | `MidfielderCentral` | `OBSERVED` |
| `MR` | `pd[49]` | `get_MRPositionValue` (`0x0a0006fe`) | `WideMidfielder` | `OBSERVED` |
| `AML` | `pd[50]` | `get_AMLPositionValue` (`0x0a0006ec`) | `Winger` | `OBSERVED` |
| `AMC` | `pd[51]` | `get_AMCPositionValue` (`0x0a0006ea`) | `AttackingMidfielderCentral` | `OBSERVED` |
| `AMR` | `pd[52]` | `get_AMRPositionValue` (`0x0a0006ee`) | `Winger` | `OBSERVED` |
| `ST` | `pd[53]` | `get_STPositionValue` (`0x0a000700`) | `Striker` | `OBSERVED` |
| `WBL` | `pd[54]` | `get_WBLPositionValue` (`0x0a000702`) | `WingBack` | `OBSERVED` |
| `WBR` | `pd[55]` | `get_WBRPositionValue` (`0x0a000704`) | `WingBack` | `OBSERVED` |

---

## 2. Distinction Between `rca.json` and `positions.json`

FMRTE 26 ships two separate positional files in `<FMRTE26_INSTALL_ROOT>/Ratings/` that serve completely different purposes:

| Property | `Ratings/rca.json` (`RCA` Engine) | `Ratings/positions.json` (Scout Positional % Rating) |
| --- | --- | --- |
| **SHA-256** | `a378c8e0be5e268dc7ed2a2b932ed9d478f135976c0bf45788f77294b63d4ffa` | `c1ee11733e8d76715a3d157f76e1742b8f4b6f2e22a11b9b54ada9891c7de675` |
| **Output Scale** | `1..200` Ability (`Int32` `RCA`) | `0.0%..100.0%` Rating (`Double` `Rate`) |
| **Weight Domain** | Non-negative `0.0..10.0` | Signed `-20.0..100.0` (e.g., GK `Eccentricity = -20.0`, `InjuryProness = -20.0`) |
| **Hidden / Personality** | **All 0.0** (zero CA cost) | **Non-zero** (`Consistency = 60`, `ImportantMatches = 50`, `Professional = 20`, `Ambition = 10`) |
| **`AgePeak` / `AbilityDependent`** | Not present (CA cost is age-invariant) | Present per archetype (e.g., `Goalkeeper AgePeak: 29`, `AbilityDependent: true/false`) |
| **FMRTE 13 Equivalent** | **None** (`FMRTE 13` had no RCA) | `Ratings/FMRTE.xml` (identical weight structure) |

---

## 3. Single-Position vs Multi-Position Evaluation

### 3.1 Single Natural Position (`familiarity = 20`)
When a player has exactly one natural position ($f_p = 20$) and no accomplished secondary positions ($f_q < 15$ for all $q \neq p$), only archetype $A(p)$ is active. Historical universal regression was reported on 5,211 players; the count, fit and independence are not reproduced. See the validation report.

### 3.2 Multiple Natural Positions ($|\{p : f_p = 20\}| \ge 2$)
1. **Symmetric Same-Archetype Pairs (e.g., `DL = 20` and `DR = 20`):** Both map to `FullBack`, producing identical $\text{RCA}_{\text{FullBack}}$.
2. **Cross-Archetype Multi-Position Players (e.g., `DC = 20` and `ST = 20`, or `MC = 20` and `AMC = 20`):**
   - ManagerHub evaluates $\text{RCA}_{A(p)}$ for every natural position $p$ and selects $\max_{p : f_p = 20} \text{RCA}_{A(p)}$ (`INFERRED`).
   - **Historical multi-position residual claim (unreproduced; not a causal surcharge, `basics.fm`, reported n = 4,704):**
     - `1` natural position ($n = 4,469$): mean $(\text{Actual CA} - \text{MaxSinglePosPred}) = +1.19$ CA
     - `2` natural positions ($n = 224$): mean $(\text{Actual CA} - \text{MaxSinglePosPred}) = +3.76$ CA (reported +2.57 CA residual difference)
     - `3` natural positions ($n = 11$): mean $(\text{Actual CA} - \text{MaxSinglePosPred}) = +4.30$ CA (reported +3.11 CA residual difference)
   - Because FMRTE 26's exact internal multi-position formula inside packed `Fmrte.Framework.dll` (`uAutp`) is `UNKNOWN`, ManagerHub records `candidateScores` for all candidate positions and emits `multiPositionPenaltyNote` without fabricating an unverified multi-position multiplier.

### 3.3 No Natural `20` Position Fallback
If $\max_p f_p < 20$ (e.g., youth player or edited record with `MC = 18` max), ManagerHub selects all positions tied at $\max_p f_p$ (`positionSelectionBasis: 'highest-familiarity'`). If no position ratings are supplied (e.g., minimal CSV export), it falls back to `'GK'` when `handling >= 12` and exceeds `finishing + 4`, else `'MC'` (`positionSelectionBasis: 'default-mc'`).
