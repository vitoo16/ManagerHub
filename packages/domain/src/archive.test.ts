import { deflateSync } from 'node:zlib';
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
});


describe('bounded archive index inspection', () => {
  it('finds a deflated trailing index candidate end-to-end without decoding members', async () => {
    const prefix = new Uint8Array(256);
    prefix.set([2, 1, 97, 102, 101, 46]);
    const marker = Uint8Array.from([2, 1, 102, 109, 102, 46, 4, 0, 0]);
    const compressed = Uint8Array.from(deflateSync(syntheticIndex()));
    const file = new File([prefix, marker, compressed], 'synthetic-career.fm');

    const result = await inspectArchiveIndex(file);
    expect(result).toMatchObject({
      family: 'fmf-index-candidate',
      evidence: 'experimental',
      memberCount: 1,
      directoryOffset: 256,
      members: [{ filename: 'game_info.dat', offset: 0, storedBytes: 128, reportedUncompressedBytes: 256 }]
    });
  });

  it('treats a matching marker with invalid compressed data as an unsupported candidate', async () => {
    const prefix = new Uint8Array(128);
    prefix.set([2, 1, 97, 102, 101, 46]);
    const marker = Uint8Array.from([2, 1, 102, 109, 102, 46, 4, 0, 0]);
    const file = new File([prefix, marker, Uint8Array.from([0x78, 0x00, 0x01, 0x02])], 'malformed.fm');
    await expect(inspectArchiveIndex(file)).resolves.toBeNull();
  });
});
