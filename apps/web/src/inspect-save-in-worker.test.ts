import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { inspectSave } from '@managerhub/domain';
import { inspectSaveInWorker } from './inspect-save-in-worker';

class FakeWorker {
  static latest: FakeWorker | null = null;
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent<unknown>) => void) | null = null;
  terminated = false;
  requests: unknown[] = [];
  constructor() { FakeWorker.latest = this; }
  postMessage(value: unknown) { this.requests.push(value); }
  terminate() { this.terminated = true; }
}

const file = new File([Uint8Array.from([2, 1, 97, 102, 101, 46, 0, 0])], 'career.fm');

describe('save inspection worker admission and lifecycle', () => {
  beforeEach(() => {
    FakeWorker.latest = null;
    vi.stubGlobal('Worker', FakeWorker);
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('admits a matching, schema-validated read-only worker result', async () => {
    const result = await inspectSave(file);
    const pending = inspectSaveInWorker(file);
    const worker = FakeWorker.latest;
    expect(worker?.requests).toHaveLength(1);
    worker?.onmessage?.({ data: { ok: true, result } } as MessageEvent);
    await expect(pending).resolves.toEqual(result);
    expect(worker?.terminated).toBe(true);
  });

  it('fails closed on malformed, foreign, or raw-payload worker replies', async () => {
    const valid = await inspectSave(file);
    for (const data of [
      null, 'not-an-object', [], { ok: 'true', result: valid },
      { ok: true, result: null }, { ok: true, result: { ...valid, name: 'another.fm' } },
      { ok: true, result: { ...valid, size: valid.size + 1 } },
      { ok: true, result: { ...valid, fileBytes: Uint8Array.from([1]) } },
      { ok: true, result: valid, secret: 'extra-field' },
      { ok: false, error: '' },
      { ok: false, error: 'bad', extra: true }
    ]) {
      const pending = inspectSaveInWorker(file);
      const worker = FakeWorker.latest;
      worker?.onmessage?.({ data } as MessageEvent);
      await expect(pending).rejects.toThrow('invalid result');
      expect(worker?.terminated).toBe(true);
    }
  });

  it('passes a bounded parser error and terminates after one response', async () => {
    const pending = inspectSaveInWorker(file);
    const worker = FakeWorker.latest;
    worker?.onmessage?.({ data: { ok: false, error: 'Select a Football Manager .fm save file.' } } as MessageEvent);
    await expect(pending).rejects.toThrow('Select a Football Manager');
    expect(worker?.terminated).toBe(true);
  });

  it('aborts safely, ignores late messages, and releases the worker', async () => {
    const controller = new AbortController();
    const pending = inspectSaveInWorker(file, controller.signal);
    const worker = FakeWorker.latest;
    controller.abort();
    worker?.onmessage?.({ data: { ok: false, error: 'late' } } as MessageEvent);
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(worker?.terminated).toBe(true);
  });

  it('rejects immediately when an AbortSignal is already cancelled', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(inspectSaveInWorker(file, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(FakeWorker.latest).toBeNull();
  });

  it('terminates after a 45-second safety timeout', async () => {
    vi.useFakeTimers();
    const pending = inspectSaveInWorker(file);
    const worker = FakeWorker.latest;
    const rejection = expect(pending).rejects.toThrow('45 seconds');
    await vi.advanceTimersByTimeAsync(45_000);
    await rejection;
    expect(worker?.terminated).toBe(true);
  });

  it('refuses main-thread fallback if Web Workers are unavailable', async () => {
    vi.stubGlobal('Worker', undefined);
    await expect(inspectSaveInWorker(file)).rejects.toThrow('requires Web Workers');
  });

  it('rejects corrupt transport errors without freezing the inspector', async () => {
    const pending = inspectSaveInWorker(file);
    const worker = FakeWorker.latest;
    worker?.onmessageerror?.({ data: null } as MessageEvent);
    await expect(pending).rejects.toThrow('invalid result');
    expect(worker?.terminated).toBe(true);
  });
});
