import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { inspectSave } from '@managerhub/domain';
import { decodeFm2013Save } from '@managerhub/domain/fm2013-offline';
import { buildSyntheticFm2013Save } from '@managerhub/domain/fm2013-synthetic';
import { decodeSaveInWorker } from './decode-save-in-worker';

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

const headerOnlyFile = new File([Uint8Array.from([2, 1, 97, 102, 101, 46, 0, 0])], 'header-only.fm');

describe('offline save decode worker admission and lifecycle', () => {
  beforeEach(() => {
    FakeWorker.latest = null;
    vi.stubGlobal('Worker', FakeWorker);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('forwards progress updates and admits a valid decoded FM2013 save result', async () => {
    const bytes = await buildSyntheticFm2013Save({ compressed: true, family: 'afe' });
    const file = new File([new Uint8Array(bytes)], 'synthetic-career.fm');
    const database = await decodeFm2013Save(file);
    const inspection = {
      id: database.source.saveId,
      name: file.name,
      size: file.size,
      lastModified: file.lastModified,
      signature: database.source.signature,
      sha256: database.source.sha256,
      detectedFamily: database.source.family,
      edition: database.source.edition,
      build: database.source.build,
      support: 'decoded' as const,
      importedAt: database.source.decodedAt,
      inspectionStatus: 'inspected' as const,
      archiveIndex: null,
      warnings: []
    };

    const progressEvents: number[] = [];
    const pending = decodeSaveInWorker(file, {
      onProgress: event => progressEvents.push(event.percent)
    });
    const worker = FakeWorker.latest;
    expect(worker?.requests).toHaveLength(1);

    worker?.onmessage?.({
      data: { kind: 'progress', progress: { stage: 'decrypting_database', percent: 45 } }
    } as MessageEvent);
    worker?.onmessage?.({
      data: { kind: 'done', ok: true, inspection, database, decodeNotice: null }
    } as MessageEvent);

    const result = await pending;
    expect(progressEvents).toEqual([45]);
    expect(result.inspection).toEqual(inspection);
    expect(result.database?.counts.players).toBe(14);
    expect(result.decodeNotice).toBeNull();
    expect(worker?.terminated).toBe(true);
  });

  it('admits a header-only fallback inspection with database: null', async () => {
    const inspection = await inspectSave(headerOnlyFile);
    const pending = decodeSaveInWorker(headerOnlyFile);
    const worker = FakeWorker.latest;
    worker?.onmessage?.({
      data: { kind: 'done', ok: true, inspection, database: null, decodeNotice: 'Truncated archive' }
    } as MessageEvent);

    const result = await pending;
    expect(result.inspection).toEqual(inspection);
    expect(result.database).toBeNull();
    expect(result.decodeNotice).toBe('Truncated archive');
    expect(worker?.terminated).toBe(true);
  });

  it('fails closed on malformed or foreign worker replies', async () => {
    const inspection = await inspectSave(headerOnlyFile);
    for (const data of [
      null,
      'not-an-object',
      [],
      { kind: 'unknown' },
      { kind: 'done', ok: 'true', inspection, database: null },
      { kind: 'done', ok: true, inspection: { ...inspection, name: 'other.fm' }, database: null },
      { kind: 'done', ok: true, inspection, database: { source: { fileName: 'other.fm' } } },
      { kind: 'done', ok: false, error: '' }
    ]) {
      const pending = decodeSaveInWorker(headerOnlyFile);
      const worker = FakeWorker.latest;
      worker?.onmessage?.({ data } as MessageEvent);
      await expect(pending).rejects.toThrow('invalid result');
      expect(worker?.terminated).toBe(true);
    }
  });

  it('cancels cleanly via AbortSignal and terminates the worker immediately', async () => {
    const controller = new AbortController();
    const pending = decodeSaveInWorker(headerOnlyFile, { signal: controller.signal });
    const worker = FakeWorker.latest;
    controller.abort();
    worker?.onmessage?.({
      data: { kind: 'done', ok: false, error: 'late' }
    } as MessageEvent);
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(worker?.terminated).toBe(true);
  });

  it('rejects immediately when AbortSignal is pre-aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(decodeSaveInWorker(headerOnlyFile, { signal: controller.signal }))
      .rejects.toMatchObject({ name: 'AbortError' });
    expect(FakeWorker.latest).toBeNull();
  });

  it('terminates after the 90-second safety timeout', async () => {
    vi.useFakeTimers();
    const pending = decodeSaveInWorker(headerOnlyFile);
    const worker = FakeWorker.latest;
    const assertion = expect(pending).rejects.toThrow('90 seconds');
    await vi.advanceTimersByTimeAsync(90_000);
    await assertion;
    expect(worker?.terminated).toBe(true);
  });

  it('fails closed when Web Workers are unavailable', async () => {
    vi.stubGlobal('Worker', undefined);
    await expect(decodeSaveInWorker(headerOnlyFile)).rejects.toThrow('requires Web Workers');
  });

  it('rejects worker transport errors cleanly', async () => {
    const pending = decodeSaveInWorker(headerOnlyFile);
    const worker = FakeWorker.latest;
    worker?.onmessageerror?.({ data: null } as MessageEvent);
    await expect(pending).rejects.toThrow('invalid result');
    expect(worker?.terminated).toBe(true);
  });
});
