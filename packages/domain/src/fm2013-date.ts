export type Fm2013DateResult =
  | { readonly status: 'decoded'; readonly iso: string }
  | { readonly status: 'unknown'; readonly reason: 'invalid_native_date' };

/** Conservative calendar subset of the exact FM2013 date representation.
 * Rejects the reference tool's fallback/same-year overflow behavior.
 * Decoding bytes alone does not verify the source field or career.
 */
export function decodeFm2013Date(bytes: Uint8Array): Fm2013DateResult {
  const unknown: Fm2013DateResult = Object.freeze({ status: 'unknown', reason: 'invalid_native_date' });
  if (bytes.length !== 4) return unknown;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const dayIndex = view.getInt16(0, true), year = view.getInt16(2, true);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  if (year <= 1000 || year >= 3000 || dayIndex < 0 || dayIndex >= (leap ? 366 : 365)) return unknown;
  const date = new Date(Date.UTC(year, 0, dayIndex + 1));
  return Object.freeze({ status: 'decoded', iso: date.toISOString().slice(0, 10) });
}
