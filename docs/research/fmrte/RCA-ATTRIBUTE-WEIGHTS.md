# RCA Attribute Weights

## 1. Provenance

- **Source Artifact:** `<FMRTE26_INSTALL_ROOT>/Ratings/rca.json`
- **SettingsVersion:** `"24.4.0.35"` (shipped with FMRTE `26.3.2-build41`)
- **SHA-256:** `a378c8e0be5e268dc7ed2a2b932ed9d478f135976c0bf45788f77294b63d4ffa`
- **Epistemic Status:** `OBSERVED` (100% of weights read directly from plaintext JSON)

---

## 2. Zero-CA-Cost Attributes (`Weight = 0.0` Across All 10 Archetypes)

A foundational property of Football Manager's ability budget — confirmed directly in `rca.json` — is that **22 attributes/traits carry zero RCA weight in every position**:

| Category | Zero-Weight Attributes in `rca.json` (`Weight = 0.0` for all 10 archetypes) | ManagerHub Key Mapping |
| --- | --- | --- |
| **Mental (3)** | `Aggression`, `Determination`, `Flair` | `aggression`, `determination`, `flair` |
| **Physical (1 + 2 raw feet)** | `NaturalFitness` (plus raw `LeftFoot`, `RightFoot`, which are priced via `WeakerFoot` instead) | `naturalFitness` (`leftFoot`, `rightFoot` via `weakerFoot`) |
| **Goalkeeping (3)** | `Eccentricity`, `RushingOut`, `TendencyToPunch` (zero even for `Goalkeeper`!) | `eccentricity`, `rushingOut`, `tendencyToPunch` / `punching` |
| **Hidden Playing (5)** | `Consistency`, `Dirtiness`, `ImportantMatches`, `InjuryProness`, `Versatility` | `consistency`, `dirtiness`, `importantMatches`, `injuryProneness`, `versatility` |
| **Personality (8)** | `Adaptability`, `Ambition`, `Controversy`, `Loyalty`, `Pressure`, `Professional`, `Sportsmanship`, `Temperament` | `adaptability`, `ambition`, `controversy`, `loyalty`, `pressure`, `professionalism`, `sportsmanship`, `temperament` |

> [!TIP]
> **Why Role Fit ≠ RCA Cost:** `Flair` and `Determination` have **zero** RCA cost (`0.0`), yet `Flair` has maximum tactical demand (`3`) for a `Trequartista` and `Aggression`/`Bravery` shape `Ball-Winning Midfielder` / `Stopper` duties. Improving or filtering for zero-cost attributes raises role effectiveness without consuming CA budget.

---

## 3. Complete Positive Weight Matrix (`0.0..10.0`)

 Archetype column abbreviations:
- **GK:** `Goalkeeper`
- **DC:** `DefenderCentral`
- **FB:** `FullBack`
- **WB:** `WingBack`
- **DM:** `DefensiveMidfielder`
- **MC:** `MidfielderCentral`
- **WM:** `WideMidfielder`
- **AMC:** `AttackingMidfielderCentral`
- **WG:** `Winger`
- **ST:** `Striker`

### 3.1 Technical Attributes (14)

| `rca.json` Key | FM2013 / ManagerHub Key | GK | DC | FB | WB | DM | MC | WM | AMC | WG | ST |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `Corners` | `corners` | 0 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| `Crossing` | `crossing` | 0 | 1 | 2 | 3 | 1 | 1 | 5 | 1 | 5 | 2 |
| `Dribbling` | `dribbling` | 0 | 1 | 1 | 2 | 2 | 2 | 3 | 3 | 5 | 5 |
| `Finishing` | `finishing` | 0 | 1 | 1 | 1 | 2 | 2 | 2 | 3 | 2 | **8** |
| `FirstTouch` | `firstTouch` | 1 | 2 | 3 | 3 | 4 | **6** | 4 | 5 | 5 | **6** |
| `Freekicks` | `freeKickTaking` | 0 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| `Heading` | `heading` | 1 | 5 | 2 | 1 | 1 | 1 | 1 | 1 | 1 | **6** |
| `LongShots` | `longShots` | 0 | 1 | 1 | 1 | 3 | 3 | 2 | 3 | 2 | 2 |
| `Longthrows` | `longThrows` | 0 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| `Marking` | `marking` | 0 | **8** | 3 | 2 | 3 | 3 | 1 | 1 | 1 | 1 |
| `Passing` | `passing` | 3 | 2 | 2 | 3 | 4 | **6** | 3 | 4 | 2 | 2 |
| `PenaltyTaking` | `penaltyTaking` | 0 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| `Tackling` | `tackling` | 0 | 5 | 4 | 3 | **7** | 3 | 2 | 2 | 2 | 1 |
| `Technique` | `technique` | 1 | 1 | 2 | 3 | 3 | 4 | 4 | 5 | 4 | 4 |

### 3.2 Mental Attributes (14 — 11 Positive, 3 Zero-Cost)

