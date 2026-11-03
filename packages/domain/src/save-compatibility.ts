import type { SaveIdentity } from './types';

export const SAVE_DATA_DOMAINS = [
  'player_identity',
  'attributes',
  'actual_ca',
  'potential_ability',
  'positions',
  'club_links',
  'contracts',
  'tactics',
  'matches',
  'finance'
] as const;

export type SaveDataDomain = typeof SAVE_DATA_DOMAINS[number];
export type SaveAdapterVerification = 'research' | 'verified';

/**
 * A compatibility profile is exact-build evidence, not a filename or family
 * guess. It describes only the read domains independently validated for that
 * edition/build. Implementations are registered separately from this metadata.
 */
export interface SaveCompatibilityProfile {
  readonly id: string;
  readonly family: 'afe' | 'fmf';
  readonly edition: string;
  readonly build: string;
  readonly adapterVersion: string;
  readonly verification: SaveAdapterVerification;
  readonly readableDomains: readonly SaveDataDomain[];
}

export const SAVE_COMPATIBILITY_PROFILES: readonly SaveCompatibilityProfile[] = [];

export type SaveCompatibilityResolution =
  | {
      readonly status: 'unknown_format';
      readonly reason: 'signature_not_recognized';
      readonly family: null;
      readonly profile: null;
    }
  | {
      readonly status: 'edition_build_unknown';
      readonly reason: 'edition_build_not_identified';
      readonly family: 'afe' | 'fmf';
      readonly profile: null;
    }
  | {
      readonly status: 'unsupported_build';
      readonly reason: 'no_exact_compatibility_profile';
      readonly family: 'afe' | 'fmf';
      readonly edition: string;
      readonly build: string;
      readonly profile: null;
    }
  | {
      readonly status: 'ambiguous_profile';
      readonly reason: 'multiple_exact_profiles';
      readonly family: 'afe' | 'fmf';
      readonly edition: string;
      readonly build: string;
      readonly profile: null;
    }
  | {
      readonly status: 'research_only';
      readonly reason: 'profile_not_verified';
      readonly profile: SaveCompatibilityProfile;
    }
  | {
      readonly status: 'verified';
      readonly reason: null;
      readonly profile: SaveCompatibilityProfile;
    };

export type SaveCoverageState = 'verified' | 'experimental' | 'not_decoded' | 'unsupported';
export type SaveCoverageReason =
  | 'unknown_format'
  | 'no_verified_profile'
  | 'research_only_profile'
  | 'not_in_research_profile'
  | 'not_in_verified_profile'
  | null;

export interface SaveDomainCoverage {
  readonly domain: SaveDataDomain;
  readonly state: SaveCoverageState;
  readonly reason: SaveCoverageReason;
}

export interface SaveCompatibilityReport {
  /** File name, size, header and import metadata are available from inspection. */
  readonly fileMetadata: 'available';
  /** An observed archive directory is experimental structure, not decoded data. */
  readonly archiveCatalogue: 'experimental' | 'not_observed';
  readonly resolution: SaveCompatibilityResolution;
  readonly coverage: readonly SaveDomainCoverage[];
  /** No save writer is registered or enabled in this product. */
  readonly writeCapability: false;
}

/**
 * Resolve only an exact family + edition + build match. Never fall back to a
 * nearby release, a shared container family, or an unverified research profile.
 */
export function resolveSaveCompatibility(
  identity: Pick<SaveIdentity, 'detectedFamily' | 'edition' | 'build'>,
  profiles: readonly SaveCompatibilityProfile[] = SAVE_COMPATIBILITY_PROFILES
): SaveCompatibilityResolution {
  const family = identity.detectedFamily;
  if (family !== 'afe' && family !== 'fmf') {
    return {
      status: 'unknown_format',
      reason: 'signature_not_recognized',
      family: null,
      profile: null
    };
  }

  const edition = identity.edition?.trim() ?? '';
  const build = identity.build?.trim() ?? '';
  if (!edition || !build) {
    return {
      status: 'edition_build_unknown',
      reason: 'edition_build_not_identified',
      family,
      profile: null
    };
  }

  const exactMatches = profiles.filter(profile =>
    profile.family === family && profile.edition === edition && profile.build === build
  );
  if (exactMatches.length === 0) {
    return {
      status: 'unsupported_build',
      reason: 'no_exact_compatibility_profile',
      family,
      edition,
      build,
      profile: null
    };
  }
  if (exactMatches.length > 1) {
    return {
      status: 'ambiguous_profile',
      reason: 'multiple_exact_profiles',
      family,
      edition,
      build,
      profile: null
    };
  }

  const profile = exactMatches[0]!;
  return profile.verification === 'verified'
    ? { status: 'verified', reason: null, profile }
    : { status: 'research_only', reason: 'profile_not_verified', profile };
}

function coverageFor(
  domain: SaveDataDomain,
  resolution: SaveCompatibilityResolution
): SaveDomainCoverage {
  if (resolution.status === 'verified') {
    return resolution.profile.readableDomains.includes(domain)
      ? { domain, state: 'verified', reason: null }
      : { domain, state: 'unsupported', reason: 'not_in_verified_profile' };
  }
  if (resolution.status === 'research_only') {
    return resolution.profile.readableDomains.includes(domain)
      ? { domain, state: 'experimental', reason: 'research_only_profile' }
      : { domain, state: 'not_decoded', reason: 'not_in_research_profile' };
  }
  return {
    domain,
    state: 'not_decoded',
    reason: resolution.status === 'unknown_format' ? 'unknown_format' : 'no_verified_profile'
  };
}

/** Build a UI-ready coverage report without changing or persisting save bytes. */
export function createSaveCompatibilityReport(
  identity: SaveIdentity,
  profiles: readonly SaveCompatibilityProfile[] = SAVE_COMPATIBILITY_PROFILES
): SaveCompatibilityReport {
  const resolution = resolveSaveCompatibility(identity, profiles);
  return {
    fileMetadata: 'available',
    archiveCatalogue: identity.archiveIndex === null ? 'not_observed' : 'experimental',
    resolution,
    coverage: SAVE_DATA_DOMAINS.map(domain => coverageFor(domain, resolution)),
    writeCapability: false
  };
}
