import type { ArchiveIndex, ArchiveMember } from './archive';

/** Lightweight archive metadata shared by parsing, diagnostics and persistence. */
export const OBSERVED_MEMBER_DATA_BASE_BYTES = 18;
export const MAX_ARCHIVE_MEMBERS = 1024;
export const MAX_ARCHIVE_GROUPS = 16;
export const MAX_ARCHIVE_COMPONENT_NAME_CHARS = 256;
export const MAX_ARCHIVE_FILENAME_CHARS = MAX_ARCHIVE_COMPONENT_NAME_CHARS * 2;
export const MAX_MEMBER_PREFIX_PROBES = 32;
export const MAX_UNINDEXED_GAP_OBSERVATIONS = 8;
export const MAX_UNINDEXED_GAP_SAMPLE_BYTES = 2 * 1024 * 1024;

export type ArchiveIndexMetadata = Pick<ArchiveIndex,
  'family' | 'evidence' | 'memberCount' | 'directoryOffset' | 'members' | 'nestedGroups'>;

export function isSafeArchiveLabel(value: unknown, maxLength: number): value is string {
  if (typeof value !== 'string' || !Number.isSafeInteger(maxLength) ||
      maxLength < 1 || value.length < 1 || value.length > maxLength) return false;
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f) || character === '/' || character === '\\') return false;
  }
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every(key => allowed.includes(key));
}

function isDenseArray<T>(value: unknown, maxLength: number): value is T[] {
  if (!Array.isArray(value) || value.length > maxLength) return false;
  for (let index = 0; index < value.length; index++) {
    if (!Object.hasOwn(value, index)) return false;
  }
  return true;
}

function isSafeNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isArchiveMember(value: unknown, memberDataBoundary: number): value is ArchiveMember {
  if (!isRecord(value) ||
      !hasOnlyKeys(value, ['filename', 'offset', 'storedBytes', 'reportedUncompressedBytes'])) return false;
  const { filename, offset, storedBytes, reportedUncompressedBytes } = value;
  return isSafeArchiveLabel(filename, MAX_ARCHIVE_FILENAME_CHARS) &&
    isSafeNonNegativeInteger(offset) && isSafeNonNegativeInteger(storedBytes) && storedBytes > 0 &&
    isSafeNonNegativeInteger(reportedUncompressedBytes) && reportedUncompressedBytes > 0 &&
    reportedUncompressedBytes <= 0xffff_ffff &&
    offset <= memberDataBoundary && storedBytes <= memberDataBoundary - offset;
}

/**
 * Validate the shared structural catalogue contract at every consumer boundary.
 * Ephemeral probe/gap properties are allowed here, but persisted schemas must
 * reject them separately before writing to IndexedDB.
 */
export function isSafeArchiveIndexMetadata(value: unknown, fileSize: number): value is ArchiveIndexMetadata {
  if (!isSafeNonNegativeInteger(fileSize) || fileSize < 1 || !isRecord(value) ||
      !hasOnlyKeys(value, [
        'family', 'evidence', 'memberCount', 'directoryOffset', 'members', 'nestedGroups',
        'probes', 'gapObservations'
      ]) || value.family !== 'fmf-index-candidate' || value.evidence !== 'experimental') return false;

  const { memberCount, directoryOffset, members, nestedGroups } = value;
  if ((Object.hasOwn(value, 'nestedGroups') && nestedGroups === undefined) ||
      (Object.hasOwn(value, 'probes') && value.probes === undefined) ||
      (Object.hasOwn(value, 'gapObservations') && value.gapObservations === undefined)) return false;
  if (!isSafeNonNegativeInteger(directoryOffset) ||
      directoryOffset <= OBSERVED_MEMBER_DATA_BASE_BYTES || directoryOffset > fileSize ||
      !isSafeNonNegativeInteger(memberCount) || memberCount < 1 || memberCount > MAX_ARCHIVE_MEMBERS ||
      !isDenseArray<ArchiveMember>(members, MAX_ARCHIVE_MEMBERS) || members.length !== memberCount) return false;

  const memberDataBoundary = directoryOffset - OBSERVED_MEMBER_DATA_BASE_BYTES;
  if (!members.every(member => isArchiveMember(member, memberDataBoundary))) return false;

  if (nestedGroups !== undefined) {
    if (!isDenseArray<{ readonly name: string; readonly memberCount: number }>(nestedGroups, MAX_ARCHIVE_GROUPS)) return false;
    let nestedTotal = 0;
    for (const group of nestedGroups) {
      if (!isRecord(group) || !hasOnlyKeys(group, ['name', 'memberCount']) ||
          !isSafeArchiveLabel(group.name, MAX_ARCHIVE_COMPONENT_NAME_CHARS) || !isSafeNonNegativeInteger(group.memberCount) ||
          group.memberCount < 1 || group.memberCount > MAX_ARCHIVE_MEMBERS - nestedTotal) return false;
      nestedTotal += group.memberCount;
    }
    if (nestedTotal >= memberCount) return false;
  }

  const filenames = new Set<string>();
  for (const member of members) {
    if (filenames.has(member.filename)) return false;
    filenames.add(member.filename);
  }
  const ordered = [...members].sort((a, b) => a.offset - b.offset);
  return ordered.every((member, index) => index === 0 ||
    ordered[index - 1]!.offset + ordered[index - 1]!.storedBytes <= member.offset);
}
