import { describe, expect, it } from 'vitest';
import { ATTRIBUTE_GROUPS, type AttributeKey, type PlayerExport } from './player-import';
import { assessScoutClubScenario } from './scout-club-scenario';

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

describe('same-export club-group recruitment scenario', () => {
  it('reoptimizes the full XI and replaces a weaker incumbent with an outside candidate', () => {
    const result = assessScoutClubScenario([...club, player('target', 'ST (C)', 'Away', 19)], 'Home', 'target', '4-3-3');
    expect(result.status).toBe('changes-xi');
    expect(result.clubPlayerCount).toBe(11);
    expect(result.before?.complete).toBe(true);
    expect(result.after?.complete).toBe(true);
    expect(result.candidateAssignment?.slot.id).toBe('st');
    expect(result.previousAssignment?.playerId).toBe('st');
    expect(result.roleFitDelta).toBeGreaterThan(0);
    expect(result.changedSlots).toBe(1);
    expect(new Set(result.after?.lineup.map(item => item.playerId)).size).toBe(11);
  });

  it('does not invent a squad improvement for a weak eligible candidate', () => {
    const result = assessScoutClubScenario([...club, player('target', 'ST (C)', 'Away', 1)], 'Home', 'target', '4-3-3');
    expect(result.status).toBe('not-selected');
    expect(result.candidateAssignment).toBeNull();
    expect(result.roleFitDelta).toBe(0);
    expect(result.changedSlots).toBe(0);
  });

  it('recognizes a candidate that fills the only missing slot without inventing a delta', () => {
    const result = assessScoutClubScenario([...club.filter(item => item.id !== 'st'), player('target', 'ST (C)', 'Away')], 'Home', 'target', '4-3-3');
    expect(result.status).toBe('fills-xi-gap');
    expect(result.before?.complete).toBe(false);
    expect(result.after?.complete).toBe(true);
    expect(result.roleFitDelta).toBeNull();
  });

  it('leaves the scenario incomplete when source attributes are too sparse', () => {
    const target = { ...player('target', 'ST (C)', 'Away'), attributes: { passing: 18 } };
    const result = assessScoutClubScenario([...club.filter(item => item.id !== 'st'), target], 'Home', 'target', '4-3-3');
    expect(result.status).toBe('incomplete-xi');
    expect(result.after?.complete).toBe(false);
    expect(result.roleFitDelta).toBeNull();
  });

  it('keeps unknown membership and invalid identities out of the hypothetical transfer', () => {
    expect(assessScoutClubScenario(club, 'Home', 'st', '4-3-3').status).toBe('already-in-club');
    expect(assessScoutClubScenario([...club, player('unknown', 'ST (C)', null)], 'Home', 'unknown', '4-3-3').status).toBe('candidate-club-unknown');
    expect(assessScoutClubScenario(club, 'Missing', 'st', '4-3-3').status).toBe('club-not-found');
    expect(assessScoutClubScenario(club, 'Home', 'missing', '4-3-3').status).toBe('candidate-not-found');
  });
});
