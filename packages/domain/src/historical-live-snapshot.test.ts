import { describe, expect, it } from 'vitest';
import profile from './fm2013-live-profile.json' with { type: 'json' };
import { parseFm2013LiveCapture, type LiveSnapshotContext } from './live-snapshot';
import {
  createHistoricalSnapshotRecord, isHistoricalSnapshotRecord, isHistoricalSnapshotSummary,
  toHistoricalSnapshotSummary
} from './historical-live-snapshot';

const context: LiveSnapshotContext = {
  snapshotId: 'snapshot-test',
  careerId: 'Synthetic career label',
  capturedAt: '2026-10-31T09:00:00.000Z',
  mode: 'editor'
};

function player(nativeId: number) {
  return {
    nativeId,
    firstName: 'Synthetic',
    lastName: 'Player ' + nativeId,
    attributeBytes: profile.attributes.map(() => 75),
    positionBytes: profile.positions.map(() => 0),
    birthDateBytes: [59, 0, 208, 7],
    primaryNation: { nativeId: 88, name: 'Synthetic Nation' },
    club: { nativeId: 77, name: 'Synthetic Club', relation: 'player_team_pointer' }
  };
}

function pass(nativeKind: 'player' | 'playerStaff', records: ReturnType<typeof player>[]) {
  return {
    nativeKind,
    imageTypeMetadataVerified: true,
    coverage: {
      bytesScanned: 4096,
      matches: records.length,
      rejected: 0,
      duplicates: 0,
      faultCount: 0,
      stopReason: null,
      selectedMappingsExhausted: true,
      elapsedMs: 20
    },
    records
  };
}

function capture() {
  return {
    schema: profile.schema,
    profileVersion: profile.profileVersion,
    target: {
      pid: 101,
      arch: 'ia32',
      pointerSize: 4,
      imagePath: profile.imagePath,
      binarySha256: profile.binarySha256
    },
    gameDateBytes: [59, 0, 209, 7],
    passes: [pass('player', [player(42)]), pass('playerStaff', [player(43)])]
  };
}

const metadata = {
  fileName: 'synthetic-fm2013-capture.json',
  sourceSize: 4096,
  sourceSha256: 'a'.repeat(64),
  importedAt: '2026-10-31T09:05:00.000Z'
};

function makeRecord(mode: 'editor' | 'realism' = 'editor') {
  const parsed = parseFm2013LiveCapture(JSON.stringify(capture()), { ...context, mode });
  if (parsed.status === 'rejected') throw new Error(parsed.diagnostics.join(' '));
  return createHistoricalSnapshotRecord(parsed, metadata);
}

