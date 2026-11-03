/**
 * A notification-only channel for same-origin ManagerHub tabs.
 *
 * Never send snapshot IDs, filenames, player details, Editor data, or source JSON.
 * IndexedDB is authoritative; receiving tabs must reread and validate storage.
 */
const CHANNEL_NAME = 'managerhub-historical-library-v1';
const UPDATE = 'historical-library-committed';
let sharedChannel: BroadcastChannel | null = null;

function channel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null;
  if (!sharedChannel) sharedChannel = new BroadcastChannel(CHANNEL_NAME);
  return sharedChannel;
}

export function announceHistoricalLibraryCommit(): void {
  channel()?.postMessage({ type: UPDATE, version: 1 });
}

export function onHistoricalLibraryCommit(notify: () => void): () => void {
  const active = channel();
  if (!active) return () => undefined;
  const handleMessage = (event: MessageEvent<unknown>) => {
    const value = event.data;
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return;
    const fields = value as Record<string, unknown>;
    if (Object.keys(fields).length !== 2 || fields.type !== UPDATE || fields.version !== 1) return;
    notify();
  };
  active.addEventListener('message', handleMessage);
  return () => active.removeEventListener('message', handleMessage);
}
