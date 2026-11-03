import { describe, expect, it } from 'vitest';
import {
  createSaveCompatibilityReport,
  resolveSaveCompatibility,
  type SaveCompatibilityProfile
} from './save-compatibility';
import type { SaveIdentity } from './types';

function save(overrides: Partial<SaveIdentity> = {}): SaveIdentity {
  return {
    id: 'a'.repeat(64),
    name: 'career.fm',
    importedAt: '2026-11-03T12:00:00.000Z',
    lastModified: 1_790_000_000_000,
    size: 6,
    sha256: 'a'.repeat(64),
    signature: '02 01 61 66 65 2E',
    detectedFamily: 'afe',
    edition: null,
    build: null,
    support: 'signature_only',
    inspectionStatus: 'inspected',
    warnings: [],
    archiveIndex: null,
    ...overrides
  };
}

const researchProfile: SaveCompatibilityProfile = {
  id: 'fm2013-research-profile',
  family: 'afe',
  edition: 'FM2013',
  build: '13.3.3f359652',
  adapterVersion: '0.1.0-research',
  verification: 'research',
  readableDomains: ['player_identity', 'attributes']
};

const verifiedProfile: SaveCompatibilityProfile = {
  ...researchProfile,
  id: 'fm2013-verified-profile',
  adapterVersion: '1.0.0',
  verification: 'verified'
};

describe('exact-build save compatibility resolution', () => {
  it('does not treat an unknown signature as a compatible save', () => {
    const result = resolveSaveCompatibility(save({ detectedFamily: null }));
    expect(result).toEqual({
      status: 'unknown_format',
      reason: 'signature_not_recognized',
      family: null,
      profile: null
    });
  });

  it('does not infer edition or build from an AFE/FMF family signature', () => {
    const result = resolveSaveCompatibility(save());
    expect(result).toEqual({
      status: 'edition_build_unknown',
      reason: 'edition_build_not_identified',
      family: 'afe',
      profile: null
    });
  });

  it('requires an exact family, edition and build match without nearby-build fallback', () => {
    const identity = save({ edition: 'FM2013', build: '13.3.3f359652' });
    const otherBuild = { ...verifiedProfile, build: '13.3.3f359653' };
    expect(resolveSaveCompatibility(identity, [otherBuild])).toMatchObject({
      status: 'unsupported_build',
      reason: 'no_exact_compatibility_profile',
      family: 'afe',
      edition: 'FM2013',
      build: '13.3.3f359652',
      profile: null
    });
  });

  it('keeps a research-only profile experimental and never upgrades its fields to verified', () => {
    const identity = save({ edition: 'FM2013', build: '13.3.3f359652' });
    const report = createSaveCompatibilityReport(identity, [researchProfile]);
    expect(report.resolution.status).toBe('research_only');
    expect(report.coverage.find(item => item.domain === 'player_identity')).toMatchObject({
      state: 'experimental',
      reason: 'research_only_profile'
    });
    expect(report.coverage.find(item => item.domain === 'attributes')).toMatchObject({
      state: 'experimental'
    });
    expect(report.coverage.find(item => item.domain === 'actual_ca')).toMatchObject({
      state: 'not_decoded'
    });
    expect(report.writeCapability).toBe(false);
  });

  it('marks only explicitly verified domains as readable and keeps other domains unsupported', () => {
    const identity = save({ edition: 'FM2013', build: '13.3.3f359652' });
    const report = createSaveCompatibilityReport(identity, [verifiedProfile]);
    expect(report.resolution.status).toBe('verified');
    expect(report.coverage.find(item => item.domain === 'player_identity')).toMatchObject({
      state: 'verified',
      reason: null
    });
    expect(report.coverage.find(item => item.domain === 'attributes')).toMatchObject({
      state: 'verified',
      reason: null
    });
    expect(report.coverage.find(item => item.domain === 'actual_ca')).toMatchObject({
      state: 'unsupported',
      reason: 'not_in_verified_profile'
    });
  });

  it('fails closed when multiple profiles claim the same exact build', () => {
    const identity = save({ edition: 'FM2013', build: '13.3.3f359652' });
    expect(resolveSaveCompatibility(identity, [researchProfile, verifiedProfile])).toMatchObject({
      status: 'ambiguous_profile',
      reason: 'multiple_exact_profiles',
      profile: null
    });
  });

  it('keeps an experimental archive catalogue separate from player-data coverage', () => {
    const report = createSaveCompatibilityReport(save({
      archiveIndex: {
        family: 'fmf-index-candidate',
        evidence: 'experimental',
        memberCount: 1,
        directoryOffset: 256,
        members: [{ filename: 'game_info.dat', offset: 0, storedBytes: 128, reportedUncompressedBytes: 256 }]
      }
    }));
    expect(report.archiveCatalogue).toBe('experimental');
    expect(report.coverage.every(item => item.state === 'not_decoded')).toBe(true);
    expect(report.writeCapability).toBe(false);
  });
});
