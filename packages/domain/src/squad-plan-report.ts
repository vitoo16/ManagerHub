import { FORMATIONS } from './squad-optimizer';
import type { SquadSolution } from './squad-optimizer';
import type { PlayerDataset } from './player-import';
import type { SquadPlanKey } from './squad-scenarios';
import { ROLE_PROFILES } from './player-analysis';

/** User-triggered CSV; never a game-save export, hidden-attribute dump or CA/PA report. */
const columns = [
  'Plan', 'Formation', 'Status', 'Slot', 'Player', 'Role',
  'Role fit (heuristic)', 'Attribute coverage (%)', 'Data source', 'Interpretation'
] as const;
const explanation = 'User-exported provisional attributes; role-fit heuristic only. Not CA/PA or predicted match performance.';
const roles = new Map(ROLE_PROFILES.map(role => [role.id, role.title] as const));

function csvCell(value: string | number): string {
  let text = String(value);
  // Excel/Sheets can evaluate leading spreadsheet formulas in user-controlled names.
  // eslint-disable-next-line no-control-regex
  if (/^[\u0000-\u0020]*[=+@-]/u.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}

function isSupportedSquadReportSource(dataset: PlayerDataset): boolean {
  if (dataset.source === 'game_export') {
    return dataset.actualCaAvailable === false && dataset.potentialAbilityAvailable === false;
  }
  if (dataset.source === 'decoded_save') {
    return typeof dataset.saveId === 'string' && /^[a-f0-9]{64}$/u.test(dataset.saveId);
  }
  return false;
}

export function createSquadPlansCsv(
  dataset: PlayerDataset,
  solutions: Readonly<Record<SquadPlanKey, SquadSolution>>
): string {
  if (!isSupportedSquadReportSource(dataset)) throw new Error('Unsupported source');
  const sourceLabel = dataset.source === 'decoded_save'
    ? `decoded_save (${dataset.saveEdition ?? 'FM2013'}${dataset.saveBuild ? ' ' + dataset.saveBuild : ''} · ${dataset.saveMode ?? 'realism'})`
    : 'game_export (provisional)';
  const interpretation = dataset.source === 'decoded_save'
    ? 'Visible attributes decoded offline from .fm save; role-fit heuristic only. Not CA/PA or predicted match performance.'
    : explanation;
  const rows: (string | number)[][] = [[...columns]];
  for (const key of ['A', 'B'] as const) {
    const solution = solutions[key];
    const slots = FORMATIONS[solution.formation];
    const bySlot = new Map(solution.lineup.map(item => [item.slot.id, item] as const));
    for (const slot of slots) {
      const assigned = solution.complete ? bySlot.get(slot.id) : undefined;
      rows.push([
        key, solution.formation, solution.complete ? 'Complete' : 'Incomplete',
        slot.label, assigned?.name ?? '', roles.get(slot.roleId) ?? slot.roleId,
        assigned?.roleScore ?? '', assigned ? Math.round(assigned.coverage * 100) : '',
        sourceLabel, interpretation
      ]);
    }
  }
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/** Avoid user-supplied paths and confusing extensions in the local download name. */
export function squadReportFilename(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/u, '')
    .replace(/[^a-zA-Z0-9_-]+/gu, '-')
    .replace(/^-+|-+$/gu, '').slice(0, 48) || 'roster';
  return 'ManagerHub-' + base + '-plans.csv';
}
