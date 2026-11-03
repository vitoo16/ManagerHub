import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { importHistoricalCapture } from './import-historical-capture';
import profile from '../../../packages/domain/src/fm2013-live-profile.json' with { type: 'json' };
import { createHistoricalSnapshotRecord, parseFm2013LiveCapture } from '@managerhub/domain';

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

function validWorkerRecord(mode: 'editor' | 'realism') {
  const pass = (nativeKind: 'player' | 'playerStaff') => ({
    nativeKind, imageTypeMetadataVerified: true,
    coverage: {
      bytesScanned: 4096, matches: 0, rejected: 0, duplicates: 0, faultCount: 0,
      stopReason: null, selectedMappingsExhausted: true, elapsedMs: 20
    },
    records: []
  });
  const wire = {
    schema: profile.schema, profileVersion: profile.profileVersion,
    target: {
      pid: 1234, arch: 'ia32', pointerSize: 4,
      imagePath: 'C:\\\\Games\\\\Football Manager 2013\\\\fm.exe',
      binarySha256: profile.binarySha256
    },
    gameDateBytes: [59, 0, 209, 7],
    passes: [pass('player'), pass('playerStaff')]
  };
  const parsed = parseFm2013LiveCapture(JSON.stringify(wire), { ...context, mode });
  if (parsed.status === 'rejected') throw new Error('Synthetic record was rejected');
  return createHistoricalSnapshotRecord(parsed, {
    fileName: file.name, sourceSize: file.size,
    sourceSha256: 'a'.repeat(64), importedAt: '2026-10-31T09:05:00.000Z'
  });
}

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
    const rejection = expect(pending).rejects.toThrow('45 seconds');
    await vi.advanceTimersByTimeAsync(45_000);
    await rejection;
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

  it('rejects malformed worker messages immediately and terminates the worker', async () => {
    for (const payload of [
      null, 'not-an-object', [], { type: 'unexpected' },
      { type: 'progress', stage: 'unknown' },
      { type: 'progress', stage: 'parsing', secret: true },
      { type: 'error', message: '' },
      { type: 'error', message: 'bad', secret: true },
      { type: 'success', record: null, pairedRecord: null }
    ]) {
      const pending = importHistoricalCapture(file, context, 'realism', vi.fn(), new AbortController().signal);
      const worker = FakeWorker.latest;
      worker?.onmessage?.({ data: payload } as MessageEvent);
      await expect(pending).rejects.toThrow('failed schema or privacy validation');
      expect(worker?.terminated).toBe(true);
    }
  });

  it('accepts a matching validated worker result and rejects foreign import identity', async () => {
    const realism = validWorkerRecord('realism');
    const editor = validWorkerRecord('editor');
    const completed = importHistoricalCapture(file, context, 'realism', vi.fn(), new AbortController().signal);
    const worker = FakeWorker.latest;
    worker?.onmessage?.({ data: { type: 'success', record: realism, pairedRecord: null } } as MessageEvent);
    await expect(completed).resolves.toEqual({ record: realism, pairedRecord: null });
    expect(worker?.terminated).toBe(true);

    const bad = [
      { ...editor, id: 'foreign-snapshot' },
      { ...editor, snapshot: { ...editor.snapshot, careerId: {
        ...editor.snapshot.careerId, value: 'Different career'
      } } },
      { ...editor, snapshot: { ...editor.snapshot, capturedAt: '2026-11-01T09:00:00.000Z' } }
    ];
    for (const record of bad) {
      const pending = importHistoricalCapture(file, context, 'editor', vi.fn(), new AbortController().signal);
      FakeWorker.latest?.onmessage?.({ data: { type: 'success', record, pairedRecord: realism } } as MessageEvent);
      await expect(pending).rejects.toThrow('failed schema or privacy validation');
    }
    const badPair = { ...realism, importedAt: '2026-11-01T09:05:00.000Z' };
    const pending = importHistoricalCapture(file, context, 'editor', vi.fn(), new AbortController().signal);
    FakeWorker.latest?.onmessage?.({ data: { type: 'success', record: editor, pairedRecord: badPair } } as MessageEvent);
    await expect(pending).rejects.toThrow('failed schema or privacy validation');
  });

  it('ignores queued progress after cancellation and handles abort during worker construction', async () => {
    const progress = vi.fn();
    const controller = new AbortController();
    const pending = importHistoricalCapture(file, context, 'realism', progress, controller.signal);
    const worker = FakeWorker.latest;
    controller.abort();
    worker?.onmessage?.({ data: { type: 'progress', stage: 'parsing' } } as MessageEvent);
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(progress).not.toHaveBeenCalled();
    class AbortDuringConstruction extends FakeWorker {
      constructor() { super(); controller2.abort(); }
    }
    const controller2 = new AbortController();
    vi.stubGlobal('Worker', AbortDuringConstruction);
    const second = importHistoricalCapture(file, context, 'realism', vi.fn(), controller2.signal);
    await expect(second).rejects.toMatchObject({ name: 'AbortError' });
    expect(FakeWorker.latest?.terminated).toBe(true);
  });

  it('rejects when Web Workers are unavailable rather than parsing on the UI thread', async () => {
    vi.stubGlobal('Worker', undefined);
    await expect(importHistoricalCapture(file, context, 'realism', vi.fn(), new AbortController().signal))
      .rejects.toThrow('Background workers are unavailable');
  });
});
