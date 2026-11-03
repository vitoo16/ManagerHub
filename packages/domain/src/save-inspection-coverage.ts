import type { SaveIdentity } from './types';

/**
 * Read-only inspection evidence, not a gameplay parser capability registry.
 * These observations are derived from the current file's bounded metadata and
 * intentionally never confer build, player, CA/PA or writer support.
 */
export type SaveInspectionArea =
  | 'container_signature'
  | 'archive_directory'
  | 'edition_build'
  | 'players'
  | 'attributes_positions'
  | 'ca_pa'
  | 'contracts'
  | 'tactics'
  | 'matches'
  | 'finances'
  | 'write_back';

export type SaveInspectionEvidence =
  | 'signature_observed'
  | 'experimental_index'
  | 'not_detected'
  | 'unverified'
  | 'not_decoded'
  | 'disabled';

export interface SaveInspectionCoverage {
  readonly area: SaveInspectionArea;
  readonly evidence: SaveInspectionEvidence;
}

const UNDECODED_AREAS = [
  'players', 'attributes_positions', 'ca_pa', 'contracts',
  'tactics', 'matches', 'finances'
] as const satisfies readonly SaveInspectionArea[];

/**
 * A family signature only identifies header bytes, never edition/build.
 * A detected archive directory is experimental metadata, not decoded records.
 * No source file bytes, file names, hashes or player data enter this matrix.
 */
export function getSaveInspectionCoverage(
  inspection: Pick<SaveIdentity, 'detectedFamily' | 'archiveIndex'>
): readonly SaveInspectionCoverage[] {
  return [
    {
      area: 'container_signature',
      evidence: inspection.detectedFamily === 'afe' || inspection.detectedFamily === 'fmf'
        ? 'signature_observed' : 'not_detected'
    },
    {
      area: 'archive_directory',
      evidence: inspection.detectedFamily === 'afe' &&
        inspection.archiveIndex?.family === 'fmf-index-candidate' &&
        inspection.archiveIndex.evidence === 'experimental'
        ? 'experimental_index' : 'not_detected'
    },
    { area: 'edition_build', evidence: 'unverified' },
    ...UNDECODED_AREAS.map(area => ({ area, evidence: 'not_decoded' as const })),
    { area: 'write_back', evidence: 'disabled' }
  ];
}
