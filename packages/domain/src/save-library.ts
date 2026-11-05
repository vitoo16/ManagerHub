import {
  isSafeArchiveIndexMetadata,
  OBSERVED_MEMBER_DATA_BASE_BYTES,
  MAX_UNINDEXED_GAP_OBSERVATIONS,
  MAX_UNINDEXED_GAP_SAMPLE_BYTES,
  MAX_MEMBER_PREFIX_PROBES
} from './archive-metadata';
import type { ArchiveIndex, ArchiveMember, MemberEnvelopeProbe } from './archive';
import { detectSaveFamilyFromSignature } from './save-signature';
import type { UnindexedGapObservation } from './archive-gaps';
import type { PersistedArchiveIndex, SaveIdentity } from './types';

/** Keep only small, user-selected inspection metadata; never persist .fm bytes. */
export const MAX_SAVED_SAVE_INSPECTIONS = 50;
const MAX_INSPECTION_BYTES = 256 * 1024 * 1024;

/** In-memory worker result; unlike SaveIdentity it may carry bounded ephemeral diagnostics. */
export type SaveInspectionResult = Omit<SaveIdentity, 'archiveIndex'> & {
  readonly archiveIndex: ArchiveIndex | null;
};

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
      (sha256 !== null && id !== sha256) ||
      typeof signature !== 'string' || !/^(?:[0-9A-F]{2})(?: [0-9A-F]{2}){0,15}$/.test(signature) ||
      !(detectedFamily === null || detectedFamily === 'afe' || detectedFamily === 'fmf') ||
      !(edition === null || (typeof edition === 'string' && edition.length <= 128)) ||
      !(build === null || (typeof build === 'string' && build.length <= 128)) ||
      !(support === 'signature_only' || support === 'unrecognized') ||
      !(inspectionStatus === 'inspected' || inspectionStatus === 'rejected') ||
      !isDenseArray<string>(warnings, 32) ||
      !warnings.every(warning => typeof warning === 'string' && warning.length <= 1024) ||
      !(archiveIndex === null || isSafeArchiveIndexMetadata(archiveIndex, size))) return false;
  if (detectSaveFamilyFromSignature(signature) !== detectedFamily) return false;
  // Persisted records must never contain short-lived binary-derived diagnostics.
  // isSafeArchiveIndexMetadata intentionally accepts these fields for worker consumers.
  if (archiveIndex !== null &&
      (Object.hasOwn(archiveIndex, 'probes') || Object.hasOwn(archiveIndex, 'gapObservations'))) return false;
  if (archiveIndex !== null && detectedFamily !== 'afe') return false;
  if (detectedFamily === null && support !== 'unrecognized') return false;
  if (detectedFamily !== null && support !== 'signature_only') return false;
  return true;
}

/**
 * Validate unpersisted inspection results from the worker while retaining
 * short-lived bounded archive diagnostics. Unknown keys or binary payloads
 * never enter React state, and the canonical stored schema remains unchanged.
 */
