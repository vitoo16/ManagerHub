import { test, expect } from '@playwright/test';
import profile from '../../packages/domain/src/fm2013-live-profile.json' with { type: 'json' };

function makePlayer(nativeId: number) {
  return {
    nativeId,
    firstName: 'Synthetic',
    lastName: 'Player ' + nativeId,
    attributeBytes: profile.attributes.map(() => 75),
    positionBytes: profile.positions.map(() => 0),
    birthDateBytes: [59, 0, 208, 7],
    primaryNation: { nativeId: 88, name: 'Synthetic Nation' },
    club: { nativeId: 77, name: 'Synthetic Club', relation: 'player_team_pointer' }
  };
}

function makePass(nativeKind: 'player' | 'playerStaff', records: ReturnType<typeof makePlayer>[]) {
  return {
    nativeKind,
    imageTypeMetadataVerified: true,
    coverage: {
      bytesScanned: 4096,
      matches: records.length,
      rejected: 0,
      duplicates: 0,
      faultCount: 0,
      stopReason: null,
      selectedMappingsExhausted: true,
      elapsedMs: 20
    },
    records
  };
}

function syntheticWire() {
  return JSON.stringify({
    schema: profile.schema,
    profileVersion: profile.profileVersion,
    target: {
      pid: 101,
      arch: 'ia32',
      pointerSize: 4,
      imagePath: 'C:\\Games\\Football Manager 2013\\fm.exe',
      binarySha256: profile.binarySha256
    },
    gameDateBytes: [59, 0, 209, 7],
    passes: [
      makePass('player', [makePlayer(42)]),
      makePass('playerStaff', [makePlayer(43)])
    ]
  });
}

async function importSynthetic(page: import('@playwright/test').Page, mode: 'Editor' | 'Realism' = 'Editor') {
  await page.getByLabel('Career label (user-declared)').fill('Synthetic FM2013 career');
  await page.getByLabel('Capture time (declared by source workflow)').fill('2026-10-31T09:00');
  if (mode === 'Editor') await page.getByRole('button', { name: 'Editor', exact: true }).click();
  else await page.getByRole('button', { name: 'Realism', exact: true }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'synthetic-fm2013-capture.json',
    mimeType: 'application/json',
    buffer: Buffer.from(syntheticWire(), 'utf8')
  });
  await page.getByRole('button', { name: 'Validate and import' }).click();
  await expect(page.getByText('Capture parsed. Review its source, coverage and unknown fields before saving.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Synthetic FM2013 career' })).toBeVisible();
}

test('explains the manual capture handoff in English and Vietnamese without a fake live connection', async ({ page }) => {
  await page.goto('/#/history');
  const guide = page.locator('details.historical-capture-guide');
  await expect(guide).not.toHaveAttribute('open', '');
  await guide.locator('summary').click();
  await expect(guide).toHaveAttribute('open', '');
  await expect(guide.getByText('Prepare an authorized capture')).toBeVisible();
  await expect(guide.getByText('Run the prepared script manually')).toBeVisible();
  await expect(guide.locator('pre').first()).toContainText('--pid 1234');
  await expect(guide.locator('pre').nth(1)).toContainText('export-wire');
  await expect(guide.locator('pre').nth(1)).toContainText('--evidence-id ev_REPLACE_WITH_64_HEX');
  await expect(guide.getByText('This procedure does not establish a live connection, authenticated runtime bytes, career lineage, or permission to edit game data.')).toBeVisible();

  await page.getByRole('button', { name: 'Switch language to Vietnamese' }).click();
  await expect(guide.locator('summary')).toHaveText('Cách tạo file capture');
  await expect(guide.getByText('Chạy thủ công script đã chuẩn bị')).toBeVisible();
  await guide.locator('summary').press('Enter');
  await expect(guide).not.toHaveAttribute('open', '');
});

