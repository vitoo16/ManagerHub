import { describe, expect, it } from 'vitest';
import { isSaveIdentity, MAX_SAVED_SAVE_INSPECTIONS, toPersistedSaveIdentity } from './save-library';
import type { SaveIdentity } from './types';

function save(overrides: Partial<SaveIdentity> = {}): SaveIdentity {
  return {
    id: 'a'.repeat(64),
    name: 'career.fm',
    importedAt: '2026-10-29T12:00:00.000Z',
    lastModified: 1_790_000_000_000,
    size: 6,
    sha256: 'a'.repeat(64),
    signature: '02 01 61 66 65 2E',
    detectedFamily: 'afe',
    edition: null,
    build: null,
    support: 'signature_only',
    inspectionStatus: 'inspected',
    warnings: ['Container family detected; player records have NOT been decoded.'],
    archiveIndex: null,
    ...overrides
  };
}

describe('save inspection metadata validation', () => {
  it('accepts a bounded, truthful signature-only inspection record', () => {
    expect(isSaveIdentity(save())).toBe(true);
  });

  it('accepts an experimentally indexed archive only when all member bounds are valid', () => {
    expect(isSaveIdentity(save({
      archiveIndex: {
        family: 'fmf-index-candidate',
        evidence: 'experimental',
        memberCount: 1,
        directoryOffset: 256,
        members: [{ filename: 'game_info.dat', offset: 0, storedBytes: 128, reportedUncompressedBytes: 256 }]
      }
    }))).toBe(true);
    expect(isSaveIdentity(save({
      archiveIndex: {
        family: 'fmf-index-candidate',
        evidence: 'experimental',
        memberCount: 1,
        directoryOffset: 256,
        members: [{ filename: 'game_info.dat', offset: 200, storedBytes: 128, reportedUncompressedBytes: 256 }]
      }
    }))).toBe(false);
  });

  it('rejects overlapping and duplicate archive entries at the storage boundary', () => {
    const entry = (filename: string, offset: number) => ({
      filename, offset, storedBytes: 20, reportedUncompressedBytes: 40
    });
    const archive = (members: ReturnType<typeof entry>[]) => ({
      family: 'fmf-index-candidate' as const, evidence: 'experimental' as const,
      memberCount: members.length, directoryOffset: 256, members
    });
    expect(isSaveIdentity(save({ archiveIndex: archive([
      entry('a.dat', 0), entry('a.dat', 32)
    ]) }))).toBe(false);
    expect(isSaveIdentity(save({ archiveIndex: archive([
      entry('a.dat', 0), entry('b.dat', 19)
    ]) }))).toBe(false);
    expect(isSaveIdentity(save({ archiveIndex: archive([
      entry('b.dat', 20), entry('a.dat', 0)
    ]) }))).toBe(true);
  });

  it('rejects invalid family/status combinations and malformed hashes', () => {
    expect(isSaveIdentity(save({ detectedFamily: null, support: 'signature_only' }))).toBe(false);
    expect(isSaveIdentity(save({ sha256: 'not-a-hash' }))).toBe(false);
    expect(isSaveIdentity({ ...save(), detectedFamily: 'guessed-family' })).toBe(false);
  });

  it('rejects invalid sizes, warning payloads and inconsistent archive counts', () => {
    expect(isSaveIdentity(save({ size: 256 * 1024 * 1024 + 1 }))).toBe(false);
    expect(isSaveIdentity(save({ warnings: Array.from({ length: 33 }, () => 'warning') }))).toBe(false);
    expect(isSaveIdentity(save({
      archiveIndex: {
        family: 'fmf-index-candidate',
        evidence: 'experimental',
        memberCount: 2,
        directoryOffset: 256,
        members: [{ filename: 'game_info.dat', offset: 0, storedBytes: 128, reportedUncompressedBytes: 256 }]
      }
    }))).toBe(false);
  });

  it('rejects unrecognized fields so raw file bytes cannot hide in metadata records', () => {
    expect(isSaveIdentity({ ...save(), fileBytes: new Uint8Array([1, 2, 3]) })).toBe(false);
    expect(isSaveIdentity({
      ...save(),
      archiveIndex: {
        family: 'fmf-index-candidate',
        evidence: 'experimental',
        memberCount: 1,
        directoryOffset: 256,
        members: [{ filename: 'game_info.dat', offset: 0, storedBytes: 128, reportedUncompressedBytes: 256, payload: 'hidden' }]
      }
    })).toBe(false);
  });


  it('drops binary-derived ephemeral diagnostics before persisting a valid catalogue', () => {
    const observed = save({
      archiveIndex: {
        family: 'fmf-index-candidate', evidence: 'experimental',
        memberCount: 1, directoryOffset: 256,
        members: [{ filename: 'game_info.dat', offset: 0, storedBytes: 128, reportedUncompressedBytes: 256 }],
        probes: [{
          filename: 'game_info.dat', absoluteOffset: 18, sampleBytes: 16,
          prefixHex: '10 00 00 00 10 00 00 00 aa bb cc dd ee ff 00 11',
          prefixKind: 'unknown', afterFirstEightBytesHex: 'aa bb cc dd ee ff 00 11',
          afterFirstEightBytesKind: 'unknown',
          storedBytes: 128, reportedUncompressedBytes: 256
        }],
        gapObservations: [{
          afterMember: 'a.dat', beforeMember: 'game_info.dat', sizeBytes: 8,
          markerMatches: 1, firstMarkerAt: 0, mostCommonMarkerDistance: null,
          mostCommonDistanceOccurrences: 0, status: 'sampled'
        }]
      }
    });
    expect(isSaveIdentity(observed)).toBe(false);
    const persisted = toPersistedSaveIdentity(observed);
    expect(isSaveIdentity(persisted)).toBe(true);
    expect(persisted.archiveIndex).toEqual({
      family: 'fmf-index-candidate', evidence: 'experimental', memberCount: 1,
      directoryOffset: 256,
      members: [{ filename: 'game_info.dat', offset: 0, storedBytes: 128, reportedUncompressedBytes: 256 }]
    });
    expect(JSON.stringify(persisted)).not.toContain('aa bb cc');
    expect(persisted).not.toBe(observed);
  });

  it('keeps the local inspection catalogue bounded', () => {
    expect(MAX_SAVED_SAVE_INSPECTIONS).toBe(50);
  });
});
