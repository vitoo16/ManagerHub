import { describe, expect, it } from 'vitest';
import type { AttributeKey, PlayerExport } from './player-import';
import {
  evaluateFootAbility,
  evaluatePlayerRca,
  FM2013_RCA_EDITION_PROFILE,
  FM2026_RCA_EDITION_PROFILE,
  FMRTE26_RCA_ARCHETYPES,
  getAttributeRcaWeight,
  getRcaEditionProfile,
  RCA_EVIDENCE_REGISTRY,
  ZERO_COST_HIDDEN_TRAITS,
  ZERO_COST_PERSONALITY_TRAITS,
  ZERO_COST_VISIBLE_ATTRIBUTES,
  type RcaArchetypeId
} from './rca-engine';
import { inspectAbilityBudget } from './ability-budget';
import { evaluateDevelopmentScenario } from './player-development';

function buildUniformAttributes(value: number, overrides: Partial<Record<AttributeKey, number>> = {}): Record<AttributeKey, number> {
  const keys: AttributeKey[] = [
    'corners', 'crossing', 'dribbling', 'finishing', 'firstTouch', 'freeKickTaking',
    'heading', 'longShots', 'longThrows', 'marking', 'passing', 'penaltyTaking', 'tackling', 'technique',
    'aggression', 'anticipation', 'bravery', 'composure', 'concentration', 'decisions', 'determination',
    'flair', 'leadership', 'offTheBall', 'positioning', 'teamwork', 'vision', 'workRate',
    'acceleration', 'agility', 'balance', 'jumpingReach', 'naturalFitness', 'pace', 'stamina', 'strength',
    'aerialReach', 'commandOfArea', 'communication', 'eccentricity', 'handling', 'kicking', 'oneOnOnes',
    'reflexes', 'rushingOut', 'throwing', 'punching', 'tendencyToPunch'
  ];
  const out = {} as Record<AttributeKey, number>;
  for (const k of keys) out[k] = value;
  return { ...out, ...overrides };
}

describe('FMRTE 26 RCA weight registry & provenance invariants', () => {
  it('matches exact non-zero weight sums and WeakerFoot weights from Ratings/rca.json (v24.4.0.35)', () => {
    const expected: Record<RcaArchetypeId, { sumAttr: number; wf: number; total: number }> = {
      Goalkeeper: { sumAttr: 114, wf: 3.0, total: 117.0 },
      DefenderCentral: { sumAttr: 103, wf: 4.5, total: 107.5 },
      FullBack: { sumAttr: 87, wf: 4.0, total: 91.0 },
      WingBack: { sumAttr: 85, wf: 4.0, total: 89.0 },
      DefensiveMidfielder: { sumAttr: 98, wf: 5.0, total: 103.0 },
      MidfielderCentral: { sumAttr: 99, wf: 6.0, total: 105.0 },
      WideMidfielder: { sumAttr: 88, wf: 5.0, total: 93.0 },
      AttackingMidfielderCentral: { sumAttr: 98, wf: 7.0, total: 105.0 },
      Winger: { sumAttr: 98, wf: 5.5, total: 103.5 },
      Striker: { sumAttr: 116, wf: 7.5, total: 123.5 }
    };

    for (const [arch, exp] of Object.entries(expected) as [RcaArchetypeId, typeof expected.Goalkeeper][]) {
      const spec = FMRTE26_RCA_ARCHETYPES[arch];
      expect(spec.sumAttributeWeights).toBe(exp.sumAttr);
      expect(spec.weakerFootWeight).toBe(exp.wf);
      expect(spec.sumTotalWeights).toBe(exp.total);
    }

    expect(FM2013_RCA_EDITION_PROFILE.weightSourceSha256).toBe(
      'a378c8e0be5e268dc7ed2a2b932ed9d478f135976c0bf45788f77294b63d4ffa'
    );
    expect(FM2026_RCA_EDITION_PROFILE.weightSourceSha256).toBe(
      'a378c8e0be5e268dc7ed2a2b932ed9d478f135976c0bf45788f77294b63d4ffa'
    );
    expect(RCA_EVIDENCE_REGISTRY.length).toBeGreaterThanOrEqual(7);
  });

  it('guarantees zero CA weight across all 10 archetypes for zero-cost visible, hidden, and personality traits', () => {
    for (const arch of Object.keys(FMRTE26_RCA_ARCHETYPES) as RcaArchetypeId[]) {
      const weights = FMRTE26_RCA_ARCHETYPES[arch].attributeWeights;
      for (const zeroAttr of ZERO_COST_VISIBLE_ATTRIBUTES) {
        expect(weights[zeroAttr] ?? 0).toBe(0);
      }
    }
    expect(ZERO_COST_HIDDEN_TRAITS).toEqual([
      'consistency', 'dirtiness', 'importantMatches', 'injuryProneness', 'versatility'
    ]);
    expect(ZERO_COST_PERSONALITY_TRAITS).toHaveLength(8);
  });
});

