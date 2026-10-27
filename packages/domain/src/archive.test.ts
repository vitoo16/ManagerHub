import { describe, expect, it } from 'vitest';
import { parseArchiveDirectory } from './archive';

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
});
