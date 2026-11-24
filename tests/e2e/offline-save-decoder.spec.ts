import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { buildSyntheticFm2013Save } from '../../packages/domain/src/fm2013-offline/synthetic';

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

  await page.locator('input[type="file"]').setInputFiles({
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
  await page.locator('input[type="file"]').setInputFiles({
    name: 'alpha-compressed.fm',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from(saveAlpha)
  });
  const explorer = page.locator('.save-db-explorer');
  await expect(explorer).toContainText('alpha-compressed.fm');
  await expect(explorer).toContainText('Owen Shaw');

  // Upload second uncompressed FMF save and confirm strict isolation (no Alpha data leaks)
  await page.locator('input[type="file"]').setInputFiles({
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
