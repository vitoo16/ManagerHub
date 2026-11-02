import { describe, it, expect } from 'vitest';
import { decodeFm2013Date } from './fm2013-date';
function bytes(day: number, year: number) {
  const result = new Uint8Array(4), view = new DataView(result.buffer);
  view.setInt16(0, day, true); view.setInt16(2, year, true); return result;
}
describe('conservative FM2013 calendar decoding', () => {
  it('decodes zero-based days and Gregorian leap boundaries', () => {
    expect(decodeFm2013Date(bytes(0, 2012))).toEqual({ status: 'decoded', iso: '2012-01-01' });
    expect(decodeFm2013Date(bytes(59, 2000))).toEqual({ status: 'decoded', iso: '2000-02-29' });
    expect(decodeFm2013Date(bytes(59, 1900))).toEqual({ status: 'decoded', iso: '1900-03-01' });
    expect(decodeFm2013Date(bytes(365, 2012))).toEqual({ status: 'decoded', iso: '2012-12-31' });
  });
  it('rejects sentinels, signed invalid values and out-of-year days without rollover', () => {
    for (const [day, year] of [[0,1000], [0,3000], [-1,2012], [365,2013], [366,2012], [369,2012], [0,-1]]) {
      expect(decodeFm2013Date(bytes(day!, year!))).toEqual({ status: 'unknown', reason: 'invalid_native_date' });
    }
    for (const length of [0,3,5]) expect(decodeFm2013Date(new Uint8Array(length)).status).toBe('unknown');
  });
  it('honors a byte view offset, preserves input and returns immutable evidence-free values', () => {
    const container = new Uint8Array([9,9,...bytes(60,2012),8]); const before = container.slice();
    const result = decodeFm2013Date(container.subarray(2,6));
    expect(result).toEqual({ status: 'decoded', iso: '2012-03-01' });
    expect(container).toEqual(before); expect(Object.isFrozen(result)).toBe(true);
    expect(result).not.toHaveProperty('verified');
  });
});