| `rca.json` Key | FM2013 / ManagerHub Key | GK | DC | FB | WB | DM | MC | WM | AMC | WG | ST |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `Aggression` | `aggression` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `Anticipation` | `anticipation` | 3 | 5 | 3 | 3 | 5 | 3 | 3 | 3 | 3 | 5 |
| `Bravery` | `bravery` | **6** | 2 | 2 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| `Composure` | `composure` | 2 | 2 | 2 | 2 | 2 | 3 | 3 | 3 | 3 | **6** |
| `Concentration` | `concentration` | **6** | 4 | 4 | 3 | 3 | 2 | 2 | 2 | 2 | 2 |
| `Decisions` | `decisions` | **10** | **10** | **7** | 5 | **8** | **7** | 5 | **6** | 5 | 5 |
| `Determination` | `determination` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `Flair` | `flair` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `Leadership` | `leadership` (*FM13: Influence*) | 2 | 2 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| `OffTheBall` | `offTheBall` | 0 | 1 | 1 | 2 | 1 | 3 | 2 | 3 | 2 | **6** |
| `Positioning` | `positioning` | 5 | **8** | 4 | 3 | 5 | 3 | 1 | 2 | 1 | 2 |
| `Teamwork` | `teamwork` | 2 | 1 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 1 |
| `Vision` | `vision` (*FM13: Creativity*) | 1 | 1 | 2 | 2 | 4 | **6** | 3 | **6** | 3 | 2 |
| `Workrate` | `workRate` | 1 | 2 | 2 | 2 | 4 | 3 | 3 | 3 | 3 | 2 |

### 3.3 Physical Attributes (8 Visible + `WeakerFoot`)

| `rca.json` Key | FM2013 / ManagerHub Key | GK | DC | FB | WB | DM | MC | WM | AMC | WG | ST |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `Acceleration` | `acceleration` | 6 | 6 | **7** | **8** | 6 | 6 | **8** | **9** | **10** | **10** |
| `Agility` | `agility` | **8** | 6 | 6 | 5 | 6 | 6 | 6 | 6 | 6 | 6 |
| `Balance` | `balance` | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| `Jumping` | `jumpingReach` (*FM13: Jumping*) | 1 | **6** | 2 | 1 | 1 | 1 | 1 | 1 | 1 | 5 |
| `NaturalFitness` | `naturalFitness` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `Pace` | `pace` | 3 | 5 | 5 | 6 | 4 | 5 | 6 | **7** | **10** | **7** |
| `Stamina` | `stamina` | 1 | 3 | 6 | **7** | 4 | 6 | 5 | 6 | **7** | 6 |
| `Strength` | `strength` | 4 | **6** | 4 | 4 | 5 | 4 | 3 | 3 | 3 | **6** |
| `WeakerFoot` | `min(leftFoot, rightFoot)` | **3.0** | **4.5** | **4.0** | **4.0** | **5.0** | **6.0** | **5.0** | **7.0** | **5.5** | **7.5** |

### 3.4 Goalkeeping Attributes (11 — Non-Zero Only for `Goalkeeper`)

| `rca.json` Key | FM2013 / ManagerHub Key | GK | All 9 Outfield Archetypes |
| --- | --- | ---: | ---: |
| `AerialAbility` | `aerialReach` (*FM13: Aerial Ability*) | **6** | 0 |
| `CommandOfArea` | `commandOfArea` | **6** | 0 |
| `Communication` | `communication` | **5** | 0 |
| `Eccentricity` | `eccentricity` | 0 | 0 |
| `Handling` | `handling` | **8** | 0 |
| `Kicking` | `kicking` | **5** | 0 |
| `OneOnOnes` | `oneOnOnes` | **4** | 0 |
| `Reflexes` | `reflexes` | **8** | 0 |
| `RushingOut` | `rushingOut` | 0 | 0 |
| `TendencyToPunch` | `tendencyToPunch` / `punching` | 0 | 0 |
| `Throwing` | `throwing` | **3** | 0 |

### 3.5 Category Subtotals by Archetype

| Archetype | Technical | Mental | Physical | Goalkeeping | `WeakerFoot` | Total Weight $W_A$ |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `Goalkeeper` | 6.0 | 38.0 | 25.0 | 45.0 | 3.0 | **117.0** |
| `DefenderCentral` | 31.0 | 38.0 | 34.0 | 0.0 | 4.5 | **107.5** |
| `FullBack` | 24.0 | 31.0 | 32.0 | 0.0 | 4.0 | **91.0** |
| `WingBack` | 26.0 | 26.0 | 33.0 | 0.0 | 4.0 | **89.0** |
| `DefensiveMidfielder` | 34.0 | 36.0 | 28.0 | 0.0 | 5.0 | **103.0** |
| `MidfielderCentral` | 35.0 | 34.0 | 30.0 | 0.0 | 6.0 | **105.0** |
| `WideMidfielder` | 31.0 | 26.0 | 31.0 | 0.0 | 5.0 | **93.0** |
| `AttackingMidfielderCentral` | 32.0 | 32.0 | 34.0 | 0.0 | 7.0 | **105.0** |
| `Winger` | 33.0 | 26.0 | 39.0 | 0.0 | 5.5 | **103.5** |
| `Striker` | 46.0 | 31.0 | 39.0 | 0.0 | 7.5 | **123.5** |
