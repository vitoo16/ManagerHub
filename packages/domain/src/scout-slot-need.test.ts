import { describe, expect, it } from 'vitest';
import { ATTRIBUTE_GROUPS, type AttributeKey, type PlayerExport } from './player-import';
import { compareScoutCandidatesForSlot } from './scout-slot-need';

const keys = [...new Set(Object.values(ATTRIBUTE_GROUPS).flat())] as AttributeKey[];
function player(id: string, position: string, club: string | null, value = 15): PlayerExport {
  return {
    id, name: id, position, club, age: 24, nationality: null,
    attributes: Object.fromEntries(keys.map(key => [key, value])),
    source: 'game_export', verification: 'provisional'
  };
}
const club = [
  player('gk', 'GK', 'Home'), player('lb', 'D (L)', 'Home'), player('rb', 'D (R)', 'Home'),
  player('cb1', 'D (C)', 'Home'), player('cb2', 'D (C)', 'Home'),
  player('cm1', 'M (C)', 'Home'), player('cm2', 'M (C)', 'Home'), player('cm3', 'M (C)', 'Home'),
  player('lw', 'AM (L)', 'Home'), player('rw', 'AM (R)', 'Home'),
  player('st', 'ST (C)', 'Home', 5)
];

describe('observed club-group shortlist comparisons by slot', () => {
  it('ranks only source-eligible candidates and shows incumbent fit differences', () => {
    const players = [
      ...club, player('strong', 'ST (C)', 'Away', 19),
      player('weak', 'ST', 'Away', 1), player('cb', 'CB', 'Away', 20),
      { ...player('sparse', 'ST', 'Away'), attributes: { finishing: 19 } },
      player('unknown', 'ST', null),
    ];
    const ids = ['weak', 'cb', 'strong', 'sparse', 'unknown', 'st', 'missing', 'strong'];
    const result = compareScoutCandidatesForSlot(players, 'Home', '4-3-3', 'st', ids);
    expect(result.slot?.roleId).toBe('advanced-forward');
    expect(result.clubPlayerCount).toBe(11);
    expect(result.baseline?.complete).toBe(true);
    expect(result.incumbent?.playerId).toBe('st');
    expect(result.internalDepth?.withoutIncumbent.complete).toBe(false);
    expect(result.internalDepth?.replacement).toBeNull();
    expect(result.internalDepth?.averageRoleFitDelta).toBeNull();
    expect(result.internalDepth?.changedSlots).toBeNull();
    expect(result.candidates).toHaveLength(7);
    expect(result.candidates[0]?.candidateId).toBe('strong');
    const strong = result.candidates[0]!;
    expect(strong.status).toBe('eligible');
    expect(strong.roleFit).toBeGreaterThan(result.incumbent!.roleScore);
    expect(strong.differenceFromIncumbent).toBe(strong.roleFit! - result.incumbent!.roleScore);
    expect(strong.coverage).toBe(1);
    expect(strong.evidence.length).toBeGreaterThan(0);
    expect(result.candidates.find(item => item.candidateId === 'weak')?.differenceFromIncumbent).toBeLessThan(0);
    expect(result.candidates.find(item => item.candidateId === 'cb')?.status).toBe('position-ineligible');
    expect(result.candidates.find(item => item.candidateId === 'sparse')).toMatchObject({
      status: 'insufficient-attributes', roleFit: null, differenceFromIncumbent: null
    });
    expect(result.candidates.find(item => item.candidateId === 'sparse')?.missing.length).toBeGreaterThan(0);
    expect(result.candidates.find(item => item.candidateId === 'unknown')?.status).toBe('candidate-club-unknown');
    expect(result.candidates.find(item => item.candidateId === 'st')?.status).toBe('already-in-club');
    expect(result.candidates.find(item => item.candidateId === 'missing')?.status).toBe('candidate-not-found');
    expect(ids).toHaveLength(8);
  });

  it('suppresses incumbent differences when the observed XI is incomplete', () => {
    const result = compareScoutCandidatesForSlot(
      [club[0]!, player('strong', 'ST', 'Away', 19)], 'Home', '4-3-3', 'st', ['strong']
    );
    expect(result.baseline?.complete).toBe(false);
    expect(result.incumbent).toBeNull();
    expect(result.internalDepth).toBeNull();
    expect(result.candidates[0]).toMatchObject({ status: 'eligible', differenceFromIncumbent: null });
  });

  it('recalculates the full XI for an internal bench replacement', () => {
    const players = [...club, player('bench-st', 'ST (C)', 'Home', 1)];
    const result = compareScoutCandidatesForSlot(players, 'Home', '4-3-3', 'st', []);
    expect(result.incumbent?.playerId).toBe('st');
    expect(result.internalDepth?.withoutIncumbent.complete).toBe(true);
    expect(result.internalDepth?.replacement?.playerId).toBe('bench-st');
    expect(result.internalDepth?.averageRoleFitDelta).toBeLessThan(0);
    expect(result.internalDepth?.changedSlots).toBe(1);
    expect(result.internalDepth?.withoutIncumbent.lineup).not.toContainEqual(
      expect.objectContaining({ playerId: 'st' })
    );
  });

  it('reassigns versatile players across slots to cover an internal absence', () => {
    const midfield = club.map(item => item.position === 'M (C)'
      ? player(item.id, item.position, 'Home', 8) : item);
    const result = compareScoutCandidatesForSlot(
      [...midfield, player('flex', 'CB/CM', 'Home', 20)], 'Home', '4-3-3', 'lcb', []
    );
    expect(['cb1', 'cb2']).toContain(result.incumbent?.playerId);
    expect(result.baseline?.lineup.find(item => item.playerId === 'flex')?.slot.position).toBe('CM');
    expect(result.internalDepth?.withoutIncumbent.complete).toBe(true);
    expect(result.internalDepth?.withoutIncumbent.lineup.find(item => item.playerId === 'flex')?.slot.position).toBe('CB');
    expect(result.internalDepth?.changedSlots).toBeGreaterThan(1);
  });

  it('follows a changed formation and rejects stale or absent club selections', () => {
    const players = [...club, player('defensive', 'DM', 'Away', 17)];
    const second = compareScoutCandidatesForSlot(players, 'Home', '4-2-3-1', 'ldm', ['defensive']);
    expect(second.slot?.position).toBe('DM');
    expect(second.candidates[0]?.status).toBe('eligible');
    expect(second.incumbent).toBeNull();
    expect(second.internalDepth).toBeNull();
    const stale = compareScoutCandidatesForSlot(players, 'Home', '4-2-3-1', 'lcm', ['defensive']);
    expect(stale.slot).toBeNull();
    expect(stale.internalDepth).toBeNull();
    expect(stale.candidates).toHaveLength(0);
    const absent = compareScoutCandidatesForSlot(players, 'Missing Club', '4-3-3', 'st', ['defensive']);
    expect(absent.baseline).toBeNull();
    expect(absent.candidates[0]?.status).toBe('club-not-found');
  });
});