describe('historical FM2013 snapshot persistence schema', () => {
  it('creates a versioned Editor record with complete source metadata and a compact summary', () => {
    const record = makeRecord('editor');
    expect(isHistoricalSnapshotRecord(record)).toBe(true);
    expect(record).toMatchObject({
      schema: 'managerhub.fm2013-historical-snapshot',
      schemaVersion: 1,
      mode: 'editor',
      fileName: metadata.fileName,
      sourceSha256: metadata.sourceSha256,
      status: 'ready'
    });
    expect(record.snapshot.players[0]?.attributes.passing?.value).toBe(15);
    expect(record.snapshot.players[0]?.positions.goalkeeper?.value).toBe(0);
    const summary = toHistoricalSnapshotSummary(record);
    expect(isHistoricalSnapshotSummary(summary)).toBe(true);
    expect(summary).toMatchObject({ mode: 'editor', playerCount: 2, edition: 'FM2013', build: '13.3.3f359652' });
    expect(Object.isFrozen(record)).toBe(true);
    expect(Object.isFrozen(record.snapshot.players[0]?.attributes)).toBe(true);
  });

  it('stores Realism as a separately redacted projection with no exact ratings or biography', () => {
    const record = makeRecord('realism');
    expect(isHistoricalSnapshotRecord(record)).toBe(true);
    const playerRecord = record.snapshot.players[0];
    expect(playerRecord?.attributes.passing).toMatchObject({ value: null, missingReason: 'redacted' });
    expect(playerRecord?.positions.goalkeeper).toMatchObject({ value: null, missingReason: 'redacted' });
    expect(playerRecord?.birthDate).toMatchObject({ value: null, missingReason: 'redacted' });
    expect(playerRecord?.primaryNation).toMatchObject({ value: null, missingReason: 'redacted' });
    expect(playerRecord?.calendarAge).toMatchObject({ value: null, missingReason: 'redacted' });
    expect(playerRecord?.actualCa).toMatchObject({ value: null, missingReason: 'redacted' });
    expect(JSON.stringify(record)).not.toContain('"value":15');
    expect(JSON.stringify(record)).not.toContain('Synthetic Nation');
  });

  it('rejects persisted Editor values relabelled as Realism or injected into a Realism field', () => {
    const editor = JSON.parse(JSON.stringify(makeRecord('editor'))) as Record<string, unknown>;
    editor.mode = 'realism';
    expect(isHistoricalSnapshotRecord(editor)).toBe(false);

    const realism = JSON.parse(JSON.stringify(makeRecord('realism'))) as {
      snapshot: { players: Array<{ attributes: Record<string, { value: number | null }> }> };
    };
    realism.snapshot.players[0]!.attributes.passing!.value = 15;
    expect(isHistoricalSnapshotRecord(realism)).toBe(false);
  });

  it('rejects unknown keys, changed build identity, malformed hashes and invalid player identities', () => {
    const original = JSON.parse(JSON.stringify(makeRecord())) as Record<string, unknown>;
    expect(isHistoricalSnapshotRecord({ ...original, unexpected: true })).toBe(false);
    expect(isHistoricalSnapshotRecord({ ...original, sourceSha256: 'not-a-hash' })).toBe(false);

    const changedBuild = JSON.parse(JSON.stringify(original)) as {
      snapshot: { build: string };
    } & Record<string, unknown>;
    changedBuild.snapshot.build = '13.3.3-other';
    expect(isHistoricalSnapshotRecord(changedBuild)).toBe(false);

    const duplicatePlayer = JSON.parse(JSON.stringify(original)) as {
      snapshot: { players: unknown[] };
    } & Record<string, unknown>;
    duplicatePlayer.snapshot.players[1] = duplicatePlayer.snapshot.players[0];
    expect(isHistoricalSnapshotRecord(duplicatePlayer)).toBe(false);
  });

  it('accepts legacy captures whose optional biography and position fields were not transported', () => {
    const input = JSON.parse(JSON.stringify(capture())) as {
      passes: Array<{ records: Array<Record<string, unknown>> }>;
    };
    for (const scan of input.passes) {
      for (const item of scan.records) {
        delete item.birthDateBytes;
        delete item.primaryNation;
        delete item.positionBytes;
      }
    }
    const parsed = parseFm2013LiveCapture(JSON.stringify(input), { ...context, mode: 'realism' });
    expect(parsed.status).toBe('ready');
    if (parsed.status === 'rejected') throw new Error('Expected a legacy capture to be admitted.');
    const record = createHistoricalSnapshotRecord(parsed, metadata);
    expect(isHistoricalSnapshotRecord(record)).toBe(true);
    expect(record.snapshot.players[0]?.birthDate.missingReason).toBe('not_decoded');
    expect(record.snapshot.players[0]?.primaryNation.missingReason).toBe('not_decoded');
    expect(record.snapshot.players[0]?.positions.goalkeeper?.missingReason).toBe('not_decoded');
  });

  it('keeps empty and partial capture states distinct when creating persisted records', () => {
    const emptyInput = capture();
    emptyInput.passes = [pass('player', []), pass('playerStaff', [])];
    const empty = parseFm2013LiveCapture(JSON.stringify(emptyInput), context);
    expect(empty.status).toBe('empty');
    if (empty.status === 'rejected') throw new Error('Expected empty capture.');
    expect(isHistoricalSnapshotRecord(createHistoricalSnapshotRecord(empty, metadata))).toBe(true);

    const partialInput = capture();
    partialInput.passes = [pass('player', [player(42)])];
    const partial = parseFm2013LiveCapture(JSON.stringify(partialInput), context);
    expect(partial.status).toBe('partial');
    if (partial.status === 'rejected') throw new Error('Expected partial capture.');
    expect(isHistoricalSnapshotRecord(createHistoricalSnapshotRecord(partial, metadata))).toBe(true);
  });

  it('rejects unsafe file names, out-of-range sizes and invalid timestamps', () => {
    const parsed = parseFm2013LiveCapture(JSON.stringify(capture()), context);
    if (parsed.status === 'rejected') throw new Error('Expected valid capture.');
    expect(() => createHistoricalSnapshotRecord(parsed, { ...metadata, fileName: '../capture.json' })).toThrow();
    expect(() => createHistoricalSnapshotRecord(parsed, { ...metadata, sourceSize: 48_000_001 })).toThrow();
    expect(() => createHistoricalSnapshotRecord(parsed, { ...metadata, importedAt: 'not-a-time' })).toThrow();
  });
});
