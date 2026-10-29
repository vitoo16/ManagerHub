import { describe, expect, it } from 'vitest';
import { inspectArchiveIndex, parseArchiveDirectory } from './archive';

interface FixtureMember {
  filename: string;
  offset: number;
  storedBytes: number;
  reportedUncompressedBytes: number;
}

function encodeDirectory(members: readonly FixtureMember[]) {
  const data: number[] = [];
  const number = (n: number) => data.push(n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255);
  const name = (s: string) => {
    number(s.length);
    for (const c of s) data.push(c.charCodeAt(0), 0);
    data.push(0, 0);
  };
  number(0); number(members.length);
  for (const member of members) {
    const dot = member.filename.lastIndexOf('.');
    name(member.filename.slice(0, dot));
    name(member.filename.slice(dot));
    number(member.offset);
    number(member.storedBytes);
    number(member.reportedUncompressedBytes);
  }
  return Uint8Array.from(data);
}

function syntheticIndex() {
  return encodeDirectory([{
    filename: 'game_info.dat', offset: 0, storedBytes: 128, reportedUncompressedBytes: 256
  }]);
}

describe('bounded AFE/FM directory catalogue parser', () => {
  it('extracts only member metadata from valid index', () => {
    expect(parseArchiveDirectory(syntheticIndex(), 1000)).toEqual([
      { filename: 'game_info.dat', offset: 0, storedBytes: 128, reportedUncompressedBytes: 256 }
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

  it('returns null rather than throwing on malformed UTF-16 member names', () => {
    const malformed = syntheticIndex();
    malformed[12] = 0x00;
    malformed[13] = 0xd8; // Unpaired high surrogate in the first member name.
    expect(parseArchiveDirectory(malformed, 1000)).toBeNull();
  });

  it('finds and inflates a bounded trailing index without needing the source save bytes', async () => {
    // Representative extents observed in a private AFE-family save. The original
    // save is not committed; synthetic bounded records fill out the 69-entry shape.
    const members: FixtureMember[] = [
      { filename: 'game_info.dat', offset: 0, storedBytes: 2702, reportedUncompressedBytes: 2651 },
      { filename: 'save_game_summary.dat', offset: 2702, storedBytes: 141, reportedUncompressedBytes: 170 },
      { filename: 'game_db.dat', offset: 2843, storedBytes: 22_282_254, reportedUncompressedBytes: 88_272_180 },
      { filename: 'tactics_man.dat', offset: 24_965_249, storedBytes: 131_060, reportedUncompressedBytes: 1_994_648 },
      { filename: 'tc_league_history_id.cmt', offset: 29_299_014, storedBytes: 11_339, reportedUncompressedBytes: 23_001 }
    ];
    while (members.length < 69) {
      const index = members.length;
      members.push({
        filename: `fixture_${index}.dat`,
        offset: 22_285_100 + (index - 5) * 100,
        storedBytes: 50,
        reportedUncompressedBytes: 75
      });
    }

    const directory = encodeDirectory(members);
    const directoryBuffer = directory.slice().buffer as ArrayBuffer;
    const stream = new Blob([directoryBuffer]).stream().pipeThrough(new CompressionStream('deflate'));
    const compressed = new Uint8Array(await new Response(stream).arrayBuffer());

    const directoryPosition = 29_310_371;
    const fileSize = directoryPosition + 9 + compressed.byteLength;
    const tailStart = fileSize - 64 * 1024;
    const tail = new Uint8Array(64 * 1024);
    const markerOffset = directoryPosition - tailStart;
    tail.set([2, 1, 102, 109, 102, 46, 4, 0, 0], markerOffset);
    tail.set(compressed, markerOffset + 9);

    const fileLike = {
      size: fileSize,
      slice(start = 0) {
        if (start === tailStart) return new Blob([tail.slice().buffer as ArrayBuffer]);
        if (start === directoryPosition + 9) return new Blob([compressed.slice().buffer as ArrayBuffer]);
        throw new Error(`Unexpected slice offset: ${start}`);
      }
    } as unknown as File;

    const result = await inspectArchiveIndex(fileLike);
    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      family: 'fmf-index-candidate',
      evidence: 'experimental',
      memberCount: 69,
      directoryOffset: directoryPosition,
      members: expect.arrayContaining([
        { filename: 'game_info.dat', offset: 0, storedBytes: 2702, reportedUncompressedBytes: 2651 },
        { filename: 'game_db.dat', offset: 2843, storedBytes: 22_282_254, reportedUncompressedBytes: 88_272_180 },
        { filename: 'tactics_man.dat', offset: 24_965_249, storedBytes: 131_060, reportedUncompressedBytes: 1_994_648 },
        { filename: 'tc_league_history_id.cmt', offset: 29_299_014, storedBytes: 11_339, reportedUncompressedBytes: 23_001 }
      ])
    });
  });
});
