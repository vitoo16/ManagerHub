/** Browser-local content binding. No network or raw source persistence. */
export async function localContentSha256(payload: unknown, maximumBytes: number): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  if (bytes.byteLength === 0 || bytes.byteLength > maximumBytes || !globalThis.crypto?.subtle) {
    throw new Error('content_hash_unavailable');
  }
  const hash = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes));
  return Array.from(hash, byte => byte.toString(16).padStart(2, '0')).join('');
}
