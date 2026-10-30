import { describe, expect, it } from 'vitest';
import type { ArchiveIndex } from './archive';
import { validateMemberCodecCandidates } from './archive-codec';

async function fixture(data: Uint8Array, expectedLength: number): Promise<{ file: File; index: ArchiveIndex }> {
  const start = 18;
  const bytes = new Uint8Array(start + data.length + 32);
  bytes.set([2, 1, 97, 102, 101, 46]);
  bytes.set(data, start);
  const index: ArchiveIndex = {
    family: 'fmf-index-candidate', evidence: 'experimental', memberCount: 1,
    directoryOffset: start + data.length,
    members: [{ filename: 'example.dat', offset: 0, storedBytes: data.length,
      reportedUncompressedBytes: expectedLength }]
  };
  return { file: new File([bytes], 'synthetic.fm'), index };
}

describe('bounded member codec hypothesis trials', () => {
  it('detects an exact synthetic zlib length match at offset 8 without returning bytes', async () => {
    const plain = Uint8Array.from({ length: 120 }, (_, i) => i % 13);
    const compressed = new Uint8Array(await new Response(
      new Blob([plain]).stream().pipeThrough(new CompressionStream('deflate'))
    ).arrayBuffer());
    const wrapped = new Uint8Array(compressed.length + 8);
    wrapped.set([16, 0, 0, 0, 16, 0, 0, 0]);
    wrapped.set(compressed, 8);
    const { file, index } = await fixture(wrapped, plain.length);
    const result = await validateMemberCodecCandidates(file, index);
    expect(result.inspectedMembers).toBe(1);
    expect(result.trials).toContainEqual({
      filename: 'example.dat', codec: 'deflate', skippedBytes: 8,
      result: 'size_match', outputBytes: plain.length
    });
    expect(JSON.stringify(result)).not.toContain('payload');
  });

  it('validates a raw DEFLATE stream after an experimental eight-byte prefix', async () => {
    const plain = Uint8Array.from({ length: 140 }, (_, i) => i % 17);
    const compressed = new Uint8Array(await new Response(
      new Blob([plain]).stream().pipeThrough(new CompressionStream('deflate-raw'))
    ).arrayBuffer());
    const wrapped = new Uint8Array(compressed.length + 8);
    wrapped.set([16, 0, 0, 0, 16, 0, 0, 0]);
    wrapped.set(compressed, 8);
    const { file, index } = await fixture(wrapped, plain.length);
    const result = await validateMemberCodecCandidates(file, index);
    expect(result.trials).toContainEqual({
      filename: 'example.dat', codec: 'deflate-raw', skippedBytes: 8,
      result: 'size_match_unverified_input', outputBytes: plain.length
    });
  });

  it('does not accept zlib with trailing junk as a size-matched candidate', async () => {
    const plain = Uint8Array.from({ length: 64 }, (_, i) => i % 11);
    const compressed = new Uint8Array(await new Response(
      new Blob([plain]).stream().pipeThrough(new CompressionStream('deflate'))
    ).arrayBuffer());
    const withJunk = new Uint8Array(compressed.length + 4);
    withJunk.set(compressed);
    withJunk.set([0xde, 0xad, 0xbe, 0xef], compressed.length);
    const { file, index } = await fixture(withJunk, plain.length);
    const result = await validateMemberCodecCandidates(file, index);
    const trial = result.trials.find(t => t.codec === 'deflate' && t.skippedBytes === 0);
    expect(trial?.result).not.toBe('size_match');
  });

  it('accepts a correctly terminated gzip candidate', async () => {
    const plain = Uint8Array.from({ length: 72 }, (_, i) => i % 9);
    const compressed = new Uint8Array(await new Response(
      new Blob([plain]).stream().pipeThrough(new CompressionStream('gzip'))
    ).arrayBuffer());
    const { file, index } = await fixture(compressed, plain.length);
    const result = await validateMemberCodecCandidates(file, index);
    expect(result.trials).toContainEqual({
      filename: 'example.dat', codec: 'gzip', skippedBytes: 0,
      result: 'size_match', outputBytes: plain.length
    });
  });

  it('treats output beyond two MiB as a limit, not an invalid stream', async () => {
    const huge = new Uint8Array(2 * 1024 * 1024 + 1);
    const compressed = new Uint8Array(await new Response(
      new Blob([huge]).stream().pipeThrough(new CompressionStream('deflate'))
    ).arrayBuffer());
    const { file, index } = await fixture(compressed, 100);
    const result = await validateMemberCodecCandidates(file, index);
    expect(result.trials).toContainEqual({
      filename: 'example.dat', codec: 'deflate', skippedBytes: 0,
      result: 'output_limit_exceeded', outputBytes: null
    });
  });

  it('labels valid but wrong-sized decompression as a mismatch', async () => {
    const plain = Uint8Array.from({ length: 30 }, (_, i) => i);
    const compressed = new Uint8Array(await new Response(
      new Blob([plain]).stream().pipeThrough(new CompressionStream('deflate'))
    ).arrayBuffer());
    const { file, index } = await fixture(compressed, 31);
    const result = await validateMemberCodecCandidates(file, index);
    expect(result.trials).toContainEqual({
      filename: 'example.dat', codec: 'deflate', skippedBytes: 0,
      result: 'size_mismatch', outputBytes: 30
    });
  });

  it('reports malformed input as invalid without any decoded output', async () => {
    const { file, index } = await fixture(Uint8Array.from({ length: 32 }, () => 0xff), 100);
    const result = await validateMemberCodecCandidates(file, index);
    expect(result.trials.length).toBeGreaterThan(0);
    expect(result.trials.every(trial => trial.result === 'invalid_stream' && trial.outputBytes === null)).toBe(true);
  });

  it('skips members beyond bounded trial limits', async () => {
    const { file, index } = await fixture(new Uint8Array(256 * 1024 + 1), 300);
    const result = await validateMemberCodecCandidates(file, index);
    expect(result).toEqual({ inspectedMembers: 0, skippedOversizedMembers: 1, trials: [] });
  });
});
