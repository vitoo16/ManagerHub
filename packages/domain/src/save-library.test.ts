import { describe, expect, it } from 'vitest';
import { isSaveIdentity, isSaveInspectionResult, MAX_SAVED_SAVE_INSPECTIONS, toPersistedSaveIdentity } from './save-library';
import type { ArchiveMember, MemberEnvelopeProbe } from './archive';
import type { UnindexedGapObservation } from './archive-gaps';
import type { SaveIdentity } from './types';

function save(overrides: Partial<SaveIdentity> = {}): SaveIdentity {
  return {
    id: 'a'.repeat(64),
    name: 'career.fm',
    importedAt: '2026-10-29T12:00:00.000Z',
    lastModified: 1_790_000_000_000,
    size: overrides.archiveIndex === null || overrides.archiveIndex === undefined ? 6 : 512,
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

  it('requires a declared SHA-256 fingerprint to be the record identity', () => {
    const hash = 'b'.repeat(64);
    expect(isSaveIdentity(save({ id: hash, sha256: hash }))).toBe(true);
    expect(isSaveIdentity(save({ id: 'a'.repeat(64), sha256: hash }))).toBe(false);
    expect(isSaveIdentity(save({ id: 'inspection:' + 'c'.repeat(32), sha256: null }))).toBe(true);
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

  it('requires the persisted archive directory and member extents to fit the original file', () => {
    const validArchive = {
      family: 'fmf-index-candidate' as const,
      evidence: 'experimental' as const,
      memberCount: 1,
      directoryOffset: 256,
      members: [{ filename: 'game_info.dat', offset: 0, storedBytes: 128, reportedUncompressedBytes: 256 }]
    };
    expect(isSaveIdentity(save({ archiveIndex: validArchive }))).toBe(true);
    expect(isSaveIdentity(save({ archiveIndex: validArchive, detectedFamily: 'fmf' }))).toBe(false);
    expect(isSaveIdentity(save({ archiveIndex: validArchive, detectedFamily: null, support: 'unrecognized' }))).toBe(false);
    expect(isSaveIdentity(save({ archiveIndex: validArchive, size: 255 }))).toBe(false);
    expect(isSaveIdentity(save({ archiveIndex: {
      ...validArchive,
      members: [{ filename: 'game_info.dat', offset: 0, storedBytes: 128, reportedUncompressedBytes: 0x1_0000_0000 }]
    } }))).toBe(false);
    expect(isSaveIdentity(save({ archiveIndex: { ...validArchive, directoryOffset: 18 } }))).toBe(false);
    expect(isSaveIdentity(save({ archiveIndex: {
      ...validArchive,
      members: [{ filename: 'game_info.dat', offset: 231, storedBytes: 8, reportedUncompressedBytes: 8 }]
    } }))).toBe(false);
    expect(isSaveIdentity(save({ archiveIndex: {
      ...validArchive,
      members: [{ filename: 'game_info.dat', offset: 230, storedBytes: 8, reportedUncompressedBytes: 8 }]
    } }))).toBe(true);
    for (const filename of ['../game_info.dat', 'folder\\\\game_info.dat', 'bad\u0001name.dat']) {
      expect(isSaveIdentity(save({ archiveIndex: {
        ...validArchive,
        members: [{ filename, offset: 0, storedBytes: 8, reportedUncompressedBytes: 8 }]
      } }))).toBe(false);
    }
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

  it('binds the declared container family to the observed signature bytes', () => {
    expect(isSaveIdentity(save({ detectedFamily: 'afe', signature: '02 01 66 6D 66 2E' }))).toBe(false);
    expect(isSaveIdentity(save({ detectedFamily: null, support: 'unrecognized', signature: '02 01 78 78 78 78' }))).toBe(true);
    expect(isSaveIdentity(save({
      detectedFamily: null, support: 'unrecognized', signature: '02 01 61 66 65 2E'
    }))).toBe(false);
    expect(isSaveIdentity(save({
      detectedFamily: 'fmf', support: 'signature_only', signature: '02 01 66 6D 66 2E'
    }))).toBe(true);
  });

  it('rejects invalid family/status combinations and malformed hashes', () => {
    expect(isSaveIdentity(save({ detectedFamily: null, support: 'signature_only' }))).toBe(false);
    expect(isSaveIdentity(save({ sha256: 'not-a-hash' }))).toBe(false);
    expect(isSaveIdentity({ ...save(), detectedFamily: 'guessed-family' })).toBe(false);
  });

  it('rejects sparse arrays at every persisted and ephemeral metadata boundary without throwing', () => {
    const validArchive = {
      family: 'fmf-index-candidate' as const,
      evidence: 'experimental' as const,
      memberCount: 1,
      directoryOffset: 256,
      members: [{ filename: 'game_info.dat', offset: 0, storedBytes: 128, reportedUncompressedBytes: 256 }]
    };
    const sparseMembers: ArchiveMember[] = [];
    sparseMembers.length = 1;
    const sparseGroups: { name: string; memberCount: number }[] = [];
    sparseGroups.length = 1;
    const sparseWarnings: string[] = [];
    sparseWarnings.length = 1;
    const sparseProbes: MemberEnvelopeProbe[] = [];
    sparseProbes.length = 1;
    const sparseGaps: UnindexedGapObservation[] = [];
    sparseGaps.length = 1;

    expect(() => isSaveIdentity(save({ archiveIndex: { ...validArchive, members: sparseMembers } }))).not.toThrow();
    expect(isSaveIdentity(save({ archiveIndex: { ...validArchive, members: sparseMembers } }))).toBe(false);
    expect(isSaveIdentity(save({ archiveIndex: { ...validArchive, nestedGroups: sparseGroups } }))).toBe(false);
    expect(isSaveIdentity(save({ warnings: sparseWarnings }))).toBe(false);

    const indexed = save({ archiveIndex: validArchive });
    expect(isSaveInspectionResult({
      ...indexed, archiveIndex: { ...validArchive, probes: sparseProbes }
    })).toBe(false);
    expect(isSaveInspectionResult({
      ...indexed, archiveIndex: { ...validArchive, gapObservations: sparseGaps }
    })).toBe(false);
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

  it('validates ephemeral envelope probes but never allows arbitrary worker payload fields', () => {
    const hex = Array.from({ length: 16 }, (_, i) => i.toString(16).padStart(2, '0'));
    const probe = {
      filename: 'game_info.dat', absoluteOffset: 18, sampleBytes: 16,
      prefixHex: hex.join(' '), prefixKind: 'unknown' as const,
      afterFirstEightBytesHex: hex.slice(8).join(' '), afterFirstEightBytesKind: 'unknown' as const,
      storedBytes: 128, reportedUncompressedBytes: 256
    };
    const indexed = save({ archiveIndex: {
      family: 'fmf-index-candidate', evidence: 'experimental',
      memberCount: 1, directoryOffset: 256,
      members: [{ filename: 'game_info.dat', offset: 0, storedBytes: 128, reportedUncompressedBytes: 256 }],
      probes: [probe]
    } });
    expect(isSaveIdentity(indexed)).toBe(false); // ephemerals must not enter IndexedDB
    expect(isSaveInspectionResult(indexed)).toBe(true);
    const persisted = toPersistedSaveIdentity(indexed);
    expect(isSaveIdentity(persisted)).toBe(true);
    expect(JSON.stringify(persisted)).not.toContain(probe.prefixHex);

    const archive = indexed.archiveIndex!;
    expect(isSaveInspectionResult({ ...indexed, fileBytes: new Uint8Array([1]) })).toBe(false);
    expect(isSaveInspectionResult({ ...indexed, archiveIndex: {
      ...archive, probes: [{ ...probe, payload: 'secret' }]
    } })).toBe(false);
    expect(isSaveInspectionResult({ ...indexed, archiveIndex: {
      ...archive, probes: [{ ...probe, sampleBytes: 100 }]
    } })).toBe(false);
    expect(isSaveInspectionResult({ ...indexed, archiveIndex: {
      ...archive, probes: Array.from({ length: 33 }, () => probe)
    } })).toBe(false);
    expect(isSaveInspectionResult({ ...indexed, detectedFamily: 'fmf' })).toBe(false);
  });

  it('bounds ephemeral gap evidence without interpreting it as decoded players', () => {
    const archive = {
      family: 'fmf-index-candidate' as const, evidence: 'experimental' as const,
      memberCount: 2, directoryOffset: 300,
      members: [
        { filename: 'a.dat', offset: 0, storedBytes: 50, reportedUncompressedBytes: 100 },
        { filename: 'b.dat', offset: 100, storedBytes: 50, reportedUncompressedBytes: 100 }
      ]
    };
    const gap = {
      afterMember: 'a.dat', beforeMember: 'b.dat', sizeBytes: 50,
      markerMatches: 0, firstMarkerAt: null, mostCommonMarkerDistance: null,
      mostCommonDistanceOccurrences: 0, status: 'sampled' as const
    };
    const raw = save({ archiveIndex: { ...archive, gapObservations: [gap] } });
    expect(isSaveInspectionResult(raw)).toBe(true);
    expect(isSaveInspectionResult({
      ...raw, archiveIndex: {
        ...archive, gapObservations: [{ ...gap, extraData: new Uint8Array([9]) }]
      }
    })).toBe(false);
    expect(isSaveInspectionResult(save({ archiveIndex: {
      ...archive, gapObservations: [{ ...gap, markerMatches: -1 }]
    } }))).toBe(false);
    expect(isSaveInspectionResult(save({ archiveIndex: {
      ...archive, gapObservations: [{ ...gap, afterMember: 'missing.dat' }]
    } }))).toBe(false);
    expect(isSaveInspectionResult(save({ archiveIndex: {
      ...archive, gapObservations: [{ ...gap, sizeBytes: 49 }]
    } }))).toBe(false);
    expect(isSaveInspectionResult(save({ archiveIndex: {
      ...archive, gapObservations: [{ ...gap, status: 'too_large' }]
    } }))).toBe(false);
    expect(isSaveInspectionResult(save({ archiveIndex: {
      ...archive, gapObservations: [{ ...gap, markerMatches: 99 }]
    } }))).toBe(false);

    const largeGapArchive = {
      family: 'fmf-index-candidate' as const, evidence: 'experimental' as const,
      memberCount: 2, directoryOffset: 2_100_118,
      members: [
        { filename: 'a.dat', offset: 0, storedBytes: 50, reportedUncompressedBytes: 100 },
        { filename: 'b.dat', offset: 2_100_050, storedBytes: 50, reportedUncompressedBytes: 100 }
      ],
      gapObservations: [{
        afterMember: 'a.dat', beforeMember: 'b.dat', sizeBytes: 2_100_000,
        markerMatches: null, firstMarkerAt: null, mostCommonMarkerDistance: null,
        mostCommonDistanceOccurrences: 0, status: 'too_large' as const
      }]
    };
    expect(isSaveInspectionResult(save({ archiveIndex: largeGapArchive, size: 2_100_200 }))).toBe(true);
  });

  it('keeps un-hashed record identity separate from content fingerprints and reads legacy IDs', () => {
    const first = save({ id: 'inspection:' + '1'.repeat(32), sha256: null });
    const second = save({ id: 'inspection:' + '2'.repeat(32), sha256: null });
    expect(isSaveIdentity(toPersistedSaveIdentity(first))).toBe(true);
    expect(isSaveIdentity(toPersistedSaveIdentity(second))).toBe(true);
    expect(first.id).not.toBe(second.id);
    expect(first.sha256).toBe(null);
    expect(second.sha256).toBe(null);
    expect(isSaveIdentity(save({ id: 'career.fm:6:1790000000000', sha256: null }))).toBe(true);
  });

  it('keeps the local inspection catalogue bounded', () => {
    expect(MAX_SAVED_SAVE_INSPECTIONS).toBe(50);
  });
});
