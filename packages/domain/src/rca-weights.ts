import type { AttributeKey } from './player-import';
import type { RcaArchetypeId, RcaArchetypeWeightSpec, RcaZeroCostHiddenTrait, RcaZeroCostPersonalityTrait } from './rca-types';

export const ZERO_COST_VISIBLE_ATTRIBUTES: readonly AttributeKey[] = [
  'aggression',
  'determination',
  'flair',
  'naturalFitness',
  'eccentricity',
  'rushingOut',
  'tendencyToPunch',
  'punching'
];

export const ZERO_COST_HIDDEN_TRAITS: readonly RcaZeroCostHiddenTrait[] = [
  'consistency',
  'dirtiness',
  'importantMatches',
  'injuryProneness',
  'versatility'
];

export const ZERO_COST_PERSONALITY_TRAITS: readonly RcaZeroCostPersonalityTrait[] = [
  'adaptability',
  'ambition',
  'controversy',
  'loyalty',
  'pressure',
  'professionalism',
  'sportsmanship',
  'temperament'
];

export const ATTRIBUTE_GROUP_BY_KEY: Readonly<Record<AttributeKey, 'Technical' | 'Mental' | 'Physical' | 'Goalkeeping'>> = {
  corners: 'Technical', crossing: 'Technical', dribbling: 'Technical', finishing: 'Technical',
  firstTouch: 'Technical', freeKickTaking: 'Technical', heading: 'Technical', longShots: 'Technical',
  longThrows: 'Technical', marking: 'Technical', passing: 'Technical', penaltyTaking: 'Technical',
  tackling: 'Technical', technique: 'Technical',
  aggression: 'Mental', anticipation: 'Mental', bravery: 'Mental', composure: 'Mental',
  concentration: 'Mental', decisions: 'Mental', determination: 'Mental', flair: 'Mental',
  leadership: 'Mental', offTheBall: 'Mental', positioning: 'Mental', teamwork: 'Mental',
  vision: 'Mental', workRate: 'Mental',
  acceleration: 'Physical', agility: 'Physical', balance: 'Physical', jumpingReach: 'Physical',
  naturalFitness: 'Physical', pace: 'Physical', stamina: 'Physical', strength: 'Physical',
  aerialReach: 'Goalkeeping', commandOfArea: 'Goalkeeping', communication: 'Goalkeeping',
  eccentricity: 'Goalkeeping', handling: 'Goalkeeping', kicking: 'Goalkeeping',
  oneOnOnes: 'Goalkeeping', reflexes: 'Goalkeeping', rushingOut: 'Goalkeeping',
  throwing: 'Goalkeeping', punching: 'Goalkeeping', tendencyToPunch: 'Goalkeeping'
};

function defineArchetype(
  archetype: RcaArchetypeId,
  weakerFootWeight: number,
  attributeWeights: Readonly<Partial<Record<AttributeKey, number>>>
): RcaArchetypeWeightSpec {
  let sumAttributeWeights = 0;
  for (const w of Object.values(attributeWeights)) {
    if (typeof w === 'number') sumAttributeWeights += w;
  }
  return {
    archetype,
    weakerFootWeight,
    attributeWeights,
    sumAttributeWeights,
    sumTotalWeights: sumAttributeWeights + weakerFootWeight
  };
}

/**
 * Exact non-zero attribute weights extracted from FMRTE 26 `Ratings/rca.json` (`SettingsVersion: "24.4.0.35"`,
 * SHA-256 `a378c8e0be5e268dc7ed2a2b932ed9d478f135976c0bf45788f77294b63d4ffa`), mapped cleanly onto
 * ManagerHub's canonical `AttributeKey` identifiers (`Vision -> vision`, `Leadership -> leadership`,
 * `Jumping -> jumpingReach`, `AerialAbility -> aerialReach`).
 *
 */
