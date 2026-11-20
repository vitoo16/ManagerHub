import { describe, expect, it } from 'vitest';
import profile from './fm2013-live-profile.json' with { type: 'json' };
import { parseFm2013LiveCapture, type LiveSnapshotContext } from './live-snapshot';

const imagePath = 'C:\\Games\\Football Manager 2013\\fm.exe';
const context: LiveSnapshotContext = { snapshotId: 'snapshot-a', careerId: 'declared-career-a', capturedAt: '2026-10-31T09:00:00.000Z', mode: 'editor' };
function player(nativeId = 42) {
  return { nativeId, firstName: 'Synthetic', lastName: 'Example', attributeBytes: profile.attributes.map(() => 75), positionBytes: profile.positions.map(() => 0), club: { nativeId: 77, name: 'Synthetic Club', relation: 'player_team_pointer' } };
}
function pass(nativeKind: 'player' | 'playerStaff' = 'player', records = [player()]) {
  return { nativeKind, imageTypeMetadataVerified: true, coverage: { bytesScanned: 4096, matches: records.length, rejected: 0, duplicates: 0, faultCount: 0,
    stopReason: null as string | null, selectedMappingsExhausted: true, elapsedMs: 20 }, records };
}
function capture() {
  return { schema: profile.schema, profileVersion: profile.profileVersion,
    target: { pid: 101, arch: 'ia32', pointerSize: 4, imagePath: imagePath, binarySha256: profile.binarySha256 },
    passes: [pass(), pass('playerStaff', [player(43)])] };
}
const parse = (value: unknown, declared = context) => parseFm2013LiveCapture(JSON.stringify(value), declared);
function captureWithBiography(birthDateBytes: unknown = [59, 0, 208, 7], primaryNation: unknown = { nativeId: 88, name: 'Synthetic Nation' }) {
  const input = capture();
  return { ...input, passes: input.passes.map(scan => ({ ...scan, records: scan.records.map(p => ({ ...p, birthDateBytes, primaryNation })) })) };
}

describe('captured game date and derived calendar age', () => {
  it('uses the decoded game date, labels the model and never uses capture time as age', () => {
    const input = { ...captureWithBiography(), gameDateBytes: [59, 0, 209, 7] };
    const result = parse(input);
    expect(result.status).toBe('ready');
    expect(result.snapshot?.gameDate).toMatchObject({ value: '2001-03-01', source: 'live_game', verification: 'provisional' });
    expect(result.snapshot?.players[0]?.calendarAge).toMatchObject({ value: 1, source: 'derived_model', verification: 'provisional',
      modelVersion: 'gregorian-month-day-v1', asOf: 'snapshot_game_date', missingReason: null });
    expect(parse(input, { ...context, capturedAt: '2030-01-01T00:00:00Z' }).snapshot?.players[0]?.calendarAge.value).toBe(1);
    expect(result.snapshot?.players[0]).not.toHaveProperty('actualAge');
    expect(Object.isFrozen(result.snapshot?.gameDate)).toBe(true);
    expect(Object.isFrozen(result.snapshot?.players[0]?.calendarAge)).toBe(true);
  });
  it('keeps legacy, invalid calendar, missing DOB and future DOB unknown instead of zero', () => {
    expect(parse(captureWithBiography()).snapshot?.gameDate).toMatchObject({ value: null, missingReason: 'not_decoded' });
    expect(parse(captureWithBiography()).snapshot?.players[0]?.calendarAge).toMatchObject({ value: null, source: 'derived_model', missingReason: 'not_decoded' });
    for (const input of [
      { ...captureWithBiography(), gameDateBytes: [255, 255, 255, 255] },
      { ...captureWithBiography(), gameDateBytes: [365 & 255, 1, 209, 7] },
      { ...captureWithBiography(), gameDateBytes: [0, 0, 207, 7] },
      { ...capture(), gameDateBytes: [59, 0, 209, 7] },
    ]) expect(parse(input).snapshot?.players[0]?.calendarAge).toMatchObject({ value: null, missingReason: 'not_decoded' });
    const newborn = parse({ ...captureWithBiography(), gameDateBytes: [59, 0, 208, 7] });
    expect(newborn.snapshot?.players[0]?.calendarAge.value).toBe(0);
  });
  it('rejects malformed date payloads rather than accepting declared clock or age evidence', () => {
    for (const value of [null, [0], [0, 0, 0, 256], [0, 0, -1, 7], { value: '2001-03-01', verified: true }]) {
      expect(parse({ ...captureWithBiography(), gameDateBytes: value }).status).toBe('rejected');
    }
    expect(parse({ ...captureWithBiography(), gameDate: '2001-03-01' }).status).toBe('rejected');
  });
  it('redacts age before Realism serialization even with otherwise sufficient dates', () => {
    const result = parse({ ...captureWithBiography(), gameDateBytes: [59, 0, 209, 7] }, { ...context, mode: 'realism' });
    expect(result.snapshot?.gameDate.value).toBe('2001-03-01');
    for (const p of result.snapshot?.players ?? []) {
      expect(p.calendarAge).toMatchObject({ value: null, source: 'derived_model', missingReason: 'redacted',
        modelVersion: 'gregorian-month-day-v1', asOf: 'snapshot_game_date' });
      expect(p.birthDate.value).toBeNull();
    }
    const serialized = JSON.parse(JSON.stringify(result)) as typeof result;
    expect(serialized.snapshot?.players[0]?.calendarAge.value).toBeNull();
    expect(JSON.stringify(serialized.snapshot?.players[0]?.calendarAge)).not.toContain('"value":1');
  });
});

