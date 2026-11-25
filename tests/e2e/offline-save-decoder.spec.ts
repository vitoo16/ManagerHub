import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { buildSyntheticFm2013LangDb } from '../../packages/domain/src/fm2013-offline/lang-db';
import { buildSyntheticFm2013Save, SYNTHETIC_TEST_HMAC_KEY } from '../../packages/domain/src/fm2013-offline/synthetic';

// Test-only PE fixture exercises the same explicit authorization UI as real input.
function buildSyntheticAuthorizationExecutable(): Buffer {
  const bytes = Buffer.alloc(4_500_000);
  bytes.write('MZ', 0, 'ascii');
  const pe = 0x80;
  bytes.writeUInt32LE(pe, 0x3c);
  bytes.set([0x50, 0x45, 0, 0], pe);
  bytes.writeUInt16LE(1, pe + 6);
  bytes.writeUInt16LE(0xe0, pe + 20);
  bytes.writeUInt16LE(0x10b, pe + 24);
  bytes.writeUInt32LE(0x400000, pe + 24 + 28);
  const section = pe + 24 + 0xe0;
  bytes.writeUInt32LE(0x2000, section + 8);
  bytes.writeUInt32LE(0x2074000, section + 12);
  bytes.writeUInt32LE(0x2000, section + 16);
  bytes.writeUInt32LE(0x1000, section + 20);
  const keyOffset = 0x1000 + 0xbe0;
  for (let i = 0; i < 16; i++) bytes[keyOffset + i] = SYNTHETIC_TEST_HMAC_KEY[i * 2]!;
  return bytes;
}

const WCAG_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

function summarizeViolations(violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations']) {
  return violations.map(({ id, impact, help, nodes }) => ({
    id,
    impact,
    help,
    nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary }))
  }));
}

