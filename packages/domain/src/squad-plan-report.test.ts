import { describe, expect, it } from 'vitest';
import { createSquadPlansCsv, squadReportFilename } from './squad-plan-report';
import { optimizeSquad } from './squad-optimizer';
import type { PlayerDataset, PlayerExport } from './player-import';
import type { SquadSolution } from './squad-optimizer';

function player(id: string, pos: string, name = id): PlayerExport {
  return { id, name, position: pos, age: 25, club: null, nationality: null,
    attributes: {
      finishing: 15, offTheBall: 15, acceleration: 15, pace: 15,
      anticipation: 15, composure: 15, firstTouch: 15,
      strength: 15, heading: 15, jumpingReach: 15, bravery: 15, teamwork: 15,
      dribbling: 15, crossing: 15, agility: 15, passing: 15, vision: 15,
      decisions: 15, technique: 15, flair: 15, stamina: 15, workRate: 15,
      positioning: 15, tackling: 15, marking: 15, concentration: 15,
      handling: 15, reflexes: 15, oneOnOnes: 15, aerialReach: 15, communication: 15
    },
    source: 'game_export', verification: 'provisional' };
}
const list = [
  player('gk', 'GK'), player('lb', 'D (L)'), player('rb', 'D (R)'),
  player('cb1', 'D (C)'), player('cb2', 'D (C)'),
  player('cm1', 'M (C)'), player('cm2', 'M (C)'), player('cm3', 'M (C)'),
  player('lw', 'AM (L)'), player('rw', 'AM (R)'), player('st', 'ST (C)', '=HYPERLINK("bad")')
];
const input: PlayerDataset = {
  fileName: 'FC Safe Export.csv', importedAt: '2026-11-21T01:00:00.000Z',
  players: list, source: 'game_export',
  attributeColumns: ['passing'], warnings: [],
  actualCaAvailable: false, potentialAbilityAvailable: false
};
function plans(): { A: SquadSolution; B: SquadSolution } {
  return {
    A: optimizeSquad(list, '4-3-3'),
    B: optimizeSquad(list, '4-2-3-1')
  };
}

describe('downloadable Squad Planner report', () => {
  it('contains both formations with explicit source and no invented CA or PA', () => {
    const text = createSquadPlansCsv(input, plans());
    expect(text).toMatch(/^\uFEFF"Plan","Formation"/u);
    expect(text).toContain('"A","4-3-3"');
    expect(text).toContain('"B","4-2-3-1"');
    expect(text).toContain('"game_export (provisional)"');
    expect(text).toContain('"Role fit (heuristic)"');
    expect(text).toContain('Not CA/PA or predicted match performance');
    expect(text.split('\r\n').length).toBe(24);
    expect(text).not.toContain('"Actual CA"');
    expect(text).not.toContain('"Potential Ability"');
  });
  it('neutralizes formula-injection in a CSV player cell', () => {
    const text = createSquadPlansCsv(input, plans());
    expect(text).not.toContain('"=HYPERLINK');
    expect(text).toContain("'=HYPERLINK");
  });
  it('does not fill missing players when a formation cannot be completed', () => {
    const empty = optimizeSquad([], '4-3-3');
    const text = createSquadPlansCsv(input, { A: empty, B: empty });
    expect(text).toContain('"Incomplete"');
    expect(text).not.toContain('"=HYPERLINK');
  });
  it('generates a path-safe report name', () => {
    expect(squadReportFilename('../hi??/squad.csv')).toBe('ManagerHub-hi-squad-plans.csv');
    expect(squadReportFilename('')).toBe('ManagerHub-roster-plans.csv');
  });
});
