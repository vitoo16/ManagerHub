import { describe, expect, it } from 'vitest';
import { canOpenEditorRecord, closeEditorRecord, createRecordState, MAX_EDITOR_RECORDS, MAX_EDITOR_SEARCH_RESULTS, openEditorRecord, recordKey, recordName, searchEditorRecords, type EditorRecordTarget } from './editor-records';

const player = (uid: number): EditorRecordTarget => ({ kind: 'player', uid });
const club: EditorRecordTarget = { kind: 'club', uid: 1 };

describe('editor record navigation', () => {
  it('distinguishes entity kinds even with the same native UID and never duplicates open records', () => {
    const initial = createRecordState(player(1));
    const next = openEditorRecord(initial, club);
    expect(next.records.map(recordKey)).toEqual(['player:1', 'club:1']);
    expect(next.active).toEqual(club);
    const reopened = openEditorRecord(next, player(1));
    expect(reopened.records).toEqual(next.records);
    expect(reopened.active).toEqual(player(1));
  });

  it('selects a neighboring record when closing the active one and retains the final record', () => {
    const first = createRecordState(player(1));
    const second = openEditorRecord(first, player(2));
    const third = openEditorRecord(second, club);
    const closed = closeEditorRecord(third, player(2));
    expect(closed.active).toEqual(club);
    const remaining = closeEditorRecord(closed, club);
    expect(remaining.active).toEqual(player(1));
    expect(closeEditorRecord(remaining, player(1))).toBe(remaining);
  });

  it('bounds open records but still allows switching to an existing record', () => {
    let state = createRecordState(player(1));
    for (let uid = 2; uid <= MAX_EDITOR_RECORDS; uid++) state = openEditorRecord(state, player(uid));
    expect(canOpenEditorRecord(null, club)).toBe(true);
    expect(canOpenEditorRecord(state, club)).toBe(false);
    expect(canOpenEditorRecord(state, player(1))).toBe(true);
    expect(openEditorRecord(state, club)).toBe(state);
    const switched = openEditorRecord(state, player(1));
    expect(switched.active).toEqual(player(1));
    expect(switched.records).toHaveLength(MAX_EDITOR_RECORDS);
  });
});

describe('active save record search', () => {
  const database = {
    players: Array.from({ length: 40 }, (_, i) => ({ uid: i + 1, displayName: `Player ${i + 1}` })),
    staff: [{ uid: 1, displayName: 'Staff One' }],
    clubs: [{ uid: 1, fullName: 'Northbridge Athletic' }],
    stadiums: [{ uid: 5, customName: null }]
  };

  it('limits result count and does not enumerate an empty query', () => {
    expect(searchEditorRecords(database, 'player', '   ')).toEqual([]);
    expect(searchEditorRecords(database, 'player', 'PLAYER')).toHaveLength(MAX_EDITOR_SEARCH_RESULTS);
    expect(searchEditorRecords(database, 'player', 'unmatched')).toEqual([]);
  });

  it('matches exact numeric UIDs, entity types and only the provided database', () => {
    expect(searchEditorRecords(database, 'player', '#1')).toEqual([{ target: player(1), name: 'Player 1' }]);
    expect(searchEditorRecords(database, 'club', ' northbridge ')).toEqual([{ target: club, name: 'Northbridge Athletic' }]);
    expect(searchEditorRecords(database, 'staff', '1')).toEqual([{ target: { kind: 'staff', uid: 1 }, name: 'Staff One' }]);
    expect(searchEditorRecords({ ...database, clubs: [] }, 'club', '#1')).toEqual([]);
    expect(recordName(database, { kind: 'stadium', uid: 5 })).toBe('#5');
  });
});
