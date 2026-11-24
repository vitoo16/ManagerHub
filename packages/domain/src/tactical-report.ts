import { FORMATIONS, type SquadSolution } from './squad-optimizer';
import { diagnoseTacticalScenario } from './tactical-diagnostics';
import { tacticalPosition, type TacticalScenario } from './tactical-scenarios';
import type { SquadPlanKey } from './squad-scenarios';

/** A manager-authored scenario export; never a native FM tactic or save writer. */
const columns = [
  'Plan', 'Formation', 'Section', 'Phase', 'Slot', 'Player', 'Value',
  'Evidence', 'Model', 'Limitations'
] as const;
const disclaimer = 'Manager-authored scenario, not native FM2013 tactics, CA/PA or predicted match outcomes.';

function cell(value: string | number): string {
  let text = String(value);
  // Prevent spreadsheet formula evaluation in imported player names and labels.
  // eslint-disable-next-line no-control-regex
  if (/^[\u0000-\u0020]*[=+@-]/u.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}

export function createTacticalScenarioCsv(
  plan: SquadPlanKey, scenario: TacticalScenario, solution: SquadSolution | null
): string {
  const slots = FORMATIONS[scenario.formation];
  const report = diagnoseTacticalScenario(scenario, solution);
  const assigned = new Map(
    solution?.formation === scenario.formation ? solution.lineup.map(entry => [entry.slot.id, entry.name] as const) : []
  );
  const rows: (string | number)[][] = [[...columns]];
  const add = (section: string, phase: string, slot: string, player: string, value: string, evidence: string) =>
    rows.push([plan, scenario.formation, section, phase, slot, player, value, evidence, report.model, disclaimer]);

  add('Lineup', '', '', '', report.lineupEvidence, 'imported player export / heuristic XI');
  for (const [key, value] of Object.entries(scenario.instructions)) {
    add('Instruction', '', '', '', key + '=' + value, 'manager-authored');
  }
  for (const phase of ['possession', 'defending'] as const) {
    for (const slot of slots) {
      const point = tacticalPosition(scenario, phase, slot.id);
      add('Position', phase, slot.label, assigned.get(slot.id) ?? 'Unassigned',
        'x=' + point.x + ';y=' + point.y, 'manager-authored pitch grid 1..19');
    }
  }
  for (const finding of report.diagnostics) {
    add('Diagnostic', '', finding.id, '', finding.title + ' | ' + finding.trigger +
      ' | Consider: ' + finding.adjustment + ' | Limit: ' + finding.limitation,
    'deterministic tactical geometry rule');
  }
  if (report.diagnostics.length === 0) {
    add('Diagnostic', '', '', '', 'No risks detected by this rule set; other risks are not assessed.',
      'deterministic tactical geometry rule');
  }
  return '\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n') + '\r\n';
}

export function tacticalReportFilename(fileName: string, plan: SquadPlanKey): string {
  const base = fileName.replace(/\.[^.]+$/u, '').replace(/[^a-zA-Z0-9_-]+/gu, '-')
    .replace(/^-+|-+$/gu, '').slice(0, 48) || 'roster';
  return 'ManagerHub-' + base + '-tactical-' + plan + '.csv';
}
