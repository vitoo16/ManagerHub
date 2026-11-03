import { describe, expect, it } from 'vitest';
import { getSaveInspectionCoverage } from './save-inspection-coverage';
import type { SaveIdentity } from './types';

const headerOnly = { detectedFamily: 'afe', archiveIndex: null } as const;
const index: NonNullable<SaveIdentity['archiveIndex']> = {
  family: 'fmf-index-candidate', evidence: 'experimental',
  memberCount: 1, directoryOffset: 200,
  members: [{ filename: 'synthetic.dat', offset: 0, storedBytes: 100, reportedUncompressedBytes: 200 }]
};

describe('save inspection coverage boundary (MH-01/MH-05)', () => {
  it('shows header evidence only, never a gameplay decoder or verified build', () => {
    const rows = getSaveInspectionCoverage(headerOnly);
    expect(rows).toHaveLength(11);
    expect(rows[0]).toEqual({ area: 'container_signature', evidence: 'signature_observed' });
    expect(rows[1]).toEqual({ area: 'archive_directory', evidence: 'not_detected' });
    expect(rows.find(row => row.area === 'edition_build')?.evidence).toBe('unverified');
    expect(rows.filter(row => row.evidence === 'not_decoded')).toHaveLength(7);
    expect(rows.at(-1)).toEqual({ area: 'write_back', evidence: 'disabled' });
    expect(rows.some(row => row.evidence === 'available' || row.evidence === 'verified')).toBe(false);
  });

  it('reports only experimental index evidence for AFE, and no decoded members', () => {
    const rows = getSaveInspectionCoverage({ detectedFamily: 'afe', archiveIndex: index });
    expect(rows.find(row => row.area === 'archive_directory')?.evidence).toBe('experimental_index');
    expect(rows.find(row => row.area === 'players')?.evidence).toBe('not_decoded');
    expect(rows.find(row => row.area === 'ca_pa')?.evidence).toBe('not_decoded');
    expect(rows.find(row => row.area === 'write_back')?.evidence).toBe('disabled');
  });

  it('does not transpose AFE directory evidence onto FMF or an unknown header', () => {
    for (const family of ['fmf', null] as const) {
      const rows = getSaveInspectionCoverage({ detectedFamily: family, archiveIndex: index });
      expect(rows.find(row => row.area === 'archive_directory')?.evidence).toBe('not_detected');
      expect(rows.find(row => row.area === 'edition_build')?.evidence).toBe('unverified');
    }
    expect(getSaveInspectionCoverage({ detectedFamily: null, archiveIndex: null })[0]?.evidence)
      .toBe('not_detected');
  });

  it('is deterministic for equivalent persisted metadata and never exposes source metadata', () => {
    const input = { detectedFamily: 'afe' as const, archiveIndex: index };
    const first = getSaveInspectionCoverage(input);
    const next = getSaveInspectionCoverage({ ...input });
    expect(first).toEqual(next);
    expect(JSON.stringify(first)).not.toContain('synthetic.dat');
    expect(JSON.stringify(input)).toContain('synthetic.dat');
    expect(new Set(first.map(row => row.area)).size).toBe(first.length);
  });
});