describe('FM2013 live capture admission', () => {
  it('admits only the exact build and retains independent provenance limits', () => {
    const result = parse(capture());
    expect(result.status).toBe('ready');
    expect(result.snapshot).toMatchObject({ id: 'snapshot-a', build: '13.3.3f359652', edition: 'FM2013', source: 'live_game', verification: 'provisional',
      rosterCompleteness: 'unverified', scoutingKnowledge: 'not_decoded', captureTimeAuthority: 'caller_declared', readerVersion: profile.profileVersion,
      sourceIdentity: { binarySha256: profile.binarySha256, targetPid: 101, runtimeImageBytesAuthenticated: false, localOnly: true },
      careerId: { value: 'declared-career-a', source: 'manual', verification: 'provisional', declaration: 'user_declared' } });
    const p = result.snapshot?.players[0];
    expect(p?.name).toMatchObject({ value: 'Synthetic Example', source: 'live_game', verification: 'provisional', edition: 'FM2013', build: profile.build });
    expect(p?.club.value).toEqual({ nativeId: 77, name: 'Synthetic Club', relation: 'player_team_pointer' });
    for (const mutate of [
      (value: ReturnType<typeof capture>) => { value.target.binarySha256 = '0'.repeat(64); },
      (value: ReturnType<typeof capture>) => { value.target.arch = 'x64'; },
      (value: ReturnType<typeof capture>) => { value.target.pointerSize = 8; },
      (value: ReturnType<typeof capture>) => { value.target.imagePath = '\\\\server\\share\\fm.exe'; },
      (value: ReturnType<typeof capture>) => { value.profileVersion = 'fm2013-live-research-0'; },
    ]) { const input = capture(); mutate(input); expect(parse(input).status).toBe('rejected'); }
  });

  it('preserves the full 32-bit historical wire PID range without granting a live read session', () => {
    for (const pid of [1, 0x7fffffff, 0x80000000, 0xffffffff]) {
      const value = capture();
      value.target.pid = pid;
      const result = parse(value);
      expect(result.status).toBe('ready');
      expect(result.snapshot?.sourceIdentity.targetPid).toBe(pid);
      expect(result.snapshot?.sourceIdentity.runtimeImageBytesAuthenticated).toBe(false);
      expect(result.snapshot?.verification).toBe('provisional');
      expect(result.snapshot?.rosterCompleteness).toBe('unverified');
    }
    for (const pid of [0, -1, 1.5, 0x1_0000_0000]) {
      const value = capture();
      value.target.pid = pid;
      expect(parse(value)).toMatchObject({ status: 'rejected', snapshot: null });
    }
  });

  it('rejects duplicate native passes and IDs within or across kinds', () => {
    const duplicateKind = capture(); duplicateKind.passes[1] = pass();
    expect(parse(duplicateKind).status).toBe('rejected');
    const duplicateId = capture(); duplicateId.passes[1] = pass('playerStaff');
    expect(parse(duplicateId).status).toBe('rejected');
    const duplicateWithin = capture(); duplicateWithin.passes[0] = pass('player', [player(), player()]);
    expect(parse(duplicateWithin).status).toBe('rejected');
  });

  it('rejects raw addresses, ability bytes, certification claims, and unknown nested fields', () => {
    const input = capture();
    const p = input.passes[0]?.records[0];
    const mutations = [
      { ...input, verified: true },
      { ...input, target: { ...input.target, address: '0xdeadbeef' } },
      { ...input, passes: [{ ...input.passes[0], actualAbilityVerified: true }] },
      { ...input, passes: [{ ...input.passes[0], coverage: { ...input.passes[0]?.coverage, faults: [] } }] },
      ...['addresses', 'actualCa', 'potentialAbility', 'CA', 'rawCa', 'verification', 'stale', 'contract'].map(key =>
        ({ ...input, passes: [{ ...input.passes[0], records: [{ ...p, [key]: key === 'verification' ? 'verified' : 199 }] }] })),
      { ...input, passes: [{ ...input.passes[0], records: [{ ...p, club: { nativeId: 77, name: 'Club', relation: 'player_team_pointer', address: '0xbeef' } }] }] },
    ];
    for (const mutation of mutations) expect(parse(mutation)).toMatchObject({ status: 'rejected', snapshot: null });
  });

  it('rejects malformed, oversize, invalid text and incompatible arrays', () => {
    expect(parseFm2013LiveCapture('{', context).status).toBe('rejected');
    expect(parseFm2013LiveCapture(' '.repeat(12_000_001), context).status).toBe('rejected');
    for (const bad of [
      { ...player(), nativeId: 0 }, { ...player(), nativeId: 1.5 },
      { ...player(), firstName: 'a'.repeat(65) }, { ...player(), lastName: 'bad\nname' },
      { ...player(), firstName: '', lastName: '' }, { ...player(), attributeBytes: [75] },
      { ...player(), attributeBytes: profile.attributes.map(() => 128) },
      { ...player(), attributeBytes: profile.attributes.map(() => 103) },
      { ...player(), positionBytes: [0] }, { ...player(), positionBytes: profile.positions.map(() => 21) },
      { ...player(), positionBytes: profile.positions.map(() => -1) },
    ]) { const value = capture(); value.passes[0] = pass('player', [bad]); expect(parse(value).status).toBe('rejected'); }
    expect(parse(capture(), { ...context, capturedAt: 'yesterday' }).status).toBe('rejected');
    expect(parse(capture(), { ...context, capturedAt: '2026-02-30T09:00:00Z' }).status).toBe('rejected');
  });

  it('enforces total player, counter, scan byte and elapsed limits', () => {
    const tooMany = capture(); tooMany.passes = [pass('player', Array.from({ length: 10_001 }, (_, index) => player(index + 1)))];
    expect(parse(tooMany).status).toBe('rejected');
    for (const bad of [
      { matches: 0 }, { duplicates: 1 }, { rejected: -1 }, { faultCount: 0.5 },
      { matches: profile.limits.maxMatches + 1 }, { bytesScanned: profile.limits.maxBytes + 1 },
      { bytesScanned: 0 }, { elapsedMs: profile.limits.maxDurationMs + 1_001 }, { stopReason: 'unknown' },
      { selectedMappingsExhausted: 'yes' }, { faultCount: 1 }, { stopReason: 'record_limit' },
    ]) {
      const value = capture(); Object.assign(value.passes[0]!.coverage, bad);
      expect(parse(value).status).toBe('rejected');
    }
  });

  it('reports missing kinds, faults and every quota as partial without certifying completeness', () => {
    const missingKind = capture(); missingKind.passes.pop();
    expect(parse(missingKind).status).toBe('partial');
    for (const stopReason of ['byte_limit', 'time_limit', 'record_limit', 'match_limit']) {
      const value = capture(); Object.assign(value.passes[0]!.coverage, { stopReason, selectedMappingsExhausted: false });
      expect(parse(value)).toMatchObject({ status: 'partial', snapshot: { rosterCompleteness: 'unverified' } });
    }
    const faults = capture(); Object.assign(faults.passes[0]!.coverage, { faultCount: 1, selectedMappingsExhausted: false });
    expect(parse(faults).status).toBe('partial');
    const staleCandidate = capture(); Object.assign(staleCandidate.passes[0]!.coverage, { matches: 2, rejected: 1 });
    expect(parse(staleCandidate).snapshot?.players).toHaveLength(2);
    expect(parse(staleCandidate).status).toBe('partial');
  });

  it('retains immutable, provisional per-pass coverage and exposes rejected or duplicate candidates', () => {
    const input = capture();
    Object.assign(input.passes[0]!.coverage, { matches: 4, rejected: 2, duplicates: 1 });
    const result = parse(input);
    expect(result.status).toBe('partial');
    expect(result.snapshot?.captureCoverage).toEqual(input.passes.map(scan => ({ nativeKind: scan.nativeKind,
      observedRecordCount: scan.records.length, declaration: 'caller_declared', verification: 'provisional', ...scan.coverage })));
    expect(result.diagnostics).toContain('player: 2 rejected candidates; 1 duplicate candidates. Coverage may omit records.');
    expect(Object.isFrozen(result.snapshot?.captureCoverage)).toBe(true);
    expect(Object.isFrozen(result.snapshot?.captureCoverage[0])).toBe(true);
    expect(() => { Object.assign(result.snapshot?.captureCoverage[0] ?? {}, { rejected: 0 }); }).toThrow(TypeError);
    input.passes[0]!.coverage.rejected = 0;
    expect(result.snapshot?.captureCoverage[0]?.rejected).toBe(2);
    for (const counter of ['rejected', 'duplicates'] as const) {
      const value = capture(); Object.assign(value.passes[0]!.coverage, { matches: 2, [counter]: 1 });
      expect(parse(value).status).toBe('partial');
    }
    expect(parse(capture()).snapshot?.captureCoverage.every(scan => scan.verification === 'provisional')).toBe(true);
  });

  it('returns empty without asserting that no career is loaded', () => {
    const value = capture(); value.passes = [pass('player', []), pass('playerStaff', [])];
    const result = parse(value);
    expect(result.status).toBe('empty');
    expect(result.snapshot?.players).toEqual([]);
    expect(result.diagnostics.join(' ')).toContain('does not establish whether a career is loaded');
    expect(parse({ ...value, passes: [] }).status).toBe('empty');
  });
});

