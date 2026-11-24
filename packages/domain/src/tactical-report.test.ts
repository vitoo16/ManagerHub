import { describe, expect, it } from 'vitest';
import { createTacticalScenarioCsv, tacticalReportFilename } from './tactical-report';
import { defaultTacticalScenario } from './tactical-state';
import { positionTacticalSlot } from './tactical-scenarios';
import { FORMATIONS, type SquadSolution } from './squad-optimizer';

function complete(): SquadSolution {
  return {
    formation: '4-3-3', complete: true,
    lineup: FORMATIONS['4-3-3'].map((slot, index) => ({
      slot, playerId: String(index), name: index === 0 ? '=HYPERLINK("http://bad")' : 'Player ' + index,
      roleScore: 80, coverage: 1
    })),
    diagnostics: [], averageRoleScore: 80, reason: null, model: 'role-fit-heuristic-v1'
  };
}

describe('MH-07 manager-authored tactical CSV', () => {
  it('exports source, model, all 22 phase markers and instructions without claiming native tactics', () => {
    const output = createTacticalScenarioCsv('A', defaultTacticalScenario('4-3-3'), complete());
    expect(output).toMatch(/^\uFEFF"Plan","Formation"/u);
    expect(output).toContain('"possession"');
    expect(output).toContain('"defending"');
    expect(output).toContain('defensiveLine=balanced');
    expect(output).toContain('managerhub.tactical-diagnostics.v1');
    expect(output).toContain('not native FM2013 tactics');
    expect(output.split('\r\n').filter(line => line.includes('"Position"')).length).toBe(22);
    expect(output).not.toContain('"=HYPERLINK');
    expect(output).toContain("'=HYPERLINK");
  });

  it('documents and scopes a high-line warning to only the current plan', () => {
    const neutral = defaultTacticalScenario('4-3-3');
    const risky = { ...neutral, instructions: { ...neutral.instructions, defensiveLine: 'high' as const, pressing: 'low' as const } };
    const output = createTacticalScenarioCsv('B', risky, complete());
    expect(output).toContain('High line with low pressing');
    expect(output).toContain('Consider:');
    expect(output).toContain('Limit:');
    expect(output).not.toContain('"A","4-3-3"');
  });

  it('does not attribute an incomplete lineup to a real full XI', () => {
    const output = createTacticalScenarioCsv('A', defaultTacticalScenario('4-3-3'), null);
    expect(output).toContain('incomplete-xi');
    expect(output).toContain('Unassigned');
    expect(output).not.toContain('High line with low pressing');
  });

  it('includes edited phase coordinates and sanitizes export names', () => {
    const edited = positionTacticalSlot(defaultTacticalScenario('4-3-3'), 'defending', 'rb', { x: 10, y: 12 });
    const output = createTacticalScenarioCsv('B', edited, complete());
    expect(output).toContain('x=10;y=12');
    expect(tacticalReportFilename('../../evil.csv', 'B')).toBe('ManagerHub-evil-tactical-B.csv');
  });

  it('handles formation mismatch between solution and scenario safely', () => {
    const mismatchSolution: SquadSolution = {
      ...complete(),
      formation: '4-2-3-1',
      lineup: FORMATIONS['4-2-3-1'].map((slot, index) => ({
        slot, playerId: String(index), name: 'Player ' + index, roleScore: 80, coverage: 1
      }))
    };
    const output = createTacticalScenarioCsv('A', defaultTacticalScenario('4-3-3'), mismatchSolution);
    expect(output).toContain('incomplete-xi');
    expect(output).toContain('Unassigned');
  });
});
