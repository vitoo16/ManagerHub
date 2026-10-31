# FM2013 dual-class coverage and reference comparison

**2026-10-31:** the independently implemented reader now discovers4,036 native Player records plus22 PlayerStaff records:4,058 distinct IDs, matching FMRTE13's displayed player count for the loaded career. All49 ordinary attributes are read with repeat checks across both classes. Three records, including one PlayerStaff, match FMRTE13 UI Automation values for all49 attributes and CA/PA:153 numeric comparisons, plus identity checks. This advances exact-build live research; it does not certify a production adapter, every player value, an offline parser or a writer.

## Authorized reference operation

After the user explicitly approved opening the installed FMRTE13 for read-only comparison, Computer Use launched `C:\BraCa Soft\FMRTE 13\FMRTE.exe`, version13.3.3.62. The file remains SHA-256 `c3d594ed4d9d2c50e987a36ed186d771dd4242450c7e75fc34920e5d8dbcfcae`. The main-window screenshot/accessibility state reports the current FM2013 build as13.3.3 359652 and4,058 players.

Only Load Game, local player-name search, profile-tab navigation, window maximization and a goalkeeper-display toggle were requested. No player-value field, preset, freeze, Save Changes or activation control was used. Some UI calls reported geometry, changed-bounds or timeout errors; state was re-observed before further input, and resulting text/screenshot evidence was captured. The reference app remains open for review. This is a controlled reference-tool operation, not a trace of every internal action the vendor application might perform.

Private screenshots and complete UI Automation receipts for two ordinary players and one dual-class player remain outside Git. UI Automation also exposes bound goalkeeper fields when their group is hidden; the first record has a separate screenshot with that display group enabled. All49 field comparisons use the captured reference values; not every field was visually confirmed in a single screenshot. The comparison is not blinded. FMRTE is an independent running reference implementation, not an official game-engine oracle.

## Two native classes

The prior [file-relative locator](18-fm2013-file-relative-discovery.md) also finds the real dual-class name `.?AVACTUAL_PLAYER_AND_NON_PLAYER@@`. The FMRTE class named PlayerStaff is not a native symbol named ACTUAL_PLAYER_STAFF.

| Exact-build field / proof | Player | PlayerStaff |
|---|---:|---:|
| Person displacement from complete object base | 356 | 452 |
| Attributes-pointer slot from complete base | 228 | 228 |
| CA / PA word slots from complete base | 336 /338 | 336 /338 |
| Person-subobject marker RVA | 34,118,796 | 34,449,828 |
| Observed candidate records | 4,036 | 22 |

Native RTTI independently supplies the452-byte dual-class subobject displacement. FMRTE initializer `192` assigns the same displacement, and PlayerStaff constructor `108b` sets PersonMemoryAddress from it while retaining the original complete-object MemoryAddress. Descriptor4bb calls192. Ordinary getters use the shared attributes block; CA/PA mode3 selects PlayerStaff slots154/155, which192 sets to336/338. Personality uses a separate layout and is excluded from this implementation.

The shared research builder now accepts only the two explicitly supported native-name/displacement pairs, checks any requested kind against its file proof, and carries the kind through discovery/record output. Supplied-record probes still trust the caller's selected complete-object base/kind; identity checks do not replace RTTI proof. The file-relative discovery path verifies RTTI before scanning.

REA evidence `ev_173c58a453222f89289e6d7e9a47b5cc78de3b9e8138c4e4fa9e1375743e5d20` retains both actual scans:4,036 and22 matches, zero rejected/duplicate/chunk-fault counts, and no cross-class ID collision. Matching the reference count is evidence about this loaded cohort, not a proof of entire database completeness.

## Additional process and image relocation

The game subsequently appeared under PID22472 rather than29056. Admission rechecked process inventory; a deliberately stale-PID record script then rejected both requested reads with `pid_mismatch` (`ev_5e636123622d689be0775152ac9d76647bc3e3f6662af5d306cdd72eaa603dad`). New file-relative discovery recovered both classes without old heap addresses.

