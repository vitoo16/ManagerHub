---
name: managerhub-save-safety
description: Use when inspecting Football Manager .fm files, designing or implementing binary parsers, snapshot ingestion, save compatibility, CA/PA field decoding or any editing/write-back of Football Manager data. Strictly separates read-only research from certified write operations.
---

# ManagerHub Save Reader & Editing Safety

## Read first
Read docs/product/01-full-feature-catalog.md (MH-01/03/05), docs/README.md, docs/references.md and AGENTS.md. Treat all .fm files as untrusted binary inputs. Uploaded sample's afe. signature is an observation, not a known parser success.

## Decode process
1. User file selected with consent; hash immutable original and record file size.
2. Detect container family, likely game edition/build with explicit confidence; no filename-based assumptions.
3. Parse in restricted worker with bounds on offsets, object counts, compression ratio, time/memory.
4. Log accessible field coverage for players, attrs, CA, PA, contracts, club, tactics, matches; not-decoded vs not-present must differ.
5. Validate decoded IDs/values against test fixture and same-save game UI under same build.
6. Produce normalized immutable snapshot with per-field source and version, preserving unknown as null.
7. Test malformed/corrupt/large fixtures and deterministic results.
8. Distinguish partial, unsupported, corrupt and success in API and UI.

## Editing gate
- Separate read from writer privilege. No writer exists until edition-specific format and dependent field invariants proven.
- Require explicit preview, field range validation, user confirmation, stale-base check, backup, temporary write, independent reparse, semantic diff, in-game load test and rollback.
- Abort when unrelated entities change unexpectedly or build unknown. Never silently edit source save.
- No process-memory operations in web page; live memory bridge is a distinct reviewed future architecture.

## Never
Guess offsets; manufacture CA/PA; treat 0 as unknown; assume fmf./afe. compatibility; commit private saves; upload input to hosted service silently; bypass platform integrity checks.

## Required artifacts
Fixture matrix, detection confidence, source hash, coverage report, error taxonomy, roundtrip tests (if writing), and compatibility ledger.
