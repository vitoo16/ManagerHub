import type { ArchiveIndex } from './archive';
import {
  isSafeArchiveIndexMetadata,
  OBSERVED_MEMBER_DATA_BASE_BYTES,
  MAX_UNINDEXED_GAP_OBSERVATIONS,
  MAX_UNINDEXED_GAP_SAMPLE_BYTES
} from './archive-metadata';

/**
 * Experimental AFE diagnostics: inspect only gaps BETWEEN indexed members.
 * This does not decode member payloads, infer records, or retain file bytes.
 */
const SECTION_PATTERN = Uint8Array.from([16, 0, 0, 0, 16, 0, 0, 0]);

export interface UnindexedGapObservation {
  readonly afterMember: string;
  readonly beforeMember: string;
  readonly sizeBytes: number;
  readonly markerMatches: number | null;
  readonly firstMarkerAt: number | null;
  readonly mostCommonMarkerDistance: number | null;
  readonly mostCommonDistanceOccurrences: number;
  readonly status: 'sampled' | 'too_large';
}

export async function inspectUnindexedGaps(
  file: File,
  index: ArchiveIndex
): Promise<readonly UnindexedGapObservation[]> {
  if (!file || !Number.isSafeInteger(file.size) ||
      !isSafeArchiveIndexMetadata(index, file.size)) return [];
  const ordered = [...index.members].sort((a, b) => a.offset - b.offset);
  const gaps: UnindexedGapObservation[] = [];
  for (let i = 1; i < ordered.length && gaps.length < MAX_UNINDEXED_GAP_OBSERVATIONS; i++) {
    const previous = ordered[i - 1];
    const next = ordered[i];
    if (!previous || !next) continue;
    const relativeStart = previous.offset + previous.storedBytes;
    const sizeBytes = next.offset - relativeStart;
    if (sizeBytes <= 0) continue;
    const base = { afterMember: previous.filename, beforeMember: next.filename, sizeBytes };
    if (sizeBytes > MAX_UNINDEXED_GAP_SAMPLE_BYTES) {
      gaps.push({ ...base, status: 'too_large', markerMatches: null, firstMarkerAt: null,
        mostCommonMarkerDistance: null, mostCommonDistanceOccurrences: 0 });
      continue;
    }
    const start = OBSERVED_MEMBER_DATA_BASE_BYTES + relativeStart;
    const bytes = new Uint8Array(await file.slice(start, start + sizeBytes).arrayBuffer());
    let markerMatches = 0;
    let firstMarkerAt: number | null = null;
    let priorMatch: number | null = null;
    const distances = new Map<number, number>();
    for (let offset = 0; offset <= bytes.length - SECTION_PATTERN.length; offset++) {
      let match = true;
      for (let j = 0; j < SECTION_PATTERN.length; j++) {
        if (bytes[offset + j] !== SECTION_PATTERN[j]) { match = false; break; }
      }
      if (!match) continue;
      markerMatches++;
      if (firstMarkerAt === null) firstMarkerAt = offset;
      if (priorMatch !== null) {
        const distance = offset - priorMatch;
        distances.set(distance, (distances.get(distance) ?? 0) + 1);
      }
      priorMatch = offset;
    }
    let mostCommonMarkerDistance: number | null = null;
    let mostCommonDistanceOccurrences = 0;
    for (const [distance, count] of distances) {
      if (count > mostCommonDistanceOccurrences ||
        (count === mostCommonDistanceOccurrences && (mostCommonMarkerDistance === null || distance < mostCommonMarkerDistance))) {
        mostCommonMarkerDistance = distance;
        mostCommonDistanceOccurrences = count;
      }
    }
    gaps.push({ ...base, status: 'sampled', markerMatches, firstMarkerAt,
      mostCommonMarkerDistance, mostCommonDistanceOccurrences });
  }
  return gaps;
}