test('complete offline FM2013 save workflow: decode, explore, Realism/Editor isolation, Player Lab, Squad Planner, and browser persistence', async ({ page }) => {
  test.setTimeout(90_000);
  const saveBytes = await buildSyntheticFm2013Save({
    compressed: true,
    family: 'afe',
    managerName: 'Alex Mercer'
  });

  // 1. Open ManagerHub -> Load a .fm save directly from Overview (zero CSV/HTML/FMRTE)
  await page.goto('/');
  await page.locator('.hero').getByRole('button', { name: 'Load a .fm save' }).click();
  await expect(page.getByRole('heading', { name: 'Save Library' })).toBeVisible();

  await page.locator('.file-drop input[type="file"]').setInputFiles({
    name: 'northbridge-career.fm',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from(saveBytes)
  });

  // 2. Verify full offline decoded database explorer appears immediately
  const explorer = page.locator('.save-db-explorer');
  await expect(explorer).toBeVisible({ timeout: 20_000 });
  await expect(explorer).toContainText('northbridge-career.fm');
  await expect(explorer).toContainText('FM2013 13.3.3');
  await expect(explorer).toContainText('Exact EOF verified');
  await expect(explorer).toContainText('Read-only · Original .fm unchanged');
  await expect(explorer).toContainText('Alex Mercer · Northbridge');

  // 3. Realism mode (default): CA and PA columns MUST be hidden
  const modeGroup = explorer.getByRole('group', { name: 'Display mode' });
  await expect(modeGroup.getByRole('button', { name: 'Realism mode' })).toHaveAttribute('aria-pressed', 'true');
  await expect(explorer.locator('thead th', { hasText: /^CA$/ })).toHaveCount(0);
  await expect(explorer.locator('thead th', { hasText: /^PA$/ })).toHaveCount(0);
  await expect(explorer.locator('tbody')).toContainText('Owen Shaw');
  await expect(explorer.locator('tbody')).toContainText('Sam Cooper');
  await expect(explorer.locator('tbody')).toContainText('On loan from: Harbor City');

  // 4. Explore all persisted football database tabs
  await explorer.getByRole('tab', { name: /Clubs & Finances/ }).click();
  await expect(explorer.locator('tbody')).toContainText('Northbridge Athletic');
  await expect(explorer.locator('tbody')).toContainText('£45.00M');
  await expect(explorer.locator('tbody')).toContainText('£18.50M');
  await expect(explorer.locator('tbody')).toContainText('1892');

  await explorer.getByRole('tab', { name: /Staff & Managers/ }).click();
  await expect(explorer.locator('tbody')).toContainText('Alex Mercer');
  await expect(explorer.locator('tbody')).toContainText('Human manager');

  await explorer.getByRole('tab', { name: /Teams/ }).click();
  await expect(explorer.locator('tbody')).toContainText('First Team');

  await explorer.getByRole('tab', { name: /Stadiums/ }).click();
  await expect(explorer.locator('tbody')).toContainText('Northbridge Park');
  await expect(explorer.locator('tbody')).toContainText('Inline in save');
  await expect(explorer.locator('tbody')).toContainText('55,000');

  await explorer.getByRole('tab', { name: /Nations/ }).click();
  await expect(explorer.locator('tbody')).toContainText('England');
  await expect(explorer.locator('tbody')).toContainText('Spain');

  await explorer.getByRole('tab', { name: /Competitions/ }).click();
  await expect(explorer.locator('tbody')).toContainText('Premier Synthetic Division');
  await expect(explorer.locator('tbody')).toContainText('Inline in save');

  // 5. Switch to Editor mode -> verified CA and PA columns appear
  await explorer.getByRole('tab', { name: /Players/ }).click();
  await modeGroup.getByRole('button', { name: 'Editor mode' }).click();
  await expect(modeGroup.getByRole('button', { name: 'Editor mode' })).toHaveAttribute('aria-pressed', 'true');
  await expect(explorer.locator('thead th', { hasText: /^CA$/ })).toBeVisible();
  await expect(explorer.locator('thead th', { hasText: /^PA$/ })).toBeVisible();
  await toolbar.locator('input[accept=".exe"]').setInputFiles({
    name: 'synthetic-test-only.exe', mimeType: 'application/octet-stream',
    buffer: buildSyntheticAuthorizationExecutable()
  });
  await expect(toolbar).toContainText('HMAC-SHA512');
  const owenRow = explorer.locator('tbody tr', { hasText: 'Owen Shaw' });
  await expect(owenRow).toContainText('168');
  await expect(owenRow).toContainText('182');

  // 6. Open Owen Shaw directly in Player Lab (ZERO CSV step)
  await owenRow.getByRole('button', { name: 'Open in Player Lab' }).click();
  await expect(page.getByRole('heading', { name: 'Player Lab' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Owen Shaw' })).toBeVisible();
  await expect(page.locator('.scout-metrics')).toContainText('168');
  await expect(page.locator('.scout-metrics')).toContainText('182');
  await expect(page.locator('.scout-metrics')).toContainText('Decoded from save · Verified');
  await expect(page.getByText('Contract & physical profile')).toBeVisible();
  await expect(page.getByText('£145,000')).toBeVisible();
  await expect(page.getByText('Positional familiarity (1–20)')).toBeVisible();
  await expect(page.getByText('Hidden attributes & personality (Editor mode)')).toBeVisible();
  await expect(page.getByText('Professionalism')).toBeVisible();

  // 7. Toggle Realism mode inside Player Lab -> CA, PA & hidden personality immediately redacted
  await page.locator('.decoded-save-bar').getByRole('button', { name: 'Realism mode' }).click();
  await expect(page.locator('.scout-metrics')).toContainText('Hidden in Realism mode');
  await expect(page.locator('.scout-metrics')).not.toContainText('168');
  await expect(page.locator('.scout-metrics')).not.toContainText('182');
  await expect(page.getByText('Switch to Editor mode to view verified Actual CA')).toBeVisible();

  // 8. Navigate to Squad Planner -> managed club XI solved directly from .fm save
  await page.keyboard.press('Control+k');
  await page.getByRole('dialog', { name: 'Quick navigation' }).getByRole('button', { name: /Squad Planner/ }).click();
  await expect(page.getByRole('heading', { name: 'Squad Planner' })).toBeVisible();
  await expect(page.locator('.squad-decoded-bar')).toContainText('northbridge-career.fm');
  await expect(page.getByText('Starting eleven ready').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tactical Lab' })).toBeVisible();

  // 9. Persist decoded database in browser IndexedDB (never saving raw .fm), reload, and reopen
  await page.keyboard.press('Control+k');
  await page.getByRole('dialog', { name: 'Quick navigation' }).getByRole('button', { name: /Save Library/ }).click();
  await expect(explorer).toBeVisible();
  await explorer.getByRole('button', { name: 'Save database on this browser' }).click();
  await expect(page.locator('.saved-decoded-library')).toContainText('northbridge-career.fm');

  await page.reload();
  await expect(page.locator('.saved-decoded-library')).toContainText('northbridge-career.fm');
  await page.locator('.saved-decoded-library').getByRole('button', { name: 'Open save' }).click();
  await expect(page.locator('.save-db-explorer')).toContainText('northbridge-career.fm');
  await expect(page.locator('.save-db-explorer tbody')).toContainText('Owen Shaw');
});

test('multi-save isolation across compressed AFE and uncompressed FMF, VI/EN toggle, and WCAG 2.2 AA compliance', async ({ page }) => {
  test.setTimeout(90_000);
  const saveAlpha = await buildSyntheticFm2013Save({
    compressed: true,
    family: 'afe',
    managerName: 'Alex Mercer'
  });
  const saveBeta = await buildSyntheticFm2013Save({
    compressed: false,
    family: 'fmf',
    managerName: 'Elena Vance',
    clubs: [
      {
        uid: 9901,
        fullName: 'Valeria Sporting',
        shortName: 'Valeria',
        nationRow: 1,
        yearFounded: 1911,
        balanceGbp: 31_000_000,
        transferBudgetGbp: 12_000_000,
        weeklyWageBudgetGbp: 610_000,
        reputation: 7900
      },
      {
        uid: 9902,
        fullName: 'Riverton FC',
        shortName: 'Riverton',
        nationRow: 0,
        yearFounded: 1920,
        balanceGbp: 14_000_000,
        transferBudgetGbp: 5_000_000,
        weeklyWageBudgetGbp: 300_000,
        reputation: 6800
      }
    ],
    players: [
      {
        uid: 30001,
        firstName: 'Marco',
        lastName: 'Reyes',
        birthDoy: 60,
        birthYear: 1990,
        nationRow: 1,
        clubRow: 0,
        ca: 171,
        pa: 185,
        rep: 8100,
        wageGbp: 120_000,
        marketValueGbp: 19_000_000,
        heightCm: 179,
        weightKg: 74,
        squadNumber: 10,
        positions: { AMC: 20, MC: 18, ST: 15 },
        baseAttr: 16,
        hiddenBase: 15,
        personality: [14, 17, 13, 16, 18, 12, 14, 6]
      }
    ]
  });

  await page.goto('/#/saves');
  await page.locator('.file-drop input[type="file"]').setInputFiles({
    name: 'alpha-compressed.fm',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from(saveAlpha)
  });
  const explorer = page.locator('.save-db-explorer');
  await expect(explorer).toContainText('alpha-compressed.fm');
  await expect(explorer).toContainText('Owen Shaw');

  // Upload second uncompressed FMF save and confirm strict isolation (no Alpha data leaks)
  await page.locator('.file-drop input[type="file"]').setInputFiles({
    name: 'beta-uncompressed.fm',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from(saveBeta)
  });
  await expect(explorer).toContainText('beta-uncompressed.fm');
  await expect(explorer).toContainText('FMF (raw)');
  await expect(explorer).toContainText('Elena Vance · Valeria');
  await expect(explorer.locator('tbody')).toContainText('Marco Reyes');
  await expect(explorer.locator('tbody')).not.toContainText('Owen Shaw');

  // Switch back to Alpha via multi-save switcher
  await explorer.getByLabel('Switch active save').selectOption({ label: 'alpha-compressed.fm (14 Players)' });
  await expect(explorer).toContainText('alpha-compressed.fm');
  await expect(explorer.locator('tbody')).toContainText('Owen Shaw');
  await expect(explorer.locator('tbody')).not.toContainText('Marco Reyes');

  // Verify VI / EN localization
  await page.locator('.language-switch button[lang="vi"]').click();
  await expect(explorer).toContainText('Đã giải mã ngoại tuyến từ FM2013');
  await expect(explorer).toContainText('Chế độ Thực tế (Realism)');
  await page.locator('.language-switch button[lang="en"]').click();
  await expect(explorer).toContainText('Decoded offline from FM2013');

  // Verify WCAG 2.2 A/AA zero violations with decoded save active in both dark and light themes
  const waitWorkspaceSettled = async () => {
    await expect(page.locator('[data-animate="workspace"]')).toHaveCSS('opacity', '1');
    await expect(page.locator('[data-animate="workspace"] .file-drop, [data-animate="workspace"] .scout-identity, [data-animate="workspace"] .squad-decoded-bar').first()).toHaveCSS('opacity', '1');
  };
  for (const theme of ['dark', 'light'] as const) {
    if (theme === 'light') {
      await page.getByRole('button', { name: 'Switch to light mode' }).click();
      await expect(page.locator('.file-drop')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    }
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await waitWorkspaceSettled();

    // Save Library with decoded database explorer
    const saveResults = await new AxeBuilder({ page }).withTags(WCAG_AA_TAGS).analyze();
    expect(summarizeViolations(saveResults.violations), `Save Library (${theme}) WCAG`).toEqual([]);

    // Player Lab with decoded player profile
    await page.keyboard.press('Control+k');
    await page.getByRole('dialog', { name: 'Quick navigation' }).getByRole('button', { name: /Player Lab/ }).click();
    await expect(page.getByRole('heading', { name: 'Player Lab' })).toBeVisible();
    await waitWorkspaceSettled();
    const playerResults = await new AxeBuilder({ page }).withTags(WCAG_AA_TAGS).analyze();
    expect(summarizeViolations(playerResults.violations), `Player Lab (${theme}) WCAG`).toEqual([]);

    // Squad Planner with decoded club squad
    await page.keyboard.press('Control+k');
    await page.getByRole('dialog', { name: 'Quick navigation' }).getByRole('button', { name: /Squad Planner/ }).click();
    await expect(page.getByRole('heading', { name: 'Squad Planner' })).toBeVisible();
    await waitWorkspaceSettled();
    const squadResults = await new AxeBuilder({ page }).withTags(WCAG_AA_TAGS).analyze();
    expect(summarizeViolations(squadResults.violations), `Squad Planner (${theme}) WCAG`).toEqual([]);

    // Return to Save Library for next theme iteration
    if (theme === 'dark') {
      await page.keyboard.press('Control+k');
      await page.getByRole('dialog', { name: 'Quick navigation' }).getByRole('button', { name: /Save Library/ }).click();
      await expect(explorer).toBeVisible();
      await waitWorkspaceSettled();
    }
  }
});

test('P0 unified SaveSession (S01-S08): non-remounting continuity, decoupled club filter, mode-independent shortlist, lang_db, Undo/Redo, and certified Save As .fm roundtrip', async ({ page }) => {
  test.setTimeout(120_000);
  const saveBytes = await buildSyntheticFm2013Save({
    compressed: true,
    family: 'afe',
    managerName: 'Alex Mercer'
  });
  const langDbBytes = await buildSyntheticFm2013LangDb();

  const navigateTo = async (label: RegExp) => {
    await page.keyboard.press('Control+k');
    await page.getByRole('dialog', { name: 'Quick navigation' }).getByRole('button', { name: label }).click();
  };

  // 1. Load save once -> verify global ActiveSaveToolbar appears
  await page.goto('/#/saves');
  await page.locator('.file-drop input[type="file"]').setInputFiles({
    name: 'northbridge-career.fm',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from(saveBytes)
  });

  const toolbar = page.getByRole('region', { name: 'Active save session' });
  const explorer = page.locator('.save-db-explorer');
  await expect(toolbar).toBeVisible({ timeout: 20_000 });
  await expect(toolbar).toContainText('northbridge-career.fm');
  await expect(toolbar).not.toContainText('HMAC-SHA512');

  // 2. Attach lang_db.dat via global toolbar (Gate B)
  await toolbar.locator('input[accept=".dat"]').setInputFiles({
    name: 'lang_db.dat',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from(langDbBytes)
  });
  await expect(toolbar).toContainText('lang_db');

  // 3. S01 & S02: Set search query in Save Library, visit Player Lab -> Squad Planner -> Overview -> Save Library, verify NO remount
  const searchInput = explorer.getByPlaceholder('Search database…');
  await searchInput.fill('Owen');
  await expect(explorer.locator('tbody tr')).toHaveCount(1);

  await navigateTo(/Player Lab/);
  await expect(page.getByRole('heading', { name: 'Player Lab' })).toBeVisible();
  await expect(toolbar).toBeVisible();

  // 4. S03 (AUD-03): Change Player Lab local club filter to Harbor City -> Squad Planner global managed club stays Northbridge
  const playerClubSelect = page.locator('.decoded-save-bar select');
  await playerClubSelect.selectOption({ label: 'Harbor City (2)' });
  await expect(toolbar.getByLabel('Global managed club').locator('option:checked')).toContainText('Northbridge (12)');

  await navigateTo(/Squad Planner/);
  await expect(page.getByRole('heading', { name: 'Squad Planner' })).toBeVisible();
  await expect(page.locator('.squad-decoded-bar')).toContainText('Northbridge');
  await expect(page.getByText('Starting eleven ready').first()).toBeVisible();

  // Return to Player Lab and restore Northbridge filter -> verify S04 mode-independent Scouting Shortlist persistence
  await navigateTo(/Player Lab/);
  await playerClubSelect.selectOption({ label: 'Northbridge (12)' });
  await page.getByPlaceholder('Search player, team, position…').fill('Owen');
  await page.getByRole('button', { name: /Owen Shaw/ }).click();
  await toolbar.getByRole('group', { name: 'Global display mode' }).getByRole('button', { name: 'Editor mode' }).click();
  await expect(page.locator('.scout-metrics')).toContainText('168');

  const shortlistRegion = page.getByRole('region', { name: 'Scouting shortlist' });
  await shortlistRegion.getByRole('button', { name: 'Add selected player to shortlist' }).click();
  await shortlistRegion.getByRole('button', { name: 'Save shortlist locally' }).click();
  await expect(shortlistRegion).toContainText('Shortlist saved on this browser for this exact player export.');

  // Switch to Realism mode -> remove from session -> restore saved shortlist -> must succeed across modes with zero CA/PA leak!
  await toolbar.getByRole('group', { name: 'Global display mode' }).getByRole('button', { name: 'Realism mode' }).click();
  await expect(page.locator('.scout-metrics')).toContainText('Hidden in Realism mode');
  await shortlistRegion.getByRole('button', { name: 'Remove selected player from shortlist' }).click();
  await expect(shortlistRegion).toContainText('0 / 50');
  await shortlistRegion.getByRole('button', { name: 'Restore saved shortlist' }).click();
  await expect(shortlistRegion).toContainText('Saved shortlist restored.');
  await expect(shortlistRegion).toContainText('1 / 50');

  // Visit Overview and return to Save Library -> confirm SaveDatabaseExplorer kept 'Owen' search without remounting!
  await navigateTo(/Overview/);
  await expect(toolbar).toBeVisible();
  await navigateTo(/Save Library/);
  await expect(searchInput).toHaveValue('Owen');
  await searchInput.fill('');

  // 5. S06 & S08: Switch to Editor mode -> Edit Owen Shaw + Club Finances -> Test Undo/Redo -> Certified Save As .fm roundtrip
  await toolbar.getByRole('group', { name: 'Global display mode' }).getByRole('button', { name: 'Editor mode' }).click();
  const owenRow = explorer.locator('tbody tr', { hasText: 'Owen Shaw' });
  await owenRow.getByRole('button', { name: 'Edit' }).click();

  const modal = page.getByRole('dialog');
  await expect(modal).toContainText('Edit player · Owen Shaw');

  // S05: Verify WCAG 2.2 AA compliance on the open FMRTE13 Editor Modal
  const modalAxe = await new AxeBuilder({ page }).include('.editor-modal').withTags(WCAG_AA_TAGS).analyze();
  expect(summarizeViolations(modalAxe.violations), 'SaveEntityEditorModal WCAG').toEqual([]);

  await modal.getByLabel('Actual CA (1–200)').fill('191');
  await modal.getByLabel('Actual PA (1–200)').fill('198');
  await modal.getByRole('button', { name: 'Inspire morale' }).click();
  await modal.getByRole('button', { name: 'Done' }).click();
  await expect(modal).toHaveCount(0);

  await expect(owenRow).toContainText('191');
  await expect(owenRow).toContainText('198');
  await expect(toolbar).toContainText('unsaved edits');

  // Verify Undo & Redo on global toolbar
  await toolbar.getByRole('button', { name: 'Undo last edit' }).click();
  await toolbar.getByRole('button', { name: 'Undo last edit' }).click();
  await expect(owenRow).toContainText('191');
  await expect(owenRow).toContainText('182');
  await toolbar.getByRole('button', { name: 'Redo edit' }).click();
  await toolbar.getByRole('button', { name: 'Redo edit' }).click();
  await expect(owenRow).toContainText('198');

  // Edit Northbridge Athletic club balance to £120M
  await explorer.getByRole('tab', { name: /Clubs & Finances/ }).click();
  const northbridgeRow = explorer.locator('tbody tr', { hasText: 'Northbridge Athletic' });
  await northbridgeRow.getByRole('button', { name: 'Edit' }).click();
  await expect(modal).toContainText('Edit club & finances · Northbridge Athletic');
  await modal.getByLabel('Balance (£)').fill('120000000');
  await modal.getByRole('button', { name: 'Done' }).click();
  await expect(northbridgeRow).toContainText('£120.00M');

  // Open Save As .fm modal -> verify diff preview -> download certified .fm -> re-import & verify roundtrip!
  await toolbar.getByRole('button', { name: 'Save As .fm' }).click();
  await expect(modal).toContainText('Save As .fm (Experimental Offline Copy)');
  await expect(modal).toContainText('HMAC-SHA512 signing key ready');
  await expect(modal.locator('tbody')).toContainText('Owen Shaw');
  await expect(modal.locator('tbody')).toContainText('Northbridge');
  await expect(modal.locator('tbody')).toContainText('120000000');

  const downloadPromise = page.waitForEvent('download');
  await modal.getByRole('button', { name: 'Download experimental Save As .fm' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('northbridge-career-edited.fm');
  const downloadedPath = await download.path();
  expect(downloadedPath).toBeTruthy();
  const patchedBytes = await readFile(downloadedPath!);
  await expect(modal).toHaveCount(0);

  // Accept confirm prompt when loading the newly exported .fm over dirty draft
  page.once('dialog', dialog => dialog.accept());
  await page.locator('.file-drop input[type="file"]').setInputFiles({
    name: 'northbridge-career-edited.fm',
    mimeType: 'application/octet-stream',
    buffer: patchedBytes
  });

  await expect(explorer).toContainText('northbridge-career-edited.fm');
  await expect(explorer).toContainText('Exact EOF verified');
  await expect(northbridgeRow).toContainText('£120.00M');
  await explorer.getByRole('tab', { name: /Players/ }).click();
  await expect(explorer.locator('tbody tr', { hasText: 'Owen Shaw' })).toContainText('191');
  await expect(explorer.locator('tbody tr', { hasText: 'Owen Shaw' })).toContainText('198');
});

test('browser cache stores immutable source rather than dirty editor projection (R01)', async ({ page }) => {
  const bytes = await buildSyntheticFm2013Save({ compressed: true, family: 'afe' });
  await page.goto('/#/saves');
  await page.locator('.file-drop input[type="file"]').setInputFiles({
    name: 'cache-source.fm', mimeType: 'application/octet-stream', buffer: Buffer.from(bytes)
  });
  const toolbar = page.getByRole('region', { name: 'Active save session' });
  const explorer = page.locator('.save-db-explorer');
  await expect(toolbar).toBeVisible({ timeout: 20_000 });
  await toolbar.getByRole('group', { name: 'Global display mode' }).getByRole('button', { name: 'Editor mode' }).click();
  const row = explorer.locator('tbody tr', { hasText: 'Owen Shaw' });
  const originalText = (await row.innerText()).replace(/\s+/g, ' ').trim();
  await row.getByRole('button', { name: 'Edit' }).click();
  const modal = page.getByRole('dialog');
  await modal.getByLabel('Actual CA (1–200)').fill('199');
  await modal.getByRole('button', { name: 'Done' }).click();
  await expect(row).toContainText('199');
  await explorer.getByRole('button', { name: 'Save database on this browser' }).click();
  await expect(explorer.getByRole('button', { name: 'Remove saved database' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Open save', exact: true }).click();
  await expect(toolbar).toBeVisible();
  await toolbar.getByRole('group', { name: 'Global display mode' }).getByRole('button', { name: 'Editor mode' }).click();
  await expect(row).toHaveText(originalText, { useInnerText: true });
  await expect(toolbar).not.toContainText('unsaved edits');
});

test('legacy decoded browser cache without source provenance is rejected (R01)', async ({ page }) => {
  const bytes = await buildSyntheticFm2013Save({ compressed: true, family: 'afe' });
  await page.goto('/#/saves');
  await page.locator('.file-drop input[type="file"]').setInputFiles({
    name: 'legacy-cache.fm', mimeType: 'application/octet-stream', buffer: Buffer.from(bytes)
  });
  const explorer = page.locator('.save-db-explorer');
  await expect(explorer).toBeVisible({ timeout: 20_000 });
  await explorer.getByRole('button', { name: 'Save database on this browser' }).click();
  await expect(explorer.getByRole('button', { name: 'Remove saved database' })).toBeVisible();

  // Emulate a cache created by the old editor candidate, preserving its contents.
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const open = indexedDB.open('managerhub-save-db');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction('save-db-records', 'readwrite');
      const store = tx.objectStore('save-db-records');
      const cursor = store.openCursor();
      cursor.onsuccess = () => {
        const row = cursor.result;
        if (row) {
          const value = row.value;
          delete value.sourceKind;
          row.update(value);
          row.continue();
        }
      };
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
  }));
  await page.reload();
  await page.getByRole('button', { name: 'Open save', exact: true }).click();
  await expect(page.getByText('Saved database provenance is unverified. Remove this browser cache and reopen the original .fm file.')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Active save session' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Remove saved database' })).toBeVisible();
});