test('imports, browses, saves, reloads and switches safely between Editor and Realism projections', async ({ page }) => {
  await page.goto('/#/history');
  await expect(page.getByRole('heading', { name: 'Historical snapshots' })).toBeVisible();
  await importSynthetic(page, 'Editor');

  const passing = page.locator('.historical-value-row').filter({ hasText: 'Passing' });
  await expect(passing.locator('strong')).toHaveText('15');
  await expect(page.getByText('Derived calendar age').first()).toBeVisible();
  await expect(page.getByText('Not verified').first()).toBeVisible();

  await page.getByRole('button', { name: 'Save snapshot locally' }).click();
  await expect(page.getByRole('button', { name: 'Saved on this browser' })).toBeDisabled();
  await expect(page.getByRole('list', { name: 'Saved historical snapshots' }).getByText('Synthetic FM2013 career')).toBeVisible();

  const persistedPrivacy = await page.evaluate(async () => {
    const request = indexedDB.open('managerhub-local', 4);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const read = (name: string) => new Promise<unknown[]>((resolve, reject) => {
        const get = db.transaction(name, 'readonly').objectStore(name).getAll();
        get.onsuccess = () => resolve(get.result);
        get.onerror = () => reject(get.error);
      });
      const editor = await read('historical-editor-snapshots') as Array<Record<string, unknown>>;
      const realism = await read('historical-realism-snapshots') as Array<Record<string, unknown>>;
      const editorPlayer = (editor[0]?.snapshot as { players: Array<{ attributes: Record<string, { value: number | null }> }> }).players[0];
      const realismPlayer = (realism[0]?.snapshot as { players: Array<{
        attributes: Record<string, { value: number | null; missingReason: string | null }>;
        birthDate: { value: string | null };
        primaryNation: { value: unknown };
        calendarAge: { value: number | null };
      }> }).players[0];
      return {
        editorCount: editor.length,
        realismCount: realism.length,
        editorPassing: editorPlayer?.attributes.passing?.value,
        realismPassing: realismPlayer?.attributes.passing?.value,
        realismMissingReason: realismPlayer?.attributes.passing?.missingReason,
        realismBirthDate: realismPlayer?.birthDate.value,
        realismNation: realismPlayer?.primaryNation.value,
        realismAge: realismPlayer?.calendarAge.value,
        rawWireStored: Object.hasOwn(realism[0] ?? {}, 'wire')
      };
    } finally { db.close(); }
  });
  expect(persistedPrivacy).toMatchObject({
    editorCount: 1, realismCount: 1, editorPassing: 15, realismPassing: null,
    realismMissingReason: 'redacted', realismBirthDate: null, realismNation: null,
    realismAge: null, rawWireStored: false
  });

  await page.getByRole('button', { name: 'Realism', exact: true }).click();
  const hiddenPassing = page.locator('.historical-value-row').filter({ hasText: 'Passing' });
  await expect(hiddenPassing.locator('strong')).toHaveText('Hidden in Realism mode');
  await expect(page.getByText('Synthetic Nation')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Saved on this browser' })).toBeDisabled();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Historical snapshots' })).toBeVisible();
  await page.getByRole('list', { name: 'Saved historical snapshots' }).getByRole('button', { name: 'Open' }).click();
  const reloadedHiddenPassing = page.locator('.historical-value-row').filter({ hasText: 'Passing' });
  await expect(reloadedHiddenPassing.locator('strong')).toHaveText('Hidden in Realism mode');

  await page.getByRole('button', { name: 'Editor', exact: true }).click();
  const restoredPassing = page.locator('.historical-value-row').filter({ hasText: 'Passing' });
  await expect(restoredPassing.locator('strong')).toHaveText('15');
  await expect(page.getByText('Synthetic Nation')).toBeVisible();

  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm delete', exact: true }).click();
  await expect(page.getByText('No historical snapshots saved')).toBeVisible();
  const remaining = await page.evaluate(async () => {
    const request = indexedDB.open('managerhub-local', 4);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const count = (name: string) => new Promise<number>((resolve, reject) => {
        const query = db.transaction(name, 'readonly').objectStore(name).count();
        query.onsuccess = () => resolve(query.result);
        query.onerror = () => reject(query.error);
      });
      return {
        editor: await count('historical-editor-snapshots'),
        realism: await count('historical-realism-snapshots')
      };
    } finally { db.close(); }
  });
  expect(remaining).toEqual({ editor: 0, realism: 0 });
});

test('Realism-only imports stay redacted after persistence and do not synthesize an Editor projection', async ({ page }) => {
  await page.goto('/#/history');
  await importSynthetic(page, 'Realism');

  const hiddenPassing = page.locator('.historical-value-row').filter({ hasText: 'Passing' });
  await expect(hiddenPassing.locator('strong')).toHaveText('Hidden in Realism mode');
  await page.getByRole('button', { name: 'Save snapshot locally' }).click();
  await expect(page.getByRole('button', { name: 'Saved on this browser' })).toBeDisabled();

  await page.getByRole('button', { name: 'Editor', exact: true }).click();
  await expect(page.getByText('No saved projection exists in this mode. Reimport the source capture in this mode, or save an Editor import to keep both projections.')).toBeVisible();
  await expect(page.locator('.historical-value-row')).toHaveCount(0);
});

test('rejects malformed and unsupported captures without saving a snapshot', async ({ page }) => {
  await page.goto('/#/history');
  await page.getByLabel('Career label (user-declared)').fill('Malformed test career');
  await page.getByLabel('Capture time (declared by source workflow)').fill('2026-10-31T09:00');
  await page.locator('input[type=file]').setInputFiles({
    name: 'malformed.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"schema":"wrong"}', 'utf8')
  });
  await page.getByRole('button', { name: 'Validate and import' }).click();
  await expect(page.getByRole('alert')).toContainText('Unexpected or missing capture fields.');
  await expect(page.getByText('No historical snapshots saved')).toBeVisible();
});


