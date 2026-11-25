import { describe, expect, it } from 'vitest';
import { closeEditorRecord, createRecordState, MAX_EDITOR_RECORDS, openEditorRecord, recordKey, type EditorRecordTarget } from './editor-records';

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
    expect(openEditorRecord(state, club)).toBe(state);
    const switched = openEditorRecord(state, player(1));
    expect(switched.active).toEqual(player(1));
    expect(switched.records).toHaveLength(MAX_EDITOR_RECORDS);
  });
});
