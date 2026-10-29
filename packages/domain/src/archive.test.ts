import { describe, expect, it } from 'vitest';
import { inspectArchiveIndex, parseArchiveDirectory } from './archive';

function syntheticIndex() {
  const data: number[] = [];
  const number = (n: number) => data.push(n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255);
  const name = (s: string) => {
    number(s.length);
    for (const c of s) data.push(c.charCodeAt(0), 0);
    data.push(0, 0);
  };
  number(0); number(1);
  name('game_info'); name('.dat');
  number(0); number(128); number(256);
  return Uint8Array.from(data);
}
describe('bounded AFE/FM directory catalogue parser', () => {
  it('extracts only member metadata from valid index', () => {
    expect(parseArchiveDirectory(syntheticIndex(), 1000)).toEqual([
      {filename: 'game_info.dat', offset: 0, storedBytes: 128, reportedUncompressedBytes: 256}
    ]);
  });
  it('rejects member extents past the archive boundary', () => {
    expect(parseArchiveDirectory(syntheticIndex(), 64)).toBeNull();
  });
  it('rejects truncated directory data', () => {
    expect(parseArchiveDirectory(syntheticIndex().subarray(0, 16), 1000)).toBeNull();
  });
  it('rejects impossible number of entries', () => {
    const wrong = syntheticIndex();
    wrong[4] = 0xff; wrong[5] = 0xff;
    expect(parseArchiveDirectory(wrong, 1000)).toBeNull();
  });

  it('recognizes a bounded trailing FMF directory in a realistic save-shaped file', async () => {
    // A compact zlib-compressed directory fixture mirrors the real save's
    // trailing marker and UTF-16LE names without bundling any game-save bytes.
    const markerAndDirectory = Uint8Array.from([
      2, 1, 102, 109, 102, 46, 4, 0, 0,
      120, 156, 99, 96, 96, 96, 96, 2, 98, 78, 32, 78, 103, 72, 100, 200,
      101, 72, 101, 136, 103, 200, 100, 200, 99, 72, 99, 200, 7, 138, 177,
      0, 177, 30, 67, 10, 80, 166, 132, 1, 2, 26, 64, 4, 35, 3, 3, 59,
      138, 142, 20, 134, 36, 12, 213, 96, 149, 76, 16, 97, 0, 49, 181, 10, 84
    ]);
    const prefix = new Uint8Array(1024);
    const bytes = new Uint8Array(prefix.length + markerAndDirectory.length);
    bytes.set(prefix);
    bytes.set(markerAndDirectory, prefix.length);
    const file = new File([bytes], 'synthetic-career.fm');
    const index = await inspectArchiveIndex(file);
    expect(index).toMatchObject({
      family: 'fmf-index-candidate',
      evidence: 'experimental',
      memberCount: 2,
      directoryOffset: 1024,
      members: [
        { filename: 'game_info.dat', offset: 0, storedBytes: 128, reportedUncompressedBytes: 256 },
        { filename: 'game_db.dat', offset: 128, storedBytes: 512, reportedUncompressedBytes: 1024 }
      ]
    });
  });

  it('ignores malformed trailing FMF markers instead of failing inspection', async () => {
    const bytes = Uint8Array.from([1, 2, 3, 2, 1, 102, 109, 102, 46, 4, 0, 0, 120, 0, 1, 2, 3]);
    const file = new File([bytes], 'malformed-career.fm');
    await expect(inspectArchiveIndex(file)).resolves.toBeNull();
  });
});
