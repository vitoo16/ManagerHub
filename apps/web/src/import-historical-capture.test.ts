import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { importHistoricalCapture } from './import-historical-capture';

class FakeWorker {
  static latest: FakeWorker | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  terminated = false;
  postMessage(): void {}
  terminate(): void { this.terminated = true; }
  constructor() { FakeWorker.latest = this; }
}

const file = new File(['{}'], 'synthetic-capture.json', { type: 'application/json' });
const context = {
  snapshotId: 'synthetic-snapshot',
  careerId: 'Synthetic career',
  capturedAt: '2026-10-31T09:00:00.000Z'
};

describe('historical capture worker client', () => {
  beforeEach(() => {
    FakeWorker.latest = null;
    vi.stubGlobal('Worker', FakeWorker);
    vi.stubGlobal('window', { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('terminates the worker and rejects with AbortError when cancelled', async () => {
    const controller = new AbortController();
    const pending = importHistoricalCapture(file, context, 'realism', vi.fn(), controller.signal);
    const worker = FakeWorker.latest;
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(worker?.terminated).toBe(true);
  });

  it('terminates the worker when the bounded import timeout expires', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('window', { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout });
    const pending = importHistoricalCapture(file, context, 'realism', vi.fn(), new AbortController().signal);
    const worker = FakeWorker.latest;
    await vi.advanceTimersByTimeAsync(45_000);
    await expect(pending).rejects.toThrow('45 seconds');
    expect(worker?.terminated).toBe(true);
  });

  it('forwards progress and surfaces worker errors without falling back to main-thread parsing', async () => {
    const progress = vi.fn();
    const pending = importHistoricalCapture(file, context, 'realism', progress, new AbortController().signal);
    const worker = FakeWorker.latest;
    worker?.onmessage?.({ data: { type: 'progress', stage: 'parsing' } } as MessageEvent);
    worker?.onmessage?.({ data: { type: 'error', message: 'Synthetic worker failure.' } } as MessageEvent);
    await expect(pending).rejects.toThrow('Synthetic worker failure.');
    expect(progress).toHaveBeenCalledWith('parsing');
    expect(worker?.terminated).toBe(true);
  });

  it('rejects when Web Workers are unavailable rather than parsing on the UI thread', async () => {
    vi.stubGlobal('Worker', undefined);
    await expect(importHistoricalCapture(file, context, 'realism', vi.fn(), new AbortController().signal))
      .rejects.toThrow('Background workers are unavailable');
  });
});
