import { inspectArchiveIndex, probeMemberEnvelopes } from './archive';
import type { SaveIdentity } from './types';

const MAX_INSPECTION_BYTES = 256 * 1024 * 1024;
const MAX_HASH_BYTES = 64 * 1024 * 1024;

export type SaveFamily = 'afe' | 'fmf' | null;

export function getSignature(bytes: Uint8Array): string {
  return Array.from(bytes.subarray(0, 12), byte => byte.toString(16).padStart(2, '0')).join(' ').toUpperCase();
}

export function detectSaveFamily(bytes: Uint8Array): SaveFamily {
  const magic = Array.from(bytes.subarray(2, 6));
  const header = String.fromCharCode(...magic);
  if (bytes.length >= 6 && header === 'afe.') return 'afe';
  if (bytes.length >= 6 && header === 'fmf.') return 'fmf';
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  const units = ['KB', 'MB', 'GB'];
  let size = bytes / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return size.toFixed(size >= 100 ? 0 : 1) + ' ' + units[unit];
}

export async function inspectSave(file: File): Promise<SaveIdentity> {
  if (!file.name.toLowerCase().endsWith('.fm')) {
    throw new Error('Select a Football Manager .fm save file.');
  }
  if (file.size === 0 || file.size > MAX_INSPECTION_BYTES) {
    throw new Error('File must be between 1 byte and 256 MB for this browser inspection.');
  }
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const family = detectSaveFamily(head);
  let sha256: string | null = null;
  const warnings: string[] = [];
  if (file.size <= MAX_HASH_BYTES && typeof crypto !== 'undefined' && crypto.subtle) {
    const hash = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    sha256 = Array.from(new Uint8Array(hash), n => n.toString(16).padStart(2, '0')).join('');
  } else {
    warnings.push('SHA-256 skipped (file size or browser security context).');
  }
  warnings.push(family
    ? 'Container family detected; player records, edition, CA and PA have NOT been decoded or verified.'
    : 'Unknown binary signature; no game data can be decoded.');
  const detectedArchiveIndex = family === 'afe' ? await inspectArchiveIndex(file) : null;
  const archiveIndex = detectedArchiveIndex
    ? { ...detectedArchiveIndex, probes: await probeMemberEnvelopes(file, detectedArchiveIndex) }
    : null;
  if (archiveIndex) warnings.push('Experimental archive directory catalogue recognized; member contents and game records are NOT decoded.');
  const id = sha256 ?? [file.name, file.size, file.lastModified].join(':');
  return {
    id, name: file.name, importedAt: new Date().toISOString(), lastModified: file.lastModified,
    size: file.size, sha256, signature: getSignature(head), detectedFamily: family,
    edition: null, build: null, support: family ? 'signature_only' : 'unrecognized',
    inspectionStatus: 'inspected', warnings, archiveIndex
  };
}