export function isSaveInspectionResult(value: unknown): value is SaveInspectionResult {
  if (!isRecord(value)) return false;
  const index = value.archiveIndex;
  if (index === null) {
    if (!isSaveIdentity(value)) return false;
    return value.sha256 !== null ||
      (typeof value.id === 'string' && /^inspection:[a-f0-9]{32}$/.test(value.id));
  }
  if (!isRecord(index) || !hasOnlyKeys(index, [
    'family', 'evidence', 'memberCount', 'directoryOffset',
    'members', 'nestedGroups', 'probes', 'gapObservations'
  ])) return false;

  const { probes, gapObservations, ...catalogue } = index;
  // The existing persisted validator owns all common record/index rules.
  if (!isSaveIdentity({ ...value, archiveIndex: catalogue }) ||
      value.detectedFamily !== 'afe') return false;
  // New worker results without a content hash must carry a fresh CSPRNG record key.
  // Legacy metadata-derived IDs remain readable through isSaveIdentity for existing IndexedDB rows.
  if (value.sha256 === null &&
      (typeof value.id !== 'string' || !/^inspection:[a-f0-9]{32}$/.test(value.id))) return false;
  const members = catalogue.members as ArchiveMember[];
  const isHexBytes = (input: unknown, size: number): boolean => {
    if (typeof input !== 'string') return false;
    if (size === 0) return input === '';
    const values = input.split(' ');
    return values.length === size && values.every(part => /^[0-9a-f]{2}$/.test(part));
  };

  if (probes !== undefined) {
    if (!isDenseArray<MemberEnvelopeProbe>(probes, MAX_MEMBER_PREFIX_PROBES)) return false;
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
          probe.absoluteOffset !== member.offset + OBSERVED_MEMBER_DATA_BASE_BYTES ||
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
    if (!isDenseArray<UnindexedGapObservation>(gapObservations, MAX_UNINDEXED_GAP_OBSERVATIONS)) return false;
    const orderedMembers = [...members].sort((left, right) => left.offset - right.offset);
    let previousAfterIndex = -1;
    for (const gap of gapObservations) {
      if (!isRecord(gap) || !hasOnlyKeys(gap, [
        'afterMember', 'beforeMember', 'sizeBytes', 'markerMatches',
        'firstMarkerAt', 'mostCommonMarkerDistance',
        'mostCommonDistanceOccurrences', 'status'
      ])) return false;
      if (typeof gap.afterMember !== 'string' || typeof gap.beforeMember !== 'string' ||
          !isSafeNonNegativeInteger(gap.sizeBytes) || gap.sizeBytes < 1 ||
          !isSafeNonNegativeInteger(gap.mostCommonDistanceOccurrences) ||
          (gap.status !== 'sampled' && gap.status !== 'too_large')) return false;

      const afterIndex = orderedMembers.findIndex(member => member.filename === gap.afterMember);
      const beforeIndex = orderedMembers.findIndex(member => member.filename === gap.beforeMember);
      if (afterIndex < 0 || beforeIndex !== afterIndex + 1 || afterIndex <= previousAfterIndex) return false;
      previousAfterIndex = afterIndex;
      const after = orderedMembers[afterIndex]!;
      const before = orderedMembers[beforeIndex]!;
      const expectedGapBytes = before.offset - (after.offset + after.storedBytes);
      if (expectedGapBytes < 1 || gap.sizeBytes !== expectedGapBytes) return false;

      const markerMatches = gap.markerMatches;
      const firstMarkerAt = gap.firstMarkerAt;
      const mostCommonMarkerDistance = gap.mostCommonMarkerDistance;
      if (!(markerMatches === null || isSafeNonNegativeInteger(markerMatches)) ||
          !(firstMarkerAt === null || isSafeNonNegativeInteger(firstMarkerAt)) ||
          !(mostCommonMarkerDistance === null || isSafeNonNegativeInteger(mostCommonMarkerDistance))) return false;
      if (gap.status === 'too_large') {
        if (gap.sizeBytes <= MAX_UNINDEXED_GAP_SAMPLE_BYTES || markerMatches !== null ||
            firstMarkerAt !== null || mostCommonMarkerDistance !== null ||
            gap.mostCommonDistanceOccurrences !== 0) return false;
        continue;
      }

      if (gap.sizeBytes > MAX_UNINDEXED_GAP_SAMPLE_BYTES || markerMatches === null ||
          markerMatches > Math.max(0, gap.sizeBytes - 7)) return false;
      if (markerMatches === 0) {
        if (firstMarkerAt !== null || mostCommonMarkerDistance !== null ||
            gap.mostCommonDistanceOccurrences !== 0) return false;
      } else {
        if (firstMarkerAt === null || firstMarkerAt > gap.sizeBytes - 8) return false;
        if (markerMatches === 1) {
          if (mostCommonMarkerDistance !== null || gap.mostCommonDistanceOccurrences !== 0) return false;
        } else if (mostCommonMarkerDistance === null ||
            mostCommonMarkerDistance < 1 || mostCommonMarkerDistance > gap.sizeBytes - 8 ||
            gap.mostCommonDistanceOccurrences < 1 ||
            gap.mostCommonDistanceOccurrences > markerMatches - 1) return false;
      }
    }
  }
  return true;
}

/**
 * Drop ephemeral binary-derived diagnostics before persisting an inspection.
 * In particular, member-prefix hex samples must never enter IndexedDB.
 * Only the validated directory catalogue and ordinary identity fields survive.
 */
export function toPersistedSaveIdentity(identity: SaveInspectionResult): SaveIdentity {
  const archiveIndex: PersistedArchiveIndex | null = identity.archiveIndex === null ? null : {
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
