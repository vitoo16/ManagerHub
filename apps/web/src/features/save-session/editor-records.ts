import type { DecodedSaveDatabase } from '@managerhub/domain/fm2013-offline';

export type EditorRecordKind = 'player' | 'staff' | 'club' | 'stadium';
export type EditorRecordTarget = { readonly kind: EditorRecordKind; readonly uid: number };
export type EditorModalTarget = EditorRecordTarget | { readonly kind: 'mass_edit' } | { readonly kind: 'save_as' };
export const MAX_EDITOR_RECORDS = 12;
export const MAX_EDITOR_SEARCH_RESULTS = 24;

export interface EditorRecordState {
  readonly records: readonly EditorRecordTarget[];
  readonly active: EditorRecordTarget;
}

export const recordKey = (record: EditorRecordTarget): string => `${record.kind}:${record.uid}`;
export const isRecordTarget = (target: EditorModalTarget): target is EditorRecordTarget => 'uid' in target;

export function createRecordState(record: EditorRecordTarget): EditorRecordState {
  return { records: [record], active: record };
}

export function openEditorRecord(state: EditorRecordState, record: EditorRecordTarget): EditorRecordState {
  const existing = state.records.find(item => recordKey(item) === recordKey(record));
  if (existing) return recordKey(state.active) === recordKey(existing) ? state : { ...state, active: existing };
  if (state.records.length >= MAX_EDITOR_RECORDS) return state;
  return { records: [...state.records, record], active: record };
}

export function closeEditorRecord(state: EditorRecordState, record: EditorRecordTarget): EditorRecordState {
  if (state.records.length <= 1) return state;
  const index = state.records.findIndex(item => recordKey(item) === recordKey(record));
  if (index < 0) return state;
  const records = state.records.filter((_, i) => i !== index);
  const active = recordKey(state.active) === recordKey(record)
    ? records[Math.min(index, records.length - 1)]!
    : state.active;
  return { records, active };
}

type RecordDatabase = Pick<DecodedSaveDatabase, 'players' | 'staff' | 'clubs' | 'stadiums'>;

export function recordName(database: RecordDatabase, target: EditorRecordTarget): string {
  switch (target.kind) {
    case 'player': return database.players.find(row => row.uid === target.uid)?.displayName ?? `#${target.uid}`;
    case 'staff': return database.staff.find(row => row.uid === target.uid)?.displayName ?? `#${target.uid}`;
    case 'club': return database.clubs.find(row => row.uid === target.uid)?.fullName ?? `#${target.uid}`;
    case 'stadium': return database.stadiums.find(row => row.uid === target.uid)?.customName ?? `#${target.uid}`;
  }
}

export interface EditorSearchResult {
  readonly target: EditorRecordTarget;
  readonly name: string;
}

function searchRows<Row extends { readonly uid: number }>(
  rows: readonly Row[], kind: EditorRecordKind, query: string, getName: (row: Row) => string
): readonly EditorSearchResult[] {
  const results: EditorSearchResult[] = [];
  const uidQuery = /^#?\d+$/.test(query) ? Number(query.replace(/^#/, '')) : null;
  for (const row of rows) {
    const name = getName(row);
    if (uidQuery !== null ? row.uid !== uidQuery : !name.toLocaleLowerCase().includes(query)) continue;
    results.push({ target: { kind, uid: row.uid }, name });
    if (results.length >= MAX_EDITOR_SEARCH_RESULTS) break;
  }
  return results;
}

/** Search the active decoded source only; never load or persist another database. */
export function searchEditorRecords(database: RecordDatabase, kind: EditorRecordKind, text: string): readonly EditorSearchResult[] {
  const query = text.trim().toLocaleLowerCase();
  if (!query) return [];
  switch (kind) {
    case 'player': return searchRows(database.players, kind, query, row => row.displayName);
    case 'staff': return searchRows(database.staff, kind, query, row => row.displayName);
    case 'club': return searchRows(database.clubs, kind, query, row => row.fullName);
    case 'stadium': return searchRows(database.stadiums, kind, query, row => row.customName ?? `#${row.uid}`);
  }
}
