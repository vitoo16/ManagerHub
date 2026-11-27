import type { RolePosition } from './football-role-registry';
import type { RcaArchetypeId, RcaEditionProfile } from './rca-types';

const BASE_POSITION_ARCHETYPE_MAP: Readonly<Record<RolePosition, RcaArchetypeId>> = {
  GK: 'Goalkeeper',
  SW: 'DefenderCentral',
  DC: 'DefenderCentral',
  DL: 'FullBack',
  DR: 'FullBack',
  WBL: 'WingBack',
  WBR: 'WingBack',
  DM: 'DefensiveMidfielder',
  MC: 'MidfielderCentral',
  ML: 'WideMidfielder',
  MR: 'WideMidfielder',
  AMC: 'AttackingMidfielderCentral',
  AML: 'Winger',
  AMR: 'Winger',
  ST: 'Striker'
};

export const FM2013_RCA_EDITION_PROFILE: RcaEditionProfile = {
  profileId: 'FM2013-research-v2',
  edition: 'FM2013',
  supportedBuilds: ['13.3.3f359652', '13.3.3'],
  settingsVersion: '24.4.0.35',
  weightSourceSha256: 'a378c8e0be5e268dc7ed2a2b932ed9d478f135976c0bf45788f77294b63d4ffa',
  weightStatus: 'OBSERVED',
  formulaStatus: 'INFERRED',
  compatibilityStatus: 'Compatible but unverified',
  certifiedForAutoMatch: false,
  positionsSupported: ['GK', 'SW', 'DL', 'DC', 'DR', 'WBL', 'WBR', 'DM', 'ML', 'MC', 'MR', 'AML', 'AMC', 'AMR', 'ST'],
  positionArchetypeMap: BASE_POSITION_ARCHETYPE_MAP,
  positionFallbackNotes: {
    SW: 'Sweeper (SW) was removed in FM2026; mapped to DefenderCentral weights as an explicit fallback.'
  }
};

export const FM2026_RCA_EDITION_PROFILE: RcaEditionProfile = {
  profileId: 'FM2026-reference-v1',
  edition: 'FM2026',
  supportedBuilds: ['26.3.2', '26.3.2-build41'],
  settingsVersion: '24.4.0.35',
  weightSourceSha256: 'a378c8e0be5e268dc7ed2a2b932ed9d478f135976c0bf45788f77294b63d4ffa',
  weightStatus: 'OBSERVED',
  formulaStatus: 'UNKNOWN',
  compatibilityStatus: 'Compatible but unverified',
  certifiedForAutoMatch: false,
  positionsSupported: ['GK', 'DL', 'DC', 'DR', 'WBL', 'WBR', 'DM', 'ML', 'MC', 'MR', 'AML', 'AMC', 'AMR', 'ST'],
  positionArchetypeMap: BASE_POSITION_ARCHETYPE_MAP,
  positionFallbackNotes: {
    SW: 'Sweeper (SW) does not exist in FM2026 (14-position pitch model).'
  }
};

export function getRcaEditionProfile(edition: string | null | undefined): RcaEditionProfile | null {
  if (edition === 'FM2013') return FM2013_RCA_EDITION_PROFILE;
  if (edition === 'FM2026' || edition === 'FM26') return FM2026_RCA_EDITION_PROFILE;
  return null;
}


/** Retained historical FM2013 coefficients, not a reproduced fit. WB and wide midfield
 * used the historical universal affine values, not an independently fitted archetype.
 * Never apply these coefficients to FM2026. */
export const FM2013_ADVISORY_COEFFICIENTS: Readonly<Record<RcaArchetypeId, { intercept: number; slope: number }>> = {
  Goalkeeper: { intercept: -108.18, slope: 19.576 },
  DefenderCentral: { intercept: -106.61, slope: 19.147 },
  FullBack: { intercept: -102.71, slope: 18.587 },
  WingBack: { intercept: -101.24, slope: 18.673 },
  DefensiveMidfielder: { intercept: -103.27, slope: 18.685 },
  MidfielderCentral: { intercept: -97.73, slope: 17.997 },
  WideMidfielder: { intercept: -101.24, slope: 18.673 },
  AttackingMidfielderCentral: { intercept: -110.25, slope: 19.270 },
  Winger: { intercept: -90.52, slope: 17.895 },
  Striker: { intercept: -90.64, slope: 17.700 },
};
export const FM2013_HISTORICAL_UNIVERSAL = { intercept: -101.239, slope: 18.6731 } as const;