describe('FM2013 field normalization and privacy', () => {
  it('normalizes optional biography as provisional evidence without age or eligibility inferences', () => {
    const result = parse(captureWithBiography());
    expect(result.status).toBe('ready');
    const p = result.snapshot?.players[0];
    expect(p?.birthDate).toMatchObject({ value: '2000-02-29', source: 'live_game', verification: 'provisional', edition: 'FM2013', build: profile.build, missingReason: null });
    expect(p?.primaryNation).toMatchObject({ value: { nativeId: 88, name: 'Synthetic Nation', relation: 'person_primary_nation' }, source: 'live_game', verification: 'provisional' });
    for (const key of ['age', 'citizenships', 'nationalEligibility', 'isoCountryCode']) expect(p).not.toHaveProperty(key);
    expect(Object.isFrozen(p?.birthDate)).toBe(true);
    expect(Object.isFrozen(p?.primaryNation.value)).toBe(true);
    expect(() => { Object.assign(p?.primaryNation.value ?? {}, { relation: 'all_citizenships' }); }).toThrow(TypeError);
    expect(JSON.stringify(result)).not.toContain('birthDateBytes');
  });

  it('preserves omitted biography as unknown and invalid native calendars without fallback dates', () => {
    for (const mode of ['editor', 'realism'] as const) {
      const p = parse(capture(), { ...context, mode }).snapshot?.players[0];
      expect(p?.birthDate).toMatchObject({ value: null, missingReason: 'not_decoded' });
      expect(p?.primaryNation).toMatchObject({ value: null, missingReason: 'not_decoded' });
    }
    for (const raw of [[0, 0, 232, 3], [109, 1, 221, 7], [255, 255, 220, 7]]) {
      const result = parse(captureWithBiography(raw));
      expect(result.status).toBe('ready');
      expect(result.snapshot?.players[0]?.birthDate).toMatchObject({ value: null, verification: 'unsupported', missingReason: 'not_decoded' });
      expect(result.snapshot?.players[0]?.primaryNation.value?.name).toBe('Synthetic Nation');
    }
  });

  it('rejects malformed biography and foreign claims even when Realism would redact it', () => {
    const badDates: unknown[] = [null, [], [0, 0, 220], [0, 0, 220, 7, 0], [256, 0, 220, 7], [-1, 0, 220, 7], [1.5, 0, 220, 7], ['0', 0, 220, 7]];
    const badNations: unknown[] = [null, [], {}, { nativeId: 0, name: 'Nation' }, { nativeId: 1.5, name: 'Nation' },
      { nativeId: 88, name: '' }, { nativeId: 88, name: 'a'.repeat(129) }, { nativeId: 88, name: 'bad\nname' },
      { nativeId: 88, name: 'Nation', relation: 'citizenship' }, { nativeId: 88, name: 'Nation', verified: true },
      { nativeId: 88, name: 'Nation', address: '0xbeef' }, { nativeId: 88, name: 'Nation', nativeIds: [88,89] }];
    for (const mode of ['editor', 'realism'] as const) {
      for (const raw of badDates) expect(parse(captureWithBiography(raw), { ...context, mode }).status).toBe('rejected');
      for (const raw of badNations) expect(parse(captureWithBiography(undefined, raw), { ...context, mode }).status).toBe('rejected');
    }
  });

  it('redacts supplied biography before Realism return and serialization without mutating the input', () => {
    const input = captureWithBiography(), before = JSON.stringify(input);
    const result = parse(input, { ...context, mode: 'realism' });
    expect(result.status).toBe('ready');
    for (const p of result.snapshot?.players ?? []) {
      expect(p.birthDate).toMatchObject({ value: null, missingReason: 'redacted', verification: 'unsupported' });
      expect(p.primaryNation).toMatchObject({ value: null, missingReason: 'redacted', verification: 'unsupported' });
    }
    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(/birthDateBytes|2000-02-29|Synthetic Nation|person_primary_nation/u);
    expect(JSON.stringify(input)).toBe(before);
    const restored: unknown = JSON.parse(serialized);
    expect(restored).toMatchObject({ snapshot: { players: [{ birthDate: { value: null }, primaryNation: { value: null } }, { birthDate: { value: null }, primaryNation: { value: null } }] } });
    expect(parse(input).snapshot?.players[0]?.birthDate.value).toBe('2000-02-29');
  });

  it('requires and preserves the observed club relationship without claiming current employment', () => {
    for (const relation of ['player_team_pointer', 'primary_contract_team']) {
      const input = capture(); input.passes[0]!.records[0]!.club.relation = relation;
      const result = parse(input);
      expect(result.status).toBe('ready');
      expect(result.snapshot?.players[0]?.club).toMatchObject({
        value: { nativeId: 77, name: 'Synthetic Club', relation }, verification: 'provisional',
      });
      expect(result.snapshot?.players[0]).not.toHaveProperty('currentClub');
      expect(result.snapshot?.players[0]).not.toHaveProperty('employmentClub');
    }
    const input = capture();
    const firstPass = input.passes[0]!;
    for (const club of [
      { nativeId: 77, name: 'Synthetic Club' },
      { nativeId: 77, name: 'Synthetic Club', relation: 'current_club' },
      { nativeId: 77, name: 'Synthetic Club', relation: null },
    ]) {
      expect(parse({ ...input, passes: [{ ...firstPass, records: [{ ...firstPass.records[0], club }] }] })).toMatchObject({ status: 'rejected', snapshot: null });
    }
  });

  it('uses all source names without modern aliases and normalizes signed raw bytes', () => {
    const input = capture(); input.passes[0]!.records[0]!.attributeBytes = profile.attributes.map((_, index) => [0, -128, 77, 78, 102][index % 5]!);
    const fields = parse(input).snapshot?.players[0]?.attributes;
    expect(Object.keys(fields ?? {})).toEqual(profile.attributes.map(field => field.key));
    expect(Object.values(fields ?? {}).slice(0, 5).map(field => field.value)).toEqual([1, 1, 15, 16, 20]);
    expect(fields?.aerialAbility?.sourceName).toBe('AerialAbility');
    expect(fields).not.toHaveProperty('aerialReach');
    expect(fields).not.toHaveProperty('jumpingReach');
    for (const field of Object.values(fields ?? {})) expect(field.verification).toBe('provisional');
  });

  it('preserves zero familiarity in editor mode and derives no eligibility', () => {
    const p = parse(capture()).snapshot?.players[0];
    expect(Object.values(p?.positions ?? {})).toHaveLength(15);
    for (const position of Object.values(p?.positions ?? {})) expect(position).toMatchObject({ value: 0, missingReason: null, verification: 'provisional' });
    expect(p).not.toHaveProperty('eligiblePositions');
    expect(p?.actualCa).toMatchObject({ value: null, missingReason: 'not_verified', verification: 'unsupported' });
    expect(p?.potentialAbility.value).toBeNull();
  });

  it('redacts familiarity and ability before returning or serializing realism snapshots', () => {
    const result = parse(capture(), { ...context, mode: 'realism' });
    for (const p of result.snapshot?.players ?? []) {
      for (const position of Object.values(p.positions)) expect(position).toMatchObject({ value: null, missingReason: 'redacted', verification: 'unsupported' });
      expect(p.actualCa.missingReason).toBe('redacted');
      expect(p.potentialAbility.missingReason).toBe('redacted');
    }
    const serialized: unknown = JSON.parse(JSON.stringify(result));
    expect(JSON.stringify(serialized)).not.toMatch(/attributeBytes|positionBytes|addresses|"verification":"verified"/u);
    expect(JSON.stringify(result.snapshot?.players[0]?.positions)).not.toContain('"value":0');
  });

  it('redacts every exact attribute including both feet until scouting visibility is decoded', () => {
    const input = capture();
    input.passes[0]!.records[0]!.attributeBytes = profile.attributes.map((_, index) => 5 + index % 20 * 5);
    const editor = parse(input);
    const realism = parse(input, { ...context, mode: 'realism' });
    expect(realism.status).toBe(editor.status);
    expect(realism.snapshot?.scoutingKnowledge).toBe('not_decoded');
    expect(realism.diagnostics).toContain('Research Realism redacts exact numeric ratings because manager scouting and visibility knowledge have not been decoded.');
    const attributes = realism.snapshot!.players[0]!.attributes;
    expect(Object.keys(attributes)).toHaveLength(49);
    for (const field of profile.attributes) {
      expect(attributes[field.key]).toMatchObject({ value: null, missingReason: 'redacted', verification: 'unsupported', sourceName: field.sourceName });
    }
    for (const key of ['passing', 'finishing', 'leftFoot', 'rightFoot']) {
      expect(attributes[key]?.value).toBeNull();
      expect(editor.snapshot?.players[0]?.attributes[key]?.value).toBeTypeOf('number');
    }
    expect(Object.values(editor.snapshot!.players[0]!.attributes).map(field => field.value)).toEqual(input.passes[0]!.records[0]!.attributeBytes.map(raw => Math.max(1, Math.round(raw / 5))));
    expect(parse(input).snapshot?.players[0]?.attributes).toEqual(editor.snapshot?.players[0]?.attributes);
    const serialized = JSON.stringify(realism);
    expect(serialized).not.toMatch(/attributeBytes|positionBytes|knownAttributes|visibleAttributes/u);
    const restored: { snapshot: { players: { attributes: Record<string, { value: unknown; sourceName: string; missingReason: string }> }[] } } = JSON.parse(serialized);
    for (const field of profile.attributes) {
      expect(restored.snapshot.players[0]?.attributes[field.key]).toMatchObject({ value: null, sourceName: field.sourceName, missingReason: 'redacted' });
    }
    expect(Object.isFrozen(attributes)).toBe(true);
    expect(Object.isFrozen(attributes.leftFoot)).toBe(true);
    expect(() => { Object.assign(realism.snapshot!, { scoutingKnowledge: 'known' }); }).toThrow(TypeError);
  });

  it('keeps omitted positions, clubs and every contract field explicitly unknown', () => {
    const { club: _club, positionBytes: _positions, ...minimal } = player();
    const value = { ...capture(), passes: [{ ...pass(), records: [minimal] }] };
    const p = parse(value, { ...context, mode: 'realism' }).snapshot?.players[0];
    expect(p?.club).toMatchObject({ value: null, missingReason: 'not_decoded' });
    for (const field of Object.values(p?.positions ?? {})) expect(field.missingReason).toBe('not_decoded');
    for (const field of Object.values(p?.contract ?? {})) expect(field).toMatchObject({ value: null, missingReason: 'not_decoded', verification: 'unsupported' });
  });

  it('uses snapshot-scoped keys, keeps career identity declared and ignores PID as identity', () => {
    const first = parse(capture()).snapshot;
    const second = parse(capture(), { ...context, snapshotId: 'snapshot-b', careerId: 'another-career' }).snapshot;
    expect(first?.players[0]?.id).toBe('snapshot-a:42');
    expect(second?.players[0]?.id).toBe('snapshot-b:42');
    expect(first?.players[0]?.id).not.toBe(second?.players[0]?.id);
    const otherProcess = capture(); otherProcess.target.pid = 202;
    expect(parse(otherProcess).snapshot?.players[0]?.id).toBe(first?.players[0]?.id);
    expect(second?.careerId.value).toBe('another-career');
  });

  it('deeply freezes the result, fields, collections, provenance and diagnostics', () => {
    const result = parse(capture());
    function inspect(value: unknown): void {
      if (typeof value !== 'object' || value === null) return;
      expect(Object.isFrozen(value)).toBe(true);
      for (const child of Object.values(value)) inspect(child);
    }
    inspect(result);
    expect(() => { Object.assign(result.snapshot?.players[0]?.attributes.aerialAbility ?? {}, { value: 20 }); }).toThrow(TypeError);
    expect(() => { Object.assign(result.diagnostics, { 0: 'verified' }); }).toThrow(TypeError);
    inspect(parse({ schema: 'wrong' }));
  });
});
