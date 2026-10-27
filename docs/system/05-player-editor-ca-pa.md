# S05 — CA/PA and advanced player editor (future gated)

**Not implemented.** The save contains proprietary binary structures; read-only decoder support does not automatically confer edit/write support. FMRTE live-game memory editing is a distinct pathway from static .fm file rewriting.

Display Actual CA/PA only when verified and authorized by edition/build adapter. Estimated CA and Role Fit are ManagerHub's calculations and not editable FM fields. `Role editing` may mean tactical selection, position familiarity, role-weight settings or hidden native data; model these separately.

## Transaction design
1. Select certified compatible exact game edition/build and an immutable snapshot.
2. Edit only authorized native fields; type/scale/range and dependent-field checks.
3. Preview old -> new values, related changes, uncertainty and compatibility.
4. Obtain explicit confirmation, create backup, verify file is not stale.
5. Write a **temporary new copy** in an isolated worker; original remains unchanged.
6. Reopen with an independent reader; validate data consistency and semantic diff.
7. Verify that the game can load the modified copy and expected field(s) appear.
8. Publish changed copy and a visible rollback/restore command. On any failed check, refuse to expose modified copy as safe.

No automatic memory patching or bypass of game's checks; separate explicit integration research required before any live editing. Never promise bulk edits without test coverage on all affected native records.

Acceptance: unsupported version disables editor; preview never mutates source; reject unexpected unrelated changes; rollback proven on fixture set; track audit log locally. See [save reader](04-save-reader-compatibility.md) and [quality](09-security-privacy-and-testing.md).