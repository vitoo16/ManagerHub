import { describe, expect, it } from 'vitest';
import { inspectUnindexedGaps } from './archive-gaps';
import type { ArchiveIndex } from './archive';

function fixture(gapSize: number): { file: File; index: ArchiveIndex } {
  const bytes = new Uint8Array(18 + 8 + gapSize + 8 + 100);
  bytes.set([2, 1, 97, 102, 101, 46], 0);
  const marker = [16, 0, 0, 0, 16, 0, 0, 0];
  if (gapSize >= 8) bytes.set(marker, 18 + 8);
  if (gapSize >= 40) {
    bytes.set(marker, 18 + 8 + 16);
    bytes.set(marker, 18 + 8 + 32);
  }
  const index: ArchiveIndex = {
    family: 'fmf-index-candidate', evidence: 'experimental',
    memberCount: 2, directoryOffset: bytes.length - 100,
    members: [
      { filename: 'b.dat', offset: 8 + gapSize, storedBytes: 8, reportedUncompressedBytes: 8 },
      { filename: 'a.dat', offset: 0, storedBytes: 8, reportedUncompressedBytes: 8 }
    ]
  };
  return { file: new File([bytes], 'synthetic.fm'), index };
}

describe('unindexed archive gap diagnostics', () => {
  it('counts markers, distances, and unordered catalogue boundaries', async () => {
    const { file, index } = fixture(48);
    await expect(inspectUnindexedGaps(file, index)).resolves.toEqual([{
      afterMember: 'a.dat', beforeMember: 'b.dat', sizeBytes: 48,
      markerMatches: 3, firstMarkerAt: 0, mostCommonMarkerDistance: 16,
      mostCommonDistanceOccurrences: 2, status: 'sampled'
    }]);
  });

  it('does not inspect unbounded gaps or return member payloads', async () => {
    const { file, index } = fixture(2 * 1024 * 1024 + 1);
    const result = await inspectUnindexedGaps(file, index);
    expect(result).toMatchObject([{ status: 'too_large', markerMatches: null }]);
    expect(result[0]).not.toHaveProperty('payload');
  });

  it('rejects invalid archive boundaries', async () => {
    const { file, index } = fixture(48);
    await expect(inspectUnindexedGaps(file, { ...index, directoryOffset: file.size + 1 })).resolves.toEqual([]);
  });
});
