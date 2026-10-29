import type { ArchiveIndex } from './archive';

/**
 * Experimental AFE diagnostics: inspect only gaps BETWEEN indexed members.
 * This does not decode member payloads, infer records, or retain file bytes.
 */
const OBSERVED_MEMBER_BASE = 18;
const MAX_GAPS = 8;
const MAX_GAP_BYTES = 2 * 1024 * 1024;
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
  if (!Number.isSafeInteger(index.directoryOffset) ||
      index.directoryOffset > file.size || index.directoryOffset <= OBSERVED_MEMBER_BASE) return [];
  const boundary = index.directoryOffset - OBSERVED_MEMBER_BASE;
  const ordered = [...index.members].sort((a, b) => a.offset - b.offset);
  const gaps: UnindexedGapObservation[] = [];
  for (let i = 1; i < ordered.length && gaps.length < MAX_GAPS; i++) {
    const previous = ordered[i - 1];
    const next = ordered[i];
    if (!previous || !next ||
      !Number.isSafeInteger(previous.offset) || !Number.isSafeInteger(previous.storedBytes) ||
      !Number.isSafeInteger(next.offset) || !Number.isSafeInteger(next.storedBytes) ||
      previous.offset < 0 || previous.storedBytes < 1 || next.offset < 0 || next.storedBytes < 1 ||
      previous.offset > boundary || previous.storedBytes > boundary - previous.offset ||
      next.offset > boundary || next.storedBytes > boundary - next.offset) continue;
    const relativeStart = previous.offset + previous.storedBytes;
    const sizeBytes = next.offset - relativeStart;
    if (sizeBytes <= 0) continue;
    const base = { afterMember: previous.filename, beforeMember: next.filename, sizeBytes };
    if (sizeBytes > MAX_GAP_BYTES) {
      gaps.push({ ...base, status: 'too_large', markerMatches: null, firstMarkerAt: null,
        mostCommonMarkerDistance: null, mostCommonDistanceOccurrences: 0 });
      continue;
    }
    const start = OBSERVED_MEMBER_BASE + relativeStart;
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