export const FMRTE26_RCA_ARCHETYPES: Readonly<Record<RcaArchetypeId, RcaArchetypeWeightSpec>> = {
  Goalkeeper: defineArchetype('Goalkeeper', 3.0, {
    aerialReach: 6, commandOfArea: 6, communication: 5, handling: 8, kicking: 5,
    oneOnOnes: 4, reflexes: 8, throwing: 3,
    anticipation: 3, bravery: 6, composure: 2, concentration: 6, decisions: 10,
    leadership: 2, positioning: 5, teamwork: 2, vision: 1, workRate: 1,
    acceleration: 6, agility: 8, balance: 2, jumpingReach: 1, pace: 3, stamina: 1, strength: 4,
    firstTouch: 1, heading: 1, passing: 3, technique: 1
  }),
  DefenderCentral: defineArchetype('DefenderCentral', 4.5, {
    anticipation: 5, bravery: 2, composure: 2, concentration: 4, decisions: 10,
    leadership: 2, offTheBall: 1, positioning: 8, teamwork: 1, vision: 1, workRate: 2,
    acceleration: 6, agility: 6, balance: 2, jumpingReach: 6, pace: 5, stamina: 3, strength: 6,
    corners: 1, crossing: 1, dribbling: 1, finishing: 1, firstTouch: 2, freeKickTaking: 1,
    heading: 5, longShots: 1, longThrows: 1, marking: 8, passing: 2, penaltyTaking: 1, tackling: 5, technique: 1
  }),
  FullBack: defineArchetype('FullBack', 4.0, {
    anticipation: 3, bravery: 2, composure: 2, concentration: 4, decisions: 7,
    leadership: 1, offTheBall: 1, positioning: 4, teamwork: 2, vision: 2, workRate: 2,
    acceleration: 7, agility: 6, balance: 2, jumpingReach: 2, pace: 5, stamina: 6, strength: 4,
    corners: 1, crossing: 2, dribbling: 1, finishing: 1, firstTouch: 3, freeKickTaking: 1,
    heading: 2, longShots: 1, longThrows: 1, marking: 3, passing: 2, penaltyTaking: 1, tackling: 4, technique: 2
  }),
  WingBack: defineArchetype('WingBack', 4.0, {
    anticipation: 3, bravery: 1, composure: 2, concentration: 3, decisions: 5,
    leadership: 1, offTheBall: 2, positioning: 3, teamwork: 2, vision: 2, workRate: 2,
    acceleration: 8, agility: 5, balance: 2, jumpingReach: 1, pace: 6, stamina: 7, strength: 4,
    corners: 1, crossing: 3, dribbling: 2, finishing: 1, firstTouch: 3, freeKickTaking: 1,
    heading: 1, longShots: 1, longThrows: 1, marking: 2, passing: 3, penaltyTaking: 1, tackling: 3, technique: 3
  }),
  DefensiveMidfielder: defineArchetype('DefensiveMidfielder', 5.0, {
    anticipation: 5, bravery: 1, composure: 2, concentration: 3, decisions: 8,
    leadership: 1, offTheBall: 1, positioning: 5, teamwork: 2, vision: 4, workRate: 4,
    acceleration: 6, agility: 6, balance: 2, jumpingReach: 1, pace: 4, stamina: 4, strength: 5,
    corners: 1, crossing: 1, dribbling: 2, finishing: 2, firstTouch: 4, freeKickTaking: 1,
    heading: 1, longShots: 3, longThrows: 1, marking: 3, passing: 4, penaltyTaking: 1, tackling: 7, technique: 3
  }),
  MidfielderCentral: defineArchetype('MidfielderCentral', 6.0, {
    anticipation: 3, bravery: 1, composure: 3, concentration: 2, decisions: 7,
    leadership: 1, offTheBall: 3, positioning: 3, teamwork: 2, vision: 6, workRate: 3,
    acceleration: 6, agility: 6, balance: 2, jumpingReach: 1, pace: 5, stamina: 6, strength: 4,
    corners: 1, crossing: 1, dribbling: 2, finishing: 2, firstTouch: 6, freeKickTaking: 1,
    heading: 1, longShots: 3, longThrows: 1, marking: 3, passing: 6, penaltyTaking: 1, tackling: 3, technique: 4
  }),
  WideMidfielder: defineArchetype('WideMidfielder', 5.0, {
    anticipation: 3, bravery: 1, composure: 3, concentration: 2, decisions: 5,
    leadership: 1, offTheBall: 2, positioning: 1, teamwork: 2, vision: 3, workRate: 3,
    acceleration: 8, agility: 6, balance: 2, jumpingReach: 1, pace: 6, stamina: 5, strength: 3,
    corners: 1, crossing: 5, dribbling: 3, finishing: 2, firstTouch: 4, freeKickTaking: 1,
    heading: 1, longShots: 2, longThrows: 1, marking: 1, passing: 3, penaltyTaking: 1, tackling: 2, technique: 4
  }),
  AttackingMidfielderCentral: defineArchetype('AttackingMidfielderCentral', 7.0, {
    anticipation: 3, bravery: 1, composure: 3, concentration: 2, decisions: 6,
    leadership: 1, offTheBall: 3, positioning: 2, teamwork: 2, vision: 6, workRate: 3,
    acceleration: 9, agility: 6, balance: 2, jumpingReach: 1, pace: 7, stamina: 6, strength: 3,
    corners: 1, crossing: 1, dribbling: 3, finishing: 3, firstTouch: 5, freeKickTaking: 1,
    heading: 1, longShots: 3, longThrows: 1, marking: 1, passing: 4, penaltyTaking: 1, tackling: 2, technique: 5
  }),
  Winger: defineArchetype('Winger', 5.5, {
    anticipation: 3, bravery: 1, composure: 3, concentration: 2, decisions: 5,
    leadership: 1, offTheBall: 2, positioning: 1, teamwork: 2, vision: 3, workRate: 3,
    acceleration: 10, agility: 6, balance: 2, jumpingReach: 1, pace: 10, stamina: 7, strength: 3,
    corners: 1, crossing: 5, dribbling: 5, finishing: 2, firstTouch: 5, freeKickTaking: 1,
    heading: 1, longShots: 2, longThrows: 1, marking: 1, passing: 2, penaltyTaking: 1, tackling: 2, technique: 4
  }),
  Striker: defineArchetype('Striker', 7.5, {
    anticipation: 5, bravery: 1, composure: 6, concentration: 2, decisions: 5,
    leadership: 1, offTheBall: 6, positioning: 2, teamwork: 1, vision: 2, workRate: 2,
    acceleration: 10, agility: 6, balance: 2, jumpingReach: 5, pace: 7, stamina: 6, strength: 6,
    corners: 1, crossing: 2, dribbling: 5, finishing: 8, firstTouch: 6, freeKickTaking: 1,
    heading: 6, longShots: 2, longThrows: 1, marking: 1, passing: 2, penaltyTaking: 1, tackling: 1, technique: 4
  })
};


// Explicit zero cells transcribed from RCA-ATTRIBUTE-WEIGHTS.md, not inferred from sparsity.
const GK_REFERENCE_ZEROS: readonly AttributeKey[] = [
  'corners', 'crossing', 'dribbling', 'finishing', 'freeKickTaking', 'longShots',
  'longThrows', 'marking', 'penaltyTaking', 'tackling', 'offTheBall'
];
const OUTFIELD_REFERENCE_ZEROS: readonly AttributeKey[] = [
  'aerialReach', 'commandOfArea', 'communication', 'handling', 'kicking',
  'oneOnOnes', 'reflexes', 'throwing'
];
/** Missing entries are not evidence of zero; only retained explicit zero references qualify. */
export function referenceAttributeWeight(archetype: RcaArchetypeId, key: AttributeKey): number | null {
  return FMRTE26_RCA_ARCHETYPES[archetype].attributeWeights[key]
    ?? (ZERO_COST_VISIBLE_ATTRIBUTES.includes(key) ||
      (archetype === 'Goalkeeper' ? GK_REFERENCE_ZEROS : OUTFIELD_REFERENCE_ZEROS).includes(key) ? 0 : null);
}