describe('Controlled 10-archetype golden vectors & single-variable perturbations', () => {
  const tenArchetypeVectors: readonly {
    id: string;
    label: string;
    positions: Record<string, number>;
    leftFoot: number;
    rightFoot: number;
    overrides: Partial<Record<AttributeKey, number>>;
    expectedArchetype: RcaArchetypeId;
    highWeightAttr: AttributeKey;
  }[] = [
    {
      id: 'GV-01-GK',
      label: 'Goalkeeper',
      positions: { GK: 20 },
      leftFoot: 8,
      rightFoot: 18,
      overrides: { handling: 16, reflexes: 17, decisions: 15, agility: 16, commandOfArea: 15, aerialReach: 15 },
      expectedArchetype: 'Goalkeeper',
      highWeightAttr: 'decisions'
    },
    {
      id: 'GV-02-CB',
      label: 'Centre-back',
      positions: { DC: 20 },
      leftFoot: 9,
      rightFoot: 19,
      overrides: { marking: 16, tackling: 16, positioning: 16, decisions: 15, strength: 16, jumpingReach: 16, heading: 15 },
      expectedArchetype: 'DefenderCentral',
      highWeightAttr: 'marking'
    },
    {
      id: 'GV-03-FB',
      label: 'Full-back',
      positions: { DR: 20 },
      leftFoot: 8,
      rightFoot: 19,
      overrides: { acceleration: 16, pace: 15, stamina: 16, tackling: 15, positioning: 14, decisions: 14, crossing: 14 },
      expectedArchetype: 'FullBack',
      highWeightAttr: 'acceleration'
    },
    {
      id: 'GV-04-DM',
      label: 'Defensive midfielder',
      positions: { DM: 20 },
      leftFoot: 11,
      rightFoot: 19,
      overrides: { tackling: 16, decisions: 16, positioning: 16, anticipation: 15, acceleration: 14, passing: 15 },
      expectedArchetype: 'DefensiveMidfielder',
      highWeightAttr: 'decisions'
    },
    {
      id: 'GV-05-CM',
      label: 'Central midfielder',
      positions: { MC: 20 },
      leftFoot: 12,
      rightFoot: 19,
      overrides: { passing: 17, vision: 17, firstTouch: 16, decisions: 16, stamina: 15, technique: 16 },
      expectedArchetype: 'MidfielderCentral',
      highWeightAttr: 'passing'
    },
    {
      id: 'GV-06-AM',
      label: 'Attacking midfielder',
      positions: { AMC: 20 },
      leftFoot: 13,
      rightFoot: 19,
      overrides: { acceleration: 16, pace: 15, vision: 17, decisions: 16, technique: 17, firstTouch: 17 },
      expectedArchetype: 'AttackingMidfielderCentral',
      highWeightAttr: 'acceleration'
    },
    {
      id: 'GV-07-WG',
      label: 'Winger',
      positions: { AML: 20 },
      leftFoot: 19,
      rightFoot: 11,
      overrides: { acceleration: 18, pace: 18, dribbling: 17, crossing: 16, firstTouch: 16, agility: 17 },
      expectedArchetype: 'Winger',
      highWeightAttr: 'pace'
    },
    {
      id: 'GV-08-ST',
      label: 'Striker',
      positions: { ST: 20 },
      leftFoot: 12,
      rightFoot: 20,
      overrides: { finishing: 18, acceleration: 17, offTheBall: 17, composure: 16, firstTouch: 16, heading: 15 },
      expectedArchetype: 'Striker',
      highWeightAttr: 'finishing'
    },
    {
      id: 'GV-09-MULTI',
      label: 'Multi-position player (DC + ST natural)',
      positions: { DC: 20, ST: 20, MC: 16 },
      leftFoot: 14,
      rightFoot: 19,
      overrides: { finishing: 17, acceleration: 17, offTheBall: 16, composure: 16, heading: 16, strength: 16 },
      expectedArchetype: 'Striker',
      highWeightAttr: 'finishing'
    },
    {
      id: 'GV-10-TWOFOOT',
      label: 'Two-footed playmaker',
      positions: { AMC: 20 },
      leftFoot: 19,
      rightFoot: 20,
      overrides: { vision: 17, passing: 17, firstTouch: 17, technique: 17, acceleration: 15, decisions: 16 },
      expectedArchetype: 'AttackingMidfielderCentral',
      highWeightAttr: 'vision'
    }
  ];

  it('evaluates all 10 required player archetypes deterministically and responds monotonically to high-weight attributes', () => {
    for (const vec of tenArchetypeVectors) {
      const baseAttrs = buildUniformAttributes(11, vec.overrides);
      const baseReport = evaluatePlayerRca(
        {
          attributes: baseAttrs,
          positions: vec.positions,
          leftFoot: vec.leftFoot,
          rightFoot: vec.rightFoot,
          actualCa: 140,
          potentialAbility: 170
        },
        { edition: 'FM2013', build: '13.3.3f359652' }
      );

      expect(baseReport.status).toBe('evaluated');
      expect(baseReport.selectedArchetype).toBe(vec.expectedArchetype);
      expect(baseReport.advisoryRca).toBeGreaterThanOrEqual(80);
      expect(baseReport.advisoryRca).toBeLessThanOrEqual(200);

      // Perturbation 1: Zero-cost attributes (Determination, Flair, Aggression, NaturalFitness) MUST NOT change RCA!
      const zeroPerturbed = evaluatePlayerRca(
        {
          attributes: {
            ...baseAttrs,
            determination: 20,
            flair: 20,
            aggression: 20,
            naturalFitness: 20,
            eccentricity: 20,
            rushingOut: 20
          },
          positions: vec.positions,
          leftFoot: vec.leftFoot,
          rightFoot: vec.rightFoot,
          actualCa: 140,
          potentialAbility: 170
        },
        { edition: 'FM2013', build: '13.3.3f359652' }
      );
      expect(zeroPerturbed.rawWeightedSum).toBe(baseReport.rawWeightedSum);
      expect(zeroPerturbed.advisoryRca).toBe(baseReport.advisoryRca);

      // Perturbation 2: Lowering high-weight attribute from current to 1 MUST strictly reduce rawWeightedSum and advisoryRca!
      const lowered = evaluatePlayerRca(
        {
          attributes: { ...baseAttrs, [vec.highWeightAttr]: 1 },
          positions: vec.positions,
          leftFoot: vec.leftFoot,
          rightFoot: vec.rightFoot,
          actualCa: 140,
          potentialAbility: 170
        },
        { edition: 'FM2013', build: '13.3.3f359652' }
      );
      expect(lowered.rawWeightedSum!).toBeLessThan(baseReport.rawWeightedSum!);
      expect(lowered.advisoryRca!).toBeLessThan(baseReport.advisoryRca!);
    }
  });

  it('models weaker-foot cost accurately and varies weaker-foot impact by position (ST 7.5 > GK 3.0)', () => {
    const attrs = buildUniformAttributes(13);
    const oneFootedSt = evaluatePlayerRca(
      { attributes: attrs, positions: { ST: 20 }, leftFoot: 1, rightFoot: 20 },
      { edition: 'FM2026', build: '26.3.2' }
    );
    const twoFootedSt = evaluatePlayerRca(
      { attributes: attrs, positions: { ST: 20 }, leftFoot: 20, rightFoot: 20 },
      { edition: 'FM2026', build: '26.3.2' }
    );
    const oneFootedGk = evaluatePlayerRca(
      { attributes: attrs, positions: { GK: 20 }, leftFoot: 1, rightFoot: 20 },
      { edition: 'FM2026', build: '26.3.2' }
    );
    const twoFootedGk = evaluatePlayerRca(
      { attributes: attrs, positions: { GK: 20 }, leftFoot: 20, rightFoot: 20 },
      { edition: 'FM2026', build: '26.3.2' }
    );

    const stGain = twoFootedSt.advisoryRca! - oneFootedSt.advisoryRca!;
    const gkGain = twoFootedGk.advisoryRca! - oneFootedGk.advisoryRca!;
    expect(stGain).toBeGreaterThan(gkGain);
    expect(twoFootedSt.foot?.isTwoFooted).toBe(true);
    expect(oneFootedSt.foot?.preferredFoot).toBe('right');
    expect(oneFootedSt.foot?.weakerFootRating).toBe(1);

    // Increasing already-preferred foot when weaker foot stays 5 does NOT increase weakerFootRating
    const pref18 = evaluateFootAbility(5, 18, 7.5, 17.7, 123.5);
    const pref20 = evaluateFootAbility(5, 20, 7.5, 17.7, 123.5);
    expect(pref18.weakerFootRating).toBe(5);
    expect(pref20.weakerFootRating).toBe(5);
    expect(pref18.weightedPoints).toBe(pref20.weightedPoints);
  });

  it('handles cross-version FM2013 Sweeper fallback, boundary clamping (1..200), RCA > PA flag, and fail-closed Auto-Match', () => {
    // All 1s -> clamped to 1
    const minPlayer = evaluatePlayerRca(
      { attributes: buildUniformAttributes(1), positions: { MC: 20 }, leftFoot: 1, rightFoot: 1, actualCa: 1, potentialAbility: 50 },
      { edition: 'FM2013', build: '13.3.3f359652' }
    );
    expect(minPlayer.advisoryRca).toBe(1);
    expect(minPlayer.exceedsPotentialAbility).toBe(false);

    // All 20s -> clamped to 200 and flags exceedsPotentialAbility when PA = 160 without mutating PA!
    const maxPlayer = evaluatePlayerRca(
      { attributes: buildUniformAttributes(20), positions: { SW: 20 }, leftFoot: 20, rightFoot: 20, actualCa: 150, potentialAbility: 160 },
      { edition: 'FM2013', build: '13.3.3f359652' }
    );
    expect(maxPlayer.advisoryRca).toBe(200);
    expect(maxPlayer.selectedPosition).toBe('SW');
    expect(maxPlayer.selectedArchetype).toBe('DefenderCentral');
    expect(maxPlayer.candidateScores[0]?.isFallbackMapping).toBe(true);
    expect(maxPlayer.exceedsPotentialAbility).toBe(true);
    expect(maxPlayer.paMinusAdvisoryRca).toBe(-40);
    expect(maxPlayer.autoMatchDecision).toEqual({
      allowed: false,
      nextCa: null,
      preservesPa: true,
      reason: 'profile-not-certified'
    });

    // Sparse attributes (<70% weight coverage) fail closed
    const sparse = evaluatePlayerRca(
      { attributes: { finishing: 18, pace: 17 }, positions: { ST: 20 } },
      { edition: 'FM2013', build: '13.3.3f359652' }
    );
    expect(sparse.status).toBe('insufficient-attributes');
    expect(sparse.advisoryRca).toBeNull();

    // Unsupported edition fails closed
    expect(getRcaEditionProfile('FM2014')).toBeNull();
    const unsupported = evaluatePlayerRca(
      { attributes: buildUniformAttributes(14), positions: { ST: 20 } },
      { edition: 'FM2014', build: '14.3.0' }
    );
    expect(unsupported.status).toBe('unsupported-edition');
    expect(unsupported.advisoryRca).toBeNull();
  });

  it('keeps RCA weight strictly separate from Role Fit and Development Priority in inspectAbilityBudget & evaluateDevelopmentScenario', () => {
    // Flair has high Role Demand (3) for Trequartista, but ZERO RCA CA-cost weight (0)!
    expect(getAttributeRcaWeight('AMC', 'flair', 'FM2013')).toBe(0);
    expect(getAttributeRcaWeight('AMC', 'acceleration', 'FM2013')).toBe(9);

    const attrs = buildUniformAttributes(14, { flair: 12, acceleration: 14 });
    const player: Pick<PlayerExport, 'attributes' | 'positions' | 'leftFoot' | 'rightFoot' | 'actualCa' | 'potentialAbility'> = {
      attributes: attrs,
      positions: { AMC: 20 },
      leftFoot: 14,
      rightFoot: 18,
      actualCa: 145,
      potentialAbility: 165
    };

    const budget = inspectAbilityBudget('FM2013', '13.3.3f359652', 145, 165, player);
    expect(budget.recommendedCa).toBeNull();
    expect(budget.autoMatchAvailable).toBe(false);
    expect(budget.advisoryRca).not.toBeNull();

    // Raising Flair from 12 -> 18 increases Role Fit for Trequartista, while Advisory RCA Delta is 0!
    const flairScenario = evaluateDevelopmentScenario(player, 'FM2013', '13.3.3f359652', {
      target: { position: 'AMC', roleId: 'trequartista', duty: 'attack' },
      benchmark: 18,
      overrides: { flair: 18 },
      locked: []
    })!;
    expect(flairScenario.after.score!).toBeGreaterThan(flairScenario.before.score!);
    expect(flairScenario.advisoryRcaDelta).toBe(0);
    expect(flairScenario.rows.find(r => r.key === 'flair')?.rcaWeight).toBe(0);
  });
});
