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
      imagePath: profile.imagePath,
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
    const request = indexedDB.open('managerhub-local', 3);
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
    const request = indexedDB.open('managerhub-local', 3);
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
  await expect(page.getByRole('alert')).toContainText('Unsupported capture profile.');
  await expect(page.getByText('No historical snapshots saved')).toBeVisible();
});
