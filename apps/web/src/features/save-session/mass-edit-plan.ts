import type { DecodedSaveDatabase, PlayerDraftPatch } from '@managerhub/domain/fm2013-offline';

import { classifyNumericChanges } from './numeric-mass-edit';

type Player = DecodedSaveDatabase['players'][number];
type ScopePlayer = Pick<Player, 'uid' | 'clubUid' | 'calendarAge' | 'actualCa' | 'morale'>;
interface MassEditInputs {
  readonly club: string;
  readonly maximumAge: string;
  readonly morale: string;
  readonly actualCa: string;
}

function optionalInt(raw: string, minimum: number, maximum: number): number | null | undefined {
  const value = raw.trim();
  if (!value) return undefined;
  if (!/^\d+$/u.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= minimum && number <= maximum ? number : null;
}

export function planMassEdit<T extends ScopePlayer>(players: readonly T[], inputs: MassEditInputs) {
  const clubUid = inputs.club === 'all' ? undefined : optionalInt(inputs.club, 1, Number.MAX_SAFE_INTEGER);
  const maximumAge = optionalInt(inputs.maximumAge, 14, 99);
  const morale = optionalInt(inputs.morale, 1, 20);
  const actualCa = optionalInt(inputs.actualCa, 1, 200);
  const valid = (inputs.club === 'all' || typeof clubUid === 'number') &&
    maximumAge !== null && morale !== null && actualCa !== null;
  const patch: PlayerDraftPatch | null = valid && (morale !== undefined || actualCa !== undefined)
    ? { ...(typeof morale === 'number' ? { morale } : {}), ...(typeof actualCa === 'number' ? { actualCa } : {}) }
    : null;
  const matches = valid ? players.filter(player =>
    (clubUid === undefined || player.clubUid === clubUid) &&
    (maximumAge === undefined || (player.calendarAge !== null && player.calendarAge <= maximumAge))
  ) : [];
  const changes: T[] = [];
  let unavailable = 0;
  let unchanged = 0;
  if (patch) for (const player of matches) {
    const status = classifyNumericChanges([
      ...(patch.actualCa === undefined ? [] : [{ before: player.actualCa, after: patch.actualCa }]),
      ...(patch.morale === undefined ? [] : [{ before: player.morale, after: patch.morale }])
    ]);
    if (status === 'unavailable') unavailable++;
    else if (status === 'unchanged') unchanged++;
    else changes.push(player);
  }
  return { valid, patch, matches, changes, unavailable, unchanged };
}
