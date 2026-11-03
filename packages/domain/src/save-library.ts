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
  if (!isRecord(value) || !hasOnlyKeys(value, ['family', 'evidence', 'memberCount', 'directoryOffset', 'members', 'nestedGroups']) ||
      value.family !== 'fmf-index-candidate' || value.evidence !== 'experimental') return false;
  const { memberCount, directoryOffset, members, nestedGroups } = value;
  if (!isSafeNonNegativeInteger(directoryOffset) || !isSafeNonNegativeInteger(memberCount) ||
      memberCount < 1 || memberCount > MAX_ARCHIVE_MEMBERS || !Array.isArray(members) ||
      members.length !== memberCount) return false;
  if (!members.every(member => isArchiveMember(member, directoryOffset))) return false;
  if (nestedGroups !== undefined) {
    if (!Array.isArray(nestedGroups) || nestedGroups.length > 16 ||
        !nestedGroups.every(group => isRecord(group) &&
          hasOnlyKeys(group, ['name', 'memberCount']) &&
          typeof group.name === 'string' && group.name.length > 0 && group.name.length <= 256 &&
          isSafeNonNegativeInteger(group.memberCount) && group.memberCount > 0)) return false;
    const nestedTotal = nestedGroups.reduce((sum, group) => sum + group.memberCount, 0);
    if (nestedTotal >= memberCount) return false;
  }
  const filenames = new Set<string>();
  for (const member of members as ArchiveMember[]) {
    if (filenames.has(member.filename)) return false;
    filenames.add(member.filename);
  }
  const ordered = [...members as ArchiveMember[]].sort((a, b) => a.offset - b.offset);
  return ordered.every((member, i) => i === 0 ||
    (ordered[i - 1]!.offset + ordered[i - 1]!.storedBytes <= member.offset));
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
 * Validate unpersisted inspection results from the worker while retaining
 * short-lived bounded archive diagnostics. Unknown keys or binary payloads
 * never enter React state, and the canonical stored schema remains unchanged.
 */
export function isSaveInspectionResult(value: unknown): value is SaveIdentity {
  if (!isRecord(value)) return false;
  const index = value.archiveIndex;
  if (index === null) return isSaveIdentity(value);
  if (!isRecord(index) || !hasOnlyKeys(index, [
    'family', 'evidence', 'memberCount', 'directoryOffset',
    'members', 'nestedGroups', 'probes', 'gapObservations'
  ])) return false;

  const { probes, gapObservations, ...catalogue } = index;
  // The existing persisted validator owns all common record/index rules.
  if (!isSaveIdentity({ ...value, archiveIndex: catalogue }) ||
      value.detectedFamily !== 'afe') return false;
  const members = catalogue.members as ArchiveMember[];
  const isHexBytes = (input: unknown, size: number): boolean => {
    if (typeof input !== 'string') return false;
    if (size === 0) return input === '';
    const values = input.split(' ');
    return values.length === size && values.every(part => /^[0-9a-f]{2}$/.test(part));
  };

  if (probes !== undefined) {
    if (!Array.isArray(probes) || probes.length > 32) return false;
    const allowedKinds = ['zlib_candidate', 'gzip', 'zip', 'json_text', 'unknown'];
    for (const probe of probes) {
      if (!isRecord(probe) || !hasOnlyKeys(probe, [
        'filename', 'absoluteOffset', 'sampleBytes', 'prefixHex', 'prefixKind',
        'afterFirstEightBytesHex', 'afterFirstEightBytesKind', 'storedBytes',
        'reportedUncompressedBytes'
      ])) return false;
      const member = members.find(item => item.filename === probe.filename);
      if (!member || probe.storedBytes !== member.storedBytes ||
          probe.reportedUncompressedBytes !== member.reportedUncompressedBytes ||
          !isSafeNonNegativeInteger(probe.absoluteOffset) ||
          probe.absoluteOffset !== member.offset + 18 ||
          !isSafeNonNegativeInteger(probe.sampleBytes) ||
          probe.sampleBytes < 1 || probe.sampleBytes > 16 ||
          probe.sampleBytes > member.storedBytes ||
          !isHexBytes(probe.prefixHex, probe.sampleBytes) ||
          !isHexBytes(probe.afterFirstEightBytesHex, Math.max(0, probe.sampleBytes - 8)) ||
          !allowedKinds.includes(String(probe.prefixKind)) ||
          !allowedKinds.includes(String(probe.afterFirstEightBytesKind))) return false;
    }
  }

  if (gapObservations !== undefined) {
    if (!Array.isArray(gapObservations) || gapObservations.length > 8) return false;
    for (const gap of gapObservations) {
      if (!isRecord(gap) || !hasOnlyKeys(gap, [
        'afterMember', 'beforeMember', 'sizeBytes', 'markerMatches',
        'firstMarkerAt', 'mostCommonMarkerDistance',
        'mostCommonDistanceOccurrences', 'status'
      ])) return false;
      if (typeof gap.afterMember !== 'string' || typeof gap.beforeMember !== 'string' ||
          !members.some(item => item.filename === gap.afterMember) ||
          !members.some(item => item.filename === gap.beforeMember) ||
          !isSafeNonNegativeInteger(gap.sizeBytes) || gap.sizeBytes < 1 ||
          !isSafeNonNegativeInteger(gap.mostCommonDistanceOccurrences) ||
          (gap.status !== 'sampled' && gap.status !== 'too_large')) return false;
      for (const key of ['markerMatches', 'firstMarkerAt', 'mostCommonMarkerDistance'] as const) {
        const number = gap[key];
        if (number !== null && !isSafeNonNegativeInteger(number)) return false;
      }
      if (gap.status === 'too_large' && (gap.markerMatches !== null ||
          gap.firstMarkerAt !== null || gap.mostCommonMarkerDistance !== null)) return false;
      if (gap.status === 'sampled' && gap.markerMatches === null) return false;
    }
  }
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
    ...(identity.archiveIndex.nestedGroups ? { nestedGroups: identity.archiveIndex.nestedGroups.map(group => ({ name: group.name, memberCount: group.memberCount })) } : {}),
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
