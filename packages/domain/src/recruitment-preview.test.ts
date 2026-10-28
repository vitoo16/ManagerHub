import { describe, expect, it } from 'vitest';
import { ATTRIBUTE_GROUPS, type AttributeKey, type PlayerExport } from './player-import';
import { assessSquadContribution } from './recruitment-preview';

const allKeys = [...new Set(Object.values(ATTRIBUTE_GROUPS).flat())] as AttributeKey[];
const attributes = Object.fromEntries(allKeys.map(key => [key, 15])) as Record<AttributeKey, number>;
const weakerAttributes = Object.fromEntries(allKeys.map(key => [key, 10])) as Record<AttributeKey, number>;
function player(id: string, position: string, observed = attributes): PlayerExport {
  return { id, name: id, position, age: 24, club: 'Example Club', nationality: null,
    attributes: observed, source: 'game_export', verification: 'provisional' };
}
const startingEleven = [
  player('goalkeeper', 'GK'), player('left-back', 'D (L)'), player('centre-back-a', 'D (C)'),
  player('centre-back-b', 'D (C)'), player('right-back', 'D (R)'), player('cm-a', 'M (C)'),
  player('cm-b', 'M (C)'), player('cm-c', 'M (C)'), player('left-wing', 'AM (L)'),
  player('right-wing', 'AM (R)'), player('striker', 'ST (C)')
];

describe('same-export squad contribution preview', () => {
  it('compares the best XI with and without a selected player when a replacement exists', () => {
    const roster = [...startingEleven, player('reserve-cm', 'M (C)', weakerAttributes)];
    const result = assessSquadContribution(roster, 'cm-b', '4-3-3');
    expect(result.status).toBe('comparison-ready');
    expect(result.baseline?.complete).toBe(true);
    expect(result.withoutPlayer?.complete).toBe(true);
    expect(result.assignment?.playerId).toBe('cm-b');
    expect(result.changedSlots).toBeGreaterThan(0);
    expect(result.roleFitDelta).not.toBeNull();
    expect(result.roleFitDelta!).toBeGreaterThanOrEqual(0);
  });

  it('explains when the imported pool depends on this player to complete eleven', () => {
    const result = assessSquadContribution(startingEleven, 'goalkeeper', '4-3-3');
    expect(result.status).toBe('required-for-complete-xi');
    expect(result.assignment?.slot.id).toBe('gk');
    expect(result.withoutPlayer?.complete).toBe(false);
    expect(result.roleFitDelta).toBeNull();
  });

  it('does not claim a contribution when the player is outside the best XI', () => {
    const roster = [...startingEleven, player('reserve-cm', 'M (C)', weakerAttributes)];
    const result = assessSquadContribution(roster, 'reserve-cm', '4-3-3');
    expect(result.status).toBe('not-selected');
    expect(result.assignment).toBeNull();
    expect(result.roleFitDelta).toBeNull();
    expect(result.changedSlots).toBeNull();
  });

  it('returns per-slot coverage diagnostics instead of guessing an incomplete XI', () => {
    const sparse = startingEleven.map(item => ({ ...item, attributes: { passing: 18 } }));
    const result = assessSquadContribution(sparse, 'goalkeeper', '4-3-3');
    expect(result.status).toBe('insufficient-data');
    expect(result.baseline?.complete).toBe(false);
    expect(result.baseline?.diagnostics.some(item => item.scoredCandidates === 0)).toBe(true);
    expect(result.roleFitDelta).toBeNull();
  });

  it('rejects an identity that is not part of the current import', () => {
    const result = assessSquadContribution(startingEleven, 'other-career-player', '4-3-3');
    expect(result.status).toBe('player-not-found');
    expect(result.baseline).toBeNull();
    expect(result.roleFitDelta).toBeNull();
  });
});
