import { afterEach, describe, expect, it, vi } from 'vitest';
import { detectSaveFamily, formatBytes, getSignature, inspectSave } from './save';

afterEach(() => vi.unstubAllGlobals());

describe('FM file sniffing is explicit and read-only', () => {
  it('recognizes the observed AFE header, without claiming game edition', () => {
    expect(detectSaveFamily(new Uint8Array([2, 1, 97, 102, 101, 46]))).toBe('afe');
  });
  it('recognizes the FMF header, not all extensions', () => {
    expect(detectSaveFamily(new Uint8Array([2, 1, 102, 109, 102, 46]))).toBe('fmf');
    expect(detectSaveFamily(new Uint8Array([1, 2, 3, 4]))).toBe(null);
  });
  it('prints bounded diagnostic formatting', () => {
    expect(getSignature(new Uint8Array([2, 1, 97]))).toBe('02 01 61');
    expect(formatBytes(2048)).toBe('2.0 KB');
  });
  it('refuses to inspect non-save files', async () => {
    const file = new File(['not an FM save'], 'notes.txt');
    await expect(inspectSave(file)).rejects.toThrow('.fm');
  });
  it('never claims to have decoded players from a known signature', async () => {
    const file = new File([new Uint8Array([2, 1, 97, 102, 101, 46])], 'career.fm');
    const result = await inspectSave(file);
    expect(result.detectedFamily).toBe('afe');
    expect(result.edition).toBe(null);
    expect(result.support).toBe('signature_only');
    expect(result.warnings.some(s => s.includes('NOT been decoded'))).toBe(true);
  });
  it('uses an actual SHA-256 fingerprint for deterministic content identity when hashing is available', async () => {
    const digest = new Uint8Array(32).fill(0xab);
    const subtleDigest = vi.fn(async () => digest.buffer);
    vi.stubGlobal('crypto', { subtle: { digest: subtleDigest } });
    const file = new File(['known input'], 'career.fm', { lastModified: 1234 });
    const first = await inspectSave(file);
    const second = await inspectSave(file);
    expect(first.sha256).toBe('ab'.repeat(32));
    expect(first.id).toBe(first.sha256);
    expect(second.id).toBe(first.id);
    expect(subtleDigest).toHaveBeenCalledTimes(2);
  });

  it('uses independent record IDs when SHA-256 is unavailable even for matching file metadata', async () => {
    let nextByte = 0;
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => bytes.fill(++nextByte)
    });
    const fileA = new File(['data-a'], 'same.fm', { lastModified: 1234 });
    const fileB = new File(['data-b'], 'same.fm', { lastModified: 1234 });
    const a = await inspectSave(fileA);
    const b = await inspectSave(fileB);
    expect(a.size).toBe(b.size);
    expect(a.lastModified).toBe(b.lastModified);
    expect(a.sha256).toBe(null);
    expect(b.sha256).toBe(null);
    expect(a.id).toMatch(/^inspection:[0-9a-f]{32}$/);
    expect(b.id).toMatch(/^inspection:[0-9a-f]{32}$/);
    expect(a.id).not.toBe(b.id);
    expect(a.id).not.toBe('same.fm:6:1234');
  });

  it('never reads an entire large file merely to assign its un-hashed record ID', async () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => bytes.fill(0xcd)
    });
    const file = new File(['some unrecognized bytes'], 'large.fm', { lastModified: 1234 });
    Object.defineProperty(file, 'size', { value: 64 * 1024 * 1024 + 1 });
    const readWholeFile = vi.spyOn(file, 'arrayBuffer');
    const identity = await inspectSave(file);
    expect(identity.id).toBe('inspection:' + 'cd'.repeat(16));
    expect(identity.sha256).toBe(null);
    expect(readWholeFile).not.toHaveBeenCalled();
  });

  it('fails closed instead of reusing a filename/size/date key when no secure random source exists', async () => {
    vi.stubGlobal('crypto', {});
    const file = new File(['some bytes'], 'career.fm');
    await expect(inspectSave(file)).rejects.toThrow('Cryptographic random IDs are unavailable');
  });

});
