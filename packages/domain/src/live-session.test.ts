import { describe, expect, it } from 'vitest';
import profile from './fm2013-live-profile.json' with { type: 'json' };
import { createFm2013CaptureTicket, validateFm2013CaptureAdmission, type Fm2013ProcessIdentity, type Fm2013CaptureBinding, type Fm2013ProcessObservation } from './live-session';
const identity: Fm2013ProcessIdentity = { pid: 1234, startedAtFileTime: '134064000000000001', imagePath: profile.imagePath, binarySha256: profile.binarySha256 };
const id = 'b6541e7f-489d-4df4-a922-836a1a805492', issued = '2026-11-01T00:00:00.000Z', now = '2026-11-01T00:00:30.000Z';
const make = () => createFm2013CaptureTicket(identity, id, issued);
const binding = { captureId: id, pid: identity.pid };
const observed: Fm2013ProcessObservation = { status: 'observed', process: identity };
const validate = (ticket: unknown = make(), observation: Fm2013ProcessObservation = observed, capture = binding, at = now) => validateFm2013CaptureAdmission(ticket, observation, capture, at);

describe('FM2013 local capture ticket admission', () => {
  it('binds a bounded declaration to the full process instance and capture token', () => {
    const ticket = make();
    expect(ticket.expiresAt).toBe('2026-11-01T00:10:00.000Z');
    expect(validate(ticket)).toEqual({ status: 'admitted', reason: null });
    expect(Object.isFrozen(ticket)).toBe(true); expect(Object.isFrozen(ticket.process)).toBe(true);
    expect(Object.isFrozen(validate(ticket))).toBe(true);
    expect(ticket.process).not.toBe(identity); expect(Object.isFrozen(identity)).toBe(false);
    expect(ticket).not.toHaveProperty('careerId'); expect(validate(ticket)).not.toHaveProperty('current');
    expect(validate(ticket)).not.toHaveProperty('verified');
  });
  it('rejects exited/denied/unobservable processes without silently retargeting', () => {
    for (const status of ['process_not_found', 'access_denied', 'observation_failed', 'unsupported_build'] as const) {
      expect(validate(make(), { status })).toEqual({ status: 'rejected', reason: status });
    }
    expect(validate(make(), { status: 'observed', process: { ...identity, pid: 4321 } }).reason).toBe('process_identity_changed');
  });
  it('rejects PID reuse with even one differing 100ns creation-time digit', () => {
    expect(validate(make(), { status: 'observed', process: { ...identity, startedAtFileTime: '134064000000000002' } }).reason).toBe('process_identity_changed');
    expect(Number('134064000000000001')).toBe(Number('134064000000000002'));
  });
  it('rejects another capture or process binding while preserving immutable tickets', () => {
    const ticket = make();
    expect(validate(ticket, observed, { ...binding, captureId: '16e7bfb2-69b6-434a-9c01-b74976cbfd81' }).reason).toBe('capture_id_mismatch');
    expect(validate(ticket, observed, { ...binding, pid: 4321 }).reason).toBe('capture_pid_mismatch');
    expect(() => Object.assign(ticket.process, { pid: 4321 })).toThrow(TypeError);
    expect(ticket).toEqual(make());
  });
  it('enforces expiry, clock rollback and strict UTC timestamps', () => {
    expect(validate(make(), observed, binding, issued).status).toBe('admitted');
    expect(validate(make(), observed, binding, '2026-11-01T00:10:00.000Z').reason).toBe('ticket_expired');
    expect(validate(make(), observed, binding, '2026-10-31T23:59:59.999Z').reason).toBe('clock_rollback');
    for (const bad of ['2026-02-30T00:00:00.000Z', '2026-11-01T00:00:30Z', '2026-11-01T00:00:30.000+00:00', 'now']) {
      expect(validate(make(), observed, binding, bad).reason).toBe('invalid_now');
      expect(() => createFm2013CaptureTicket(identity, id, bad)).toThrow(TypeError);
    }
    for (const expiresAt of [issued, '2026-11-01T00:10:00.001Z']) expect(validate({ ...make(), expiresAt }).reason).toBe('invalid_ticket');
  });
  it('rejects foreign builds, malformed creation times and unknown ticket claims', () => {
    for (const change of [{ binarySha256: '0'.repeat(64) }, { imagePath: 'C:\\Other\\fm.exe' }, { startedAtFileTime: '134064000000000001.0' },
      { startedAtFileTime: '000000000000000001' }, { startedAtFileTime: '99999999999999999999' }, { startedAtFileTime: 134064000000000001 }, { pid: 0 }]) {
      const altered = { ...identity, ...change };
      expect(() => createFm2013CaptureTicket(altered as Fm2013ProcessIdentity, id, issued)).toThrow(TypeError);
      expect(validate({ ...make(), process: altered }).reason).toBe('invalid_ticket');
      expect(validate(make(), { status: 'observed', process: altered as Fm2013ProcessIdentity }).reason).toBe('invalid_observation');
    }
    for (const change of [{ schema: 'future' }, { profileVersion: 'other' }, { verified: true }, { captureId: 'not-a-uuid' }]) expect(validate({ ...make(), ...change }).reason).toBe('invalid_ticket');
    expect(validate({ ...make(), process: { ...identity, address: '0x1234' } }).reason).toBe('invalid_ticket');
    expect(validate({ ...make(), process: { ...identity, nativeId: 123 } }).reason).toBe('invalid_ticket');
    expect(validate({ ...make(), careerId: 'unproven-career' }).reason).toBe('invalid_ticket');
    expect(validate({ ...make(), [Symbol('hidden')]: true }).reason).toBe('invalid_ticket');
  });
  it('strictly validates capture and observation structures without leaking their text', () => {
    for (const capture of [null, { ...binding, verified: true }, { captureId: id }, { ...binding, pid: 1.5 }, { ...binding, captureId: 'secret' }]) {
      expect(validate(make(), observed, capture as Fm2013CaptureBinding).reason).toBe('invalid_capture');
    }
    for (const observation of [null, { status: 'other' }, { status: 'access_denied', error: 'private text' }, { ...observed, verified: true }, { status: 'observed' }]) {
      const result = validate(make(), observation as Fm2013ProcessObservation);
      expect(result).toEqual({ status: 'rejected', reason: 'invalid_observation' }); expect(Object.isFrozen(result)).toBe(true);
    }
  });
});
