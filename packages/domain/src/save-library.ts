import type { ArchiveIndex, ArchiveMember } from './archive';
import type { SaveIdentity } from './types';

/** Keep only small, user-selected inspection metadata; never persist .fm bytes. */
export const MAX_SAVED_SAVE_INSPECTIONS = 50;
const MAX_INSPECTION_BYTES = 256 * 1024 * 1024;
const MAX_ARCHIVE_MEMBERS = 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every(key => allowed.includes(key));
}

function isSafeNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isArchiveMember(value: unknown, directoryOffset: number): value is ArchiveMember {
  if (!isRecord(value) || !hasOnlyKeys(value, ['filename', 'offset', 'storedBytes', 'reportedUncompressedBytes'])) return false;
  const { filename, offset, storedBytes, reportedUncompressedBytes } = value;
  return typeof filename === 'string' && filename.length >= 1 && filename.length <= 512 &&
    isSafeNonNegativeInteger(offset) && isSafeNonNegativeInteger(storedBytes) && storedBytes > 0 &&
    isSafeNonNegativeInteger(reportedUncompressedBytes) && reportedUncompressedBytes > 0 &&
    offset <= directoryOffset && storedBytes <= directoryOffset - offset;
}

function isArchiveIndex(value: unknown): value is ArchiveIndex {
  if (!isRecord(value) || !hasOnlyKeys(value, ['family', 'evidence', 'memberCount', 'directoryOffset', 'members']) ||
      value.family !== 'fmf-index-candidate' || value.evidence !== 'experimental') return false;
  const { memberCount, directoryOffset, members } = value;
  if (!isSafeNonNegativeInteger(directoryOffset) || !isSafeNonNegativeInteger(memberCount) ||
      memberCount < 1 || memberCount > MAX_ARCHIVE_MEMBERS || !Array.isArray(members) ||
      members.length !== memberCount) return false;
  return members.every(member => isArchiveMember(member, directoryOffset));
}

/** Validate IndexedDB data at the persistence boundary before trusting it in UI state. */
export function isSaveIdentity(value: unknown): value is SaveIdentity {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    'id', 'name', 'importedAt', 'lastModified', 'size', 'sha256', 'signature', 'detectedFamily',
    'edition', 'build', 'support', 'inspectionStatus', 'warnings', 'archiveIndex'
  ])) return false;
  const {
    id, name, importedAt, lastModified, size, sha256, signature, detectedFamily,
    edition, build, support, inspectionStatus, warnings, archiveIndex
  } = value;
  if (typeof id !== 'string' || id.length < 1 || id.length > 1024 ||
      typeof name !== 'string' || name.length < 1 || name.length > 1024 ||
      typeof importedAt !== 'string' || !Number.isFinite(Date.parse(importedAt)) ||
      !isSafeNonNegativeInteger(lastModified) || !isSafeNonNegativeInteger(size) ||
      size < 1 || size > MAX_INSPECTION_BYTES ||
      !(sha256 === null || (typeof sha256 === 'string' && /^[a-f0-9]{64}$/.test(sha256))) ||
      typeof signature !== 'string' || !/^(?:[0-9A-F]{2})(?: [0-9A-F]{2}){0,15}$/.test(signature) ||
      !(detectedFamily === null || detectedFamily === 'afe' || detectedFamily === 'fmf') ||
      !(edition === null || (typeof edition === 'string' && edition.length <= 128)) ||
      !(build === null || (typeof build === 'string' && build.length <= 128)) ||
      !(support === 'signature_only' || support === 'unrecognized') ||
      !(inspectionStatus === 'inspected' || inspectionStatus === 'rejected') ||
      !Array.isArray(warnings) || warnings.length > 32 ||
      !warnings.every(warning => typeof warning === 'string' && warning.length <= 1024) ||
      !(archiveIndex === null || isArchiveIndex(archiveIndex))) return false;
  if (detectedFamily === null && support !== 'unrecognized') return false;
  if (detectedFamily !== null && support !== 'signature_only') return false;
  return true;
}

/**
 * Drop ephemeral binary-derived diagnostics before persisting an inspection.
 * In particular, member-prefix hex samples must never enter IndexedDB.
 * Only the validated directory catalogue and ordinary identity fields survive.
 */
export function toPersistedSaveIdentity(identity: SaveIdentity): SaveIdentity {
  const archiveIndex: ArchiveIndex | null = identity.archiveIndex === null ? null : {
    family: identity.archiveIndex.family,
    evidence: identity.archiveIndex.evidence,
    memberCount: identity.archiveIndex.memberCount,
    directoryOffset: identity.archiveIndex.directoryOffset,
    members: identity.archiveIndex.members.map(member => ({
      filename: member.filename,
      offset: member.offset,
      storedBytes: member.storedBytes,
      reportedUncompressedBytes: member.reportedUncompressedBytes
    }))
  };
  return {
    id: identity.id,
    name: identity.name,
    importedAt: identity.importedAt,
    lastModified: identity.lastModified,
    size: identity.size,
    sha256: identity.sha256,
    signature: identity.signature,
    detectedFamily: identity.detectedFamily,
    edition: identity.edition,
    build: identity.build,
    support: identity.support,
    inspectionStatus: identity.inspectionStatus,
    warnings: [...identity.warnings],
    archiveIndex
  };
}
