import { describe, expect, it } from 'vitest';
import { detectSaveFamily, formatBytes, getSignature, inspectSave } from './save';

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
});
