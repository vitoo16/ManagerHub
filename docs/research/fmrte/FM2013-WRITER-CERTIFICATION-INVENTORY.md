# FM2013 writer certification inventory

Target executable build `13.3.3f359652`. The experimental writer admits only a verified AFE v4 profile whose save metadata explicitly identifies that build. It also verifies the source fingerprint and incoming HMAC before applying edits. The production app provides Save As preview. Each field below remains **uncertified**.

Sources for field admission and serialization are [the draft transaction engine](../../../packages/domain/src/fm2013-offline/editor-transactions.ts), [the experimental writer](../../../packages/domain/src/fm2013-offline/writer.ts) and [the synthetic roundtrip tests](../../../packages/domain/src/fm2013-offline/writer.test.ts).

## Field inventory

All rows have decoded-read and draft support when the underlying record or applicable optional field exists. The fixed-width writer implements those same listed patches for the target build. This is domain-level coverage and does not imply every field has an individual UI control. All numeric ranges are inclusive. Dates use a signed little-endian 16-bit day of year followed by an unsigned little-endian 16-bit year. Scaled ratings use a byte containing five times the displayed rating.

| Entity | Field keys | Encoding and accepted values | Dependencies | Synthetic write and re-decode |
| --- | --- | --- | --- | --- |
| Player | `actualCa`, `potentialAbility` | signed 16-bit LE, 1–200 | Explicit separate fields. CA-only edits keep PA and stored market value unchanged. | Both asserted; CA increase, decrease and unedited controls also asserted. |
| Player | `homeReputation`, `currentReputation`, `worldReputation` | signed 16-bit LE, 1–10,000 | Existing playing record and field mapping | No per-field positive roundtrip assertion. |
| Player | `morale` | byte, 1–20 | Existing playing record | Asserted. |
| Player | `marketValueGbp` | signed 32-bit LE, 0–1,500,000,000 | Existing playing record. The decoded value and FMRTE XML General/Price have unverified equivalence. | CA-only invariance asserted. |
| Player | `heightCm`, `weightKg` | signed 16-bit LE; height 130–225, weight 45–135 | Existing playing record | No per-field positive roundtrip assertion. |
| Player | `leftFoot`, `rightFoot` | scaled byte, 1–20 | Existing playing record | No per-field positive roundtrip assertion. |
| Player | `intCaps`, `intGoals` | byte, 0–250 | Existing corresponding record mapping | No per-field positive roundtrip assertion. |
| Player | `weeklyWageGbp`, `contractExpiresAt`, `squadNumber` | signed 32-bit LE, 0–10,000,000 GBP; date; byte, 1–99 | Active contract and matching field offsets | All three asserted. |
| Player | `positions.*` | byte, 1–20 | Existing playing record; see the position list below | AMC asserted. |
| Player | `attributes.*` | scaled byte, 1–20 | Existing playing record. `punching` and `tendencyToPunch` share one stored field. Conflicting values are rejected. | Finishing and pace asserted; alias conflict rejected. |
| Player | `hiddenPlaying.*` | scaled byte, 1–20 | Existing playing record | Consistency asserted. |
| Player | `personality.*` | byte, 1–20 | Existing PERSON_DATA record | Professionalism asserted. |
| Staff | `staffCa`, `staffPa` | signed 16-bit LE, 1–200 | Existing non-playing record; separate fields | Both asserted. |
| Staff | `homeReputation`, `currentReputation`, `worldReputation` | signed 16-bit LE, 1–10,000 | Existing staff field mapping | No per-field positive roundtrip assertion. |
| Staff | `weeklyWageGbp`, `contractExpiresAt` | signed 32-bit LE, 0–10,000,000 GBP; date | Applicable active contract field and offset | No per-field positive roundtrip assertion. |
| Staff | `attributes.*` | byte, 1–20; raw or scaled as listed below | Existing NON_PLAYING_DATA record | Tactical knowledge and working with youngsters asserted. |
| Club | `balanceGbp` | signed 32-bit LE, −1,000,000,000–1,500,000,000 | Basic or full finance record and field offset | Asserted. |
| Club | `transferBudgetGbp`, `transferBudgetSeasonGbp`, `weeklyWageBudgetGbp` | signed 32-bit LE; both transfer budgets 0–1,500,000,000, wage budget 0–50,000,000 | Full finance record and respective offsets | Transfer and weekly wage budgets asserted. Seasonal transfer budget has no positive per-field assertion. |
| Club | `trainingFacilities`, `youthFacilities`, `youthCoaching`, `youthRecruitment` | byte, 1–20 | Existing club record | Training and youth facilities asserted. |
| Club | `yearFounded` | unsigned 16-bit LE, 1800–2100 | Existing club record | No positive per-field assertion. |
| Stadium | `capacity`, `seatingCapacity`, `expansionCapacity` | signed 32-bit LE; capacity 100–500,000, seating and expansion 0–500,000 | Existing stadium. A capacity or seating change must keep seating at or below total capacity. | All three asserted. Invalid seating relation rejected. |

Nested fields:

- Player positions: `GK`, `SW`, `DL`, `DC`, `DR`, `DM`, `ML`, `MC`, `MR`, `AML`, `AMC`, `AMR`, `ST`, `WBL`, `WBR`.
- Player visible attributes: `crossing`, `dribbling`, `finishing`, `heading`, `longShots`, `marking`, `offTheBall`, `passing`, `penaltyTaking`, `tackling`, `vision`, `handling`, `aerialReach`, `commandOfArea`, `communication`, `kicking`, `throwing`, `anticipation`, `decisions`, `oneOnOnes`, `positioning`, `reflexes`, `firstTouch`, `technique`, `flair`, `corners`, `teamwork`, `workRate`, `longThrows`, `eccentricity`, `rushingOut`, `tendencyToPunch`, `punching`, `acceleration`, `freeKickTaking`, `strength`, `stamina`, `pace`, `jumpingReach`, `leadership`, `balance`, `bravery`, `aggression`, `agility`, `naturalFitness`, `determination`, `composure`, `concentration`.
- Player hidden traits: `dirtiness`, `consistency`, `importantMatches`, `injuryProneness`, `versatility`.
- Player personality: `adaptability`, `ambition`, `loyalty`, `pressure`, `professionalism`, `sportsmanship`, `temperament`, `controversy`.
- Staff raw ratings: `adaptability`, `levelOfDiscipline`, `workingWithYoungsters`. Staff scaled ratings: `determination`, `player`, `goalkeepers`, `judgingPlayerAbility`, `judgingPlayerPotential`, `manManagement`, `motivating`, `physiotherapy`, `tacticalKnowledge`, `attacking`, `defending`, `fitness`, `mental`, `technical`, `tactical`.

The current synthetic suite rejects out-of-range values, conflicting aliases, stale source digests, bad signing keys, unexpected fields and invalid build labels. These checks cover in-memory copy generation. Existing destinations and interrupted file publication remain outside the current writer API.

## Independent readback and game reload

The historical one-player CA experiment recorded on the local research branch at `5349343` observed CA through FMRTE and game load, advance, Save As, exit and reopen. It ran on older code and a save with `13.3.3` metadata. CA persisted and PA stayed stable. The stored market value and unrelated decoded bytes stayed stable while the meaning of the changed FMRTE XML General/Price remained unresolved.

Read-only inspection on Windows checked six local inputs, five unique by SHA-256. They were all AFE v4. Three unique inputs reported `13.3.3`, one reported `13.3`, and one had no summary version. None declared `13.3.3f359652`. The current writer rejected the authentic career save at its build gate before signing, and both the in-memory bytes and original file digest matched afterwards.

The general experimental copy writer requires the exact build in the save metadata. The local workflow below admits one individually reviewed source through independent evidence of the producing executable. The current evidence covers a single CA increase. Decreases, other players, multi-player coverage, interrupted publication, in-game recovery testing and the XML Price discrepancy remain open.

## Local CA certification workflow

A Windows Kernel/FileIO trace now attributes creation, writes and closure of a disposable AFE v4 file to the observed `13.3.3f359652` process. The game wrote `13.3.3` into the save summary and the database used layout `0x774`. The save and trace digests are retained in the private provenance receipt.

Use the [local CA certification command](../../../scripts/fm2013-ca-certification.mjs) on a reviewed source and its local trace. Provide `--source`, `--executable`, `--receipt`, `--trace`, `--player`, `--ca` and a fresh `--output` path. Review the displayed UID, CA change, PA, market value, output path, private backup path and preview digest. Add `--confirm` with that digest to publish the copy after user approval. The command verifies the receipt against the original source and raw trace digests. Before preview, enroll the independently reviewed source, receipt and trace SHA-256 values in the private Windows evidence store at `%LOCALAPPDATA%/ManagerHub/WriterCertification/reviewed-source.json`. The record has `schema: 1` and keys `sourceSha256`, `receiptSha256` and `traceSha256`. Enrollment is a trusted local operator action. The command cannot enroll a caller-supplied receipt. Neither artifact is included in production assets.

The certification entry point binds the exact executable and selected source, checks layout and HMAC, and allows one CA edit. The underlying writer checks non-CA database bytes and the re-decoded record set. The command verifies a backup in the private Windows evidence store, reopens and checks the staged output, then publishes it via an exclusive hard link. An existing destination causes failure. Keep the backup for recovery and discard the output if independent readback or game reload fails. Browser Save As remains preview-only in production. A successful local run is evidence for one field and one source, with game reload and independent readback recorded separately.

## 2026-11-29 authentic CA roundtrip on Windows

On writer commit `85e712002d2560486ab321160d5837a3661c707d`, the local CLI published a new copy of the enrolled save with one approved player CA change. FM2013 `13.3.3f359652` loaded the copy at 10:00 on 17 July 2012. The test accepted the default season expectations for the three managers, continued to 12:00, and saved a separate file. The FM2013 process exited fully. A new process reopened that file at 12:00.

| Observation | Source | Writer output before simulation | Game-resaved file after restart |
| --- | ---: | ---: | ---: |
| FMRTE 13.3.3.62 CA | 179 | 180 | 180 |
| FMRTE PA | 182 | 182 | 182 |
| FMRTE grid Value (EUR) | 30,341,549 | 30,341,549 | 30,341,549 |
| Stored market value read from the save (GBP) | 26,384,000 | 26,384,000 | 26,384,000 |
| FMRTE Potential Rating | 81.82 | 81.50 | 81.50 |

All three saves verified their HMAC-SHA512. Before game simulation, 773 of 774 archive members were byte-identical. The decompressed `game_db.dat` diff contained one changed CA byte and 64 integrity bytes. Its other bytes were identical. A separate decoded comparison verified CA, PA and stored market value for all 4,057 unedited players before simulation. The hashes of all three preexisting Phase D source files remained unchanged. Copying the private backup to a new local test file reproduced the enrolled source hash. A replay to the existing writer output failed and left that output byte-identical.

The independent observations cover the FMRTE grid. XML `General/Price` was not sampled in this run. The Potential Rating shift is an FMRTE display observation whose calculation was not verified. The roundtrip evidence is specific to this CA increase on this save and build. The production write capability remains pending the broader Phase D evidence.
