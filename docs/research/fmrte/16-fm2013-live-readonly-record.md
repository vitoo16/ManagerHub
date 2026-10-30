# FM2013 live read-only record experiment

**New result:** REA attached to the user-opened FM2013 process and read a record whose first/last names match the user-selected player, repeatedly. This supersedes earlier statements that no live read had run. **Still unverified:** independently displayed ID/attributes, hidden CA/PA ground truth, restart stability, catalog-wide ingestion and writer safety. No production capability is promoted.

## Target and acquisition

The user opened FM2013, loaded the career and selected Wayne Rooney. REA MCP6.7.0 remained connected. `list_frida_devices` and `list_frida_processes(device_id:local)` found `fm.exe`; a direct shell process query did not expose it. REA attached to that returned PID, without spawning or pausing the game. Frida17.23.2 reported Windows/ia32, pointer size4, and main-module path `C:\Program Files (x86)\Football Manager 2013\fm.exe`.

The on-disk executable still hashes to `df45cde67cb7361867e7afc9808dacab8bf53bd972f48145f6f881ff55d08871` (metadata build `13.3.3f359652`). Runtime path/architecture and on-disk hash were correlated; **loaded runtime image bytes were not authenticated against the complete file**. REA labels Frida observations as external-service runtime evidence with no automatic artifact binding. This limitation is retained explicitly in the probe output.

Only readable/writable mappings in the selected game process were scanned; no other process memory was read. Scripts used range enumeration, bounded byte-pattern scans and reads. They installed no hooks, called no game functions, patched no instructions and issued no game-memory or save writes. Attaching Frida loads instrumentation into the process; it is not equivalent to a zero-footprint external memory read. Full process dumps were not produced.

## Record discovery from actual data

The corrected bounded name scan examined about819MB of selected mappings in 2.6seconds, within a1GiB/20second budget, with no reported read errors. It found51 exact UTF-16 surname occurrences. The preceding bytes distinguished cached text from a string representation matching the FMRTE reader: flag byte1, length at+1 and UTF-16 payload at+4. A separate first-name search used that representation.

Static method `0x06000433`, RVA159704, performs the native string reads. Person FirstName/LastName getters (`0x06000f6f`/`0x06000f71`) pass nullable offset40, so the name-object pointer must be followed through its+40 string pointer. Initial examination without that additional hop did not establish a person record. Back-reference scans using the recovered+40 relation then found a first/last-name object pair for the selected player. Some pages changed/faulted during those later scans (per-target errors retained); uniqueness across all game mappings is not claimed.

Layout initializer `0x0600024e`, RVA95120, assigns ID offset20 and first/last-name offsets92/96. Following those fields in the recovered candidate repeatedly returned the selected first/last names, two equal native IDs and a distinct PlayerSID. ID (`0x06000f63`) reads at the ID offset; ID2 (`0x06000f64`) reads8bytes later; PlayerSID (`0x06000f65`) reads4bytes later. The repeated observations support treating these three fields separately, as the [catalog report](15-fmrte13-player-catalog.md) required.

The observed record is consistent with initializer `0x06000924`, RVA303780: PersonMemoryAddress is Player base+356; attribute-pointer slot is+228; CA/PA slots are+336/+338. These constants are observed assignments and a successful single-record candidate, not a universally validated FM2013 schema. An early probe mistakenly tested+32 as the attribute slot, got a null pointer and a Frida script access-violation diagnostic. Reviewing the exact field assignment established+228; the reusable probe now rejects null/invalid pointers before dereferencing them. The game process continued running.

Attribute initializer `0x06000596`, RVA202196, assigns Passing offset54 and Pace85 from the attribute block. Their getters (`0x060012e6`/`0x06000fc1`) reach the signed-byte read/conversion path already recovered. Raw reads produce plausible1–20 values under the documented scale5 branch. This is consistency evidence pending independent displayed values, not independent validation.

The raw ability words are stable across repeat reads. [The recovered arithmetic](14-fmrte13-field-transforms.md) yields plausible CA/PA candidates in mode3; modes0/1 yield values outside the ordinary ability range. Plausibility alone cannot certify mode selection or Actual CA/PA. Mode3 profile routines statically call the above initializers, providing additional support, but the exact selected profile's version validator remains unresolved.

Private raw values, pointers, partial scans, script errors and all REA observations remain in the external bundle referenced by [the manifest](evidence-manifest.json). They are not committed as player/save fixtures. Public tests use explicitly synthetic records.

## Reusable implementation and checks

[fm2013-readonly-record-probe.mjs](../../../scripts/fm2013-readonly-record-probe.mjs) builds a REA/Frida script for an explicitly supplied same-session record address, PID, expected ID and both names. It requires the selected executable file hash as a caller-verified precondition. At runtime it checks PID, path and architecture before memory reads; checks identity before attribute/ability reads; bounds name decoding; rejects invalid pointers; and repeats identity/attribute-pointer checks afterward. It also re-reads the four numeric fields and rejects concurrent changes; these checks cannot make a live process an atomic snapshot. It returns raw ability words and candidate scaled attributes, with `actualAbilityVerified:false` and `independentGroundTruthVerified:false`. It never creates a canonical ActualCA/PA snapshot or a write operation.

The generated script was loaded through REA `load_frida_script(source_kind:file)` and successfully repeated the same live candidate observation. Its canonical evidence is `ev_ea70c621129c119a3347b2662d41318af2f4cba8fa1c3dd779a9d1af0563935e`. Focused static evidence is `ev_bb55229d298fc99886e89b806add3f2250c9b09a651cce61fc66ece3b389545c` (Person/names/read helpers) and `ev_5d9b78da4dc500a81fa0db487fc5ce31ca9328bb6309e25b2656bae2e6659db2` (attribute/profile assignments). Runtime record coordinates must not be reused after process restart.

The final revision with concurrent numeric-field checks was also executed successfully in a fresh REA attachment: `ev_30b077e5b36f465e99330a01408a4e0641205b61571143e3b92f662cc867f1bc`. Both attachments were detached after their reads; REA's first post-detach process inventory still observed the same game PID. No target was killed. The probe script digest, private runtime index and complete raw-bundle digest are retained in the manifest. A local replay audit verified source/bundle/binary hashes and equality of identity, raw ability words and ordinary attributes between the two reusable-probe observations, without promoting independent-ground-truth flags.

Five meaningful synthetic tests cover successful bounded reads with candidate provenance, wrong process/architecture/image rejection before reads, identity mismatch before sensitive field reads, stale/null/malformed-string failures and builder input guards. The standard test command includes this suite. This is a research probe, not a production desktop bridge or an independently certified adapter.

Numeric-field changes during capture are also covered in the stale/error test. `npm.cmd run check` passed TypeScript,90 Vitest tests,60 Node tests and the production build/bundle budgets. UI/E2E and Rust checks are not applicable to this isolated research module. The existing Node localStorage experimental warning is non-failing.

## Independent comparison still pending

Computer Use found the exact game window, but its first screenshot attempt reported a minimized window; activation and refreshed-window capture then reported no screenshot target. No game buttons were clicked and no alternate screenshot mechanism was used. The user was asked for the visible ID, Passing and Pace. No screenshot or visible-value match is claimed until that input is available. Hidden CA/PA needs a separate trusted reference observation.

The remaining tests are exact-build descriptor validation, independent known-field comparison, recovery across process restart, a second named record and a bounded catalog traversal. Source save files remain separate from this live-memory experiment; offline AFE payload decoding and all write/reload tests remain unresolved.