The module base changed from0x008c0000 to0x00a70000, as derived from the runtime marker minus its file-derived RVA. Thus this additional observation exercises real image relocation as well as new heap addresses, supplementing report18's first restart whose image base stayed unchanged. The cause of the additional process restart was not established by the reader. No process was killed by the agent. Every owned Frida session was detached.

## Forty-nine ordinary fields

[fm2013-ordinary-attributes.mjs](../../../scripts/fm2013-ordinary-attributes.mjs) preserves49 source-era names, categories, byte offsets, source getter/field tokens and getter IL hashes. There are11 goalkeeper,14 mental,10 physical and14 technical fields, including both feet. No personality, hidden attributes, positions or invented modern aliases are added. This research catalogue is separate from the product's canonical domain schema.

An original bounded constant-only reducer follows initializer596's flattened branches. Exact profile4bb calls596; all49 getters read a signed byte through42e and convert through8ed. Source hashes and49 address-fixture executions corroborate the catalogue. Scaling has a separate dependency:8ed uses Config14d9, which returns5 when `attributesRange ==20`, otherwise1. CA/PA mode3 does not select ordinary-attribute scale. The output deliberately retains `candidateScale5`; the147 reference matches establish agreement for this observed reference configuration, not every configuration.

`attributeSet:'ordinary49'` opts into this catalogue in the existing [guarded probe](../../../scripts/fm2013-readonly-record-probe.mjs). The default two-field probe remains available. Every selected byte is re-read to detect concurrent changes. The batch path continues to omit ability words.

REA evidence `ev_31f503ffadbadfad924be73db340c8bc52a0747dc51d319847e4803be3e6e264` executes the full49-field scan over both native classes. It reads198,842 candidate attribute cells, with no reported repeat-check rejection, duplicate IDs, chunk faults or scale5 outputs outside1..20. The normal/dual passes take1,605ms/832ms respectively, each scanning780,294,215 attempted bytes including overlap. Only aggregate diagnostics and three sample records were emitted from this verification wrapper; it is not a complete process-memory dump. Range/stability checks are not independent reference comparisons for all198,842 cells.

## Reference-matched CA/PA and attributes

The full three-record native observation is `ev_25af0a29742fa614a3eeac5933c7ce4ac2a2dc3e45d4e3025512bc8b9dd3b8dc`. The existing independent [field arithmetic](14-fmrte13-field-transforms.md) decodes each raw ability word using its actual effective address and the statically associated mode3. Each decoded CA and PA matches the corresponding FMRTE UI field. All49 candidate-scale5 attributes per record also match, including non-multiples-of-five raw values.

The manifest records **six matched ability values and147 matched ordinary-attribute values on three identified records**, rather than marking every ability field on every player certified. This resolves the earlier lack of any running-reference hidden-ability comparison. It does not independently prove game-engine semantics beyond that reference, general exact-build compatibility or safe write invariants. Immutable REA probe outputs retain their original `actualAbilityVerified:false`/candidate flags; later reference matches are separate evidence and do not rewrite those captures. Production ActualCA/PA capability flags remain disabled.

## Verification and remaining work

The standard check passes TypeScript,90 Vitest tests,74 Node tests and build/bundle budgets. Nineteen focused tests include both native classes, all49 selected fields, repeated-field changes, dual stale identity and invalid kind/proof selection. Independent source review found no implementation defect; its small stale-fixture coverage finding was fixed and the affected suite rerun. UI/E2E and Rust checks are not relevant to the unchanged product interface and isolated Node research tooling.

Private replay checks reference screenshot/JSON digests, canonical observations, source scripts, the4058-ID union, all153 numeric comparisons and untouched raw capture flags. Original installation/save hashes and research links are audited separately. Required next work includes broader career/build/error-state coverage, further contract/club/position fields, a reviewed desktop bridge, offline AFE payload decoding and independent writer certification. No save/game edit or persistence test was requested or performed.

The final audit passes187 method discoveries,165 unique canonical REA records,11 bundle hashes and every research link/Evidence ID. All424 inventoried installation files and three save samples retain their recorded hashes. The128 method discoveries from the previous commit remain byte-for-byte equal as JSON entries; this follow-up adds59 source anchors and separate comparison evidence.
