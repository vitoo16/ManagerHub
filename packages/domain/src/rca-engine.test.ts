import { describe, expect, it } from 'vitest';
import type { AttributeKey, PlayerExport } from './player-import';
import {
  evaluateFootAbility,
  evaluatePlayerRca,
  FMRTE26_RCA_ARCHETYPES,
  getAttributeRcaWeight,
  getRcaEditionProfile,
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

describe('FMRTE 26 RCA reference weights', () => {
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

describe('Synthetic perturbation and regression tests (not FMRTE parity)', () => {
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
      { edition: 'FM2013', build: '13.3.3f359652' }
    );
    const twoFootedSt = evaluatePlayerRca(
      { attributes: attrs, positions: { ST: 20 }, leftFoot: 20, rightFoot: 20 },
      { edition: 'FM2013', build: '13.3.3f359652' }
    );
    const oneFootedGk = evaluatePlayerRca(
      { attributes: attrs, positions: { GK: 20 }, leftFoot: 1, rightFoot: 20 },
      { edition: 'FM2013', build: '13.3.3f359652' }
    );
    const twoFootedGk = evaluatePlayerRca(
      { attributes: attrs, positions: { GK: 20 }, leftFoot: 20, rightFoot: 20 },
      { edition: 'FM2013', build: '13.3.3f359652' }
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
    expect(getAttributeRcaWeight('AMC', 'flair', 'FM2013', '13.3.3f359652')).toBe(0);
    expect(getAttributeRcaWeight('AMC', 'acceleration', 'FM2013', '13.3.3f359652')).toBe(9);

    const attrs = buildUniformAttributes(14, { flair: 12, acceleration: 14 });
    const player: Pick<PlayerExport, 'attributes' | 'positions' | 'leftFoot' | 'rightFoot' | 'actualCa' | 'potentialAbility'> = {
      attributes: attrs,
      positions: { AMC: 20 },
      leftFoot: 14,
      rightFoot: 18,
      actualCa: 145,
      potentialAbility: 165
    };

    const budget = inspectAbilityBudget('FM2013', '13.3.3f359652', 145, 165, 'editor', player);
    expect(budget.recommendedCa).toBeNull();
    expect(budget.autoMatchAvailable).toBe(false);
    expect(budget.advisoryRca).not.toBeNull();

    // Raising Flair from 12 -> 18 increases Role Fit for Trequartista, while Advisory RCA Delta is 0!
    const flairScenario = evaluateDevelopmentScenario(player, 'FM2013', '13.3.3f359652', {
      target: { position: 'AMC', roleId: 'trequartista', duty: 'attack' },
      benchmark: 18,
      overrides: { flair: 18 },
      locked: []
    }, 'editor')!;
    expect(flairScenario.after.score!).toBeGreaterThan(flairScenario.before.score!);
    expect(flairScenario.advisoryRcaDelta).toBe(0);
    expect(flairScenario.rows.find(r => r.key === 'flair')?.rcaWeight).toBe(0);
  });
});

describe('Independent arithmetic vectors and compatibility guard', () => {
  // Decimal arithmetic, independent of the engine: ST positive weights=116, WF=7.5.
  // Missing acceleration (10) and pace (7) leaves 99 observed attribute weight.
  // With WF=8: sum=99*12+7.5*8=1248; mean=1248/106.5; round(-90.64+17.7*mean)=117.
  // Without WF: sum=1188; mean=12; round(-90.64+17.7*12)=122.
  it.each([
    { rightFoot: 20, leftFoot: 8, expected: 117, sum: 1248, mean: 11.7183, coverage: 106.5 / 123.5 },
    { rightFoot: 20, leftFoot: null, expected: 122, sum: 1188, mean: 12, coverage: 99 / 123.5 }
  ])('normalizes partial observations including weaker-foot missingness ($leftFoot)', vector => {
    const attrs: Partial<Record<AttributeKey, number>> = buildUniformAttributes(12);
    delete attrs.acceleration;
    delete attrs.pace;
    const report = evaluatePlayerRca({
      attributes: attrs, positions: { ST: 20 }, leftFoot: vector.leftFoot, rightFoot: vector.rightFoot
    }, { edition: 'FM2013', build: '13.3.3f359652' });
    expect(report.advisoryRca).toBe(vector.expected);
    expect(report.rawWeightedSum).toBe(vector.sum);
    expect(report.weightedMeanRating).toBe(vector.mean);
    expect(report.observedWeightCoverage).toBeCloseTo(vector.coverage, 12);
    expect(report.attributeRows.find(row => row.key === 'acceleration')?.marginalAdvisoryCaPerStep).toBeNull();
    expect(report.groupWeightedTotals?.WeakerFoot).toBe(vector.leftFoot === null ? 0 : 60);
    expect(report.autoMatchDecision).toMatchObject({ allowed: false, nextCa: null, preservesPa: true });
  });

  // Independent affine calculation at mean=12 (all attributes and both feet 12).
  // Expected values are rounded/clamped decimal arithmetic using the historical coefficient table,
  // not captured game RCA nor generated by evaluatePlayerRca.
  it.each([
    ['GK', 127], ['DC', 123], ['DL', 120], ['WBL', 123], ['DM', 121],
    ['MC', 118], ['ML', 123], ['AMC', 121], ['AML', 124], ['ST', 122]
  ] as const)('matches independent uniform arithmetic for %s', (position, expected) => {
    const report = evaluatePlayerRca({
      attributes: buildUniformAttributes(12), positions: { [position]: 20 }, leftFoot: 12, rightFoot: 12
    }, { edition: 'FM2013', build: '13.3.3f359652' });
    expect(report.advisoryRca).toBe(expected);
    expect(report.weightedMeanRating).toBe(12);
    expect(report.observedWeightCoverage).toBe(1);
  });

  it('selects highest rounded natural candidate, without an invented versatility surcharge', () => {
    const report = evaluatePlayerRca({
      attributes: buildUniformAttributes(12), positions: { DC: 20, ST: 20, AML: 20, MC: 16 },
      leftFoot: 12, rightFoot: 12
    }, { edition: 'FM2013', build: '13.3.3f359652' });
    expect(report.candidateScores.map(candidate => [candidate.position, candidate.advisoryRca])).toEqual([
      ['AML', 124], ['DC', 123], ['ST', 122]
    ]);
    expect(report.advisoryRca).toBe(124);
    expect(report.accomplishedPositions).toEqual(['MC']);
  });

  it('does not silently substitute edition/build/position or treat missing weight as zero', () => {
    const player = { attributes: buildUniformAttributes(12), positions: { ST: 20 } };
    expect(evaluatePlayerRca(player).status).toBe('unknown-edition');
    expect(evaluatePlayerRca(player, { edition: 'FM2013' }).status).toBe('unknown-build');
    expect(evaluatePlayerRca(player, { edition: 'FM2013', build: '13.9.9' }).status).toBe('unsupported-build');
    expect(evaluatePlayerRca(player, { edition: 'FM2026', build: '26.3.2' })).toMatchObject({
      status: 'reference-only', advisoryRca: null, autoMatchDecision: { allowed: false }
    });
    const fm26 = { edition: 'FM2026', build: '26.3.2' } as const;
    expect(evaluatePlayerRca({ ...player, positions: { SW: 20 } }, fm26).status).toBe('unsupported-position');
    expect(evaluatePlayerRca(player, { ...fm26, targetPositionOverride: 'SW' }).status).toBe('unsupported-position');
    expect(getAttributeRcaWeight('SW', 'passing', 'FM2026', '26.3.2')).toBeNull();
    expect(getAttributeRcaWeight('ST', 'flair', null, null)).toBeNull();
    expect(getAttributeRcaWeight('ST', 'flair', 'FM2013', 'unknown')).toBeNull();
    expect(getAttributeRcaWeight('ST', 'unmapped' as AttributeKey, 'FM2013', '13.3.3')).toBeNull();
    expect(getAttributeRcaWeight('GK', 'finishing', 'FM2013', '13.3.3')).toBe(0);
  });

  it.each(['realism', 'export'] as const)('does not evaluate or disclose ability diagnostics in %s even given unredacted input', visibility => {
    const player = { attributes: buildUniformAttributes(15), positions: { ST: 20 }, leftFoot: 15, rightFoot: 20,
      actualCa: 155, potentialAbility: 170 };
    const scenario = { target: { position: 'ST', roleId: 'poacher', duty: 'attack' }, benchmark: 18,
      overrides: { finishing: 18 }, locked: [] } as const;
    const result = evaluateDevelopmentScenario(player, 'FM2013', '13.3.3f359652', scenario, visibility)!;
    expect(result.budget).toMatchObject({ reason: 'restricted', remainingPotential: null, advisoryRca: null,
      caMinusAdvisoryRca: null, paMinusAdvisoryRca: null, rcaDiagnostics: null, autoMatchAvailable: false });
    expect(result).toMatchObject({ rcaBefore: null, rcaAfter: null, advisoryRcaBefore: null,
      advisoryRcaAfter: null, advisoryRcaDelta: null, advisoryExceedsPa: false });
    expect(result.rows.every(row => row.rcaWeight === null)).toBe(true);
    expect(result.after.score).toBeGreaterThan(result.before.score!);
  });
});