test('detects duplicate source captures without creating a second saved snapshot', async ({ page }) => {
  await page.goto('/#/history');
  await importSynthetic(page, 'Editor');
  await page.getByRole('button', { name: 'Save snapshot locally' }).click();
  await expect(page.getByRole('button', { name: 'Saved on this browser' })).toBeDisabled();

  await importSynthetic(page, 'Editor');
  await page.getByRole('button', { name: 'Save snapshot locally' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'This source capture is already saved in the local library' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Saved historical snapshots' }).getByRole('listitem')).toHaveCount(1);
});

test('enforces the historical snapshot count limit without overwriting existing records', async ({ page }) => {
  await page.goto('/#/history');
  await expect(page.getByRole('heading', { name: 'Historical snapshots' })).toBeVisible();
  await expect(page.getByText('No historical snapshots saved')).toBeVisible();
  await page.evaluate(async () => {
    const request = indexedDB.open('managerhub-local', 4);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('historical-realism-summaries', 'readwrite');
        const store = tx.objectStore('historical-realism-summaries');
        for (let index = 0; index < 10; index++) {
          store.add({
            schema: 'managerhub.fm2013-historical-snapshot',
            schemaVersion: 1,
            id: 'seed-' + index,
            mode: 'realism',
            fileName: 'synthetic-seed-' + index + '.json',
            sourceSize: 100,
            sourceSha256: String(index).padStart(64, '0'),
            importedAt: '2026-10-31T09:05:00.000Z',
            capturedAt: '2026-10-31T09:00:00.000Z',
            careerLabel: 'Synthetic seed ' + index,
            edition: 'FM2013',
            build: '13.3.3f359652',
            status: 'ready',
            playerCount: 1,
            coverageCount: 2
          });
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } finally { db.close(); }
  });
  await page.reload();
  await importSynthetic(page, 'Realism');
  await page.getByRole('button', { name: 'Save snapshot locally' }).click();
  await expect(page.getByRole('alert')).toContainText('This browser already holds 10 historical snapshots in this mode.');
  await expect(page.getByRole('list', { name: 'Saved historical snapshots' }).getByRole('listitem')).toHaveCount(10);
});

test('clears corrupt historical metadata without deleting the existing player library', async ({ page }) => {
  await page.goto('/#/history');
  await expect(page.getByRole('heading', { name: 'Historical snapshots' })).toBeVisible();
  await expect(page.getByText('No historical snapshots saved')).toBeVisible();
  await page.evaluate(async () => {
    const request = indexedDB.open('managerhub-local', 4);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['historical-realism-summaries', 'player-export-summaries'], 'readwrite');
        tx.objectStore('historical-realism-summaries').put({ id: 'corrupt', mode: 'realism', sourceSha256: 'bad' });
        tx.objectStore('player-export-summaries').put({
          id: 'preserved-player-summary',
          savedAt: '2026-10-31T09:05:00.000Z',
          fileName: 'preserved.csv',
          importedAt: '2026-10-31T09:00:00.000Z',
          playerCount: 1,
          attributeCount: 2
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } finally { db.close(); }
  });
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('Saved historical snapshot metadata is incompatible with this version.');
  await page.getByRole('button', { name: 'Clear incompatible historical library' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  const remaining = await page.evaluate(async () => {
    const request = indexedDB.open('managerhub-local', 4);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const count = (name: string) => new Promise<number>((resolve, reject) => {
        const query = db.transaction(name, 'readonly').objectStore(name).count();
        query.onsuccess = () => resolve(query.result);
        query.onerror = () => reject(query.error);
      });
      return {
        historical: await count('historical-realism-summaries'),
        playerSummaries: await count('player-export-summaries')
      };
    } finally { db.close(); }
  });
  expect(remaining).toEqual({ historical: 0, playerSummaries: 1 });
});


test('keeps the workspace keyboard-accessible, reduced-motion friendly and usable at narrow 200%-zoom width', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const viewport = page.viewportSize();
  if (viewport && viewport.width > 760) await page.setViewportSize({ width: 640, height: 900 });
  await page.goto('/#/history');
  await expect(page.getByRole('heading', { name: 'Historical snapshots' })).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);

  const careerInput = page.getByLabel('Career label (user-declared)');
  await careerInput.focus();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Capture time (declared by source workflow)')).toBeFocused();

  const motion = await page.locator('.historical-workspace button').first().evaluate(element => ({
    transition: getComputedStyle(element).transitionDuration,
    animation: getComputedStyle(element).animationDuration
  }));
  expect(motion.transition).toBe('0s');
  expect(motion.animation).toBe('0s');
});
