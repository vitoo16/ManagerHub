import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const WORKSPACES = [
  'overview',
  'saves',
  'players',
  'history',
  'squad',
  'modules',
  'architecture'
] as const;

const WCAG_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

function summarizeViolations(violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations']) {
  return violations.map(({ id, impact, help, nodes }) => ({
    id,
    impact,
    help,
    nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary }))
  }));
}

test('every workspace meets the automated WCAG 2.2 A/AA accessibility baseline in both themes', async ({ page }) => {
  test.setTimeout(120_000);
  const findings: Array<{
    theme: 'dark' | 'light';
    workspace: string;
    violation: ReturnType<typeof summarizeViolations>[number];
  }> = [];

  for (const theme of ['dark', 'light'] as const) {
    await page.goto('/#/' + WORKSPACES[0]);
    const currentTheme = await page.locator('html').getAttribute('data-theme');
    if (currentTheme !== theme) {
      await page.getByRole('button', { name: /Switch to (light|dark) mode/ }).click();
    }
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

    for (const workspace of WORKSPACES) {
      await page.goto('/#/' + workspace);
      await expect(page.locator('#main-content h1').first(), theme + ' ' + workspace + ' workspace heading').toBeVisible();

      const results = await new AxeBuilder({ page }).withTags(WCAG_AA_TAGS).analyze();
      findings.push(...summarizeViolations(results.violations).map(violation => ({
        theme,
        workspace,
        violation
      })));
    }
  }

  expect(findings, 'WCAG 2.2 A/AA violations by theme and workspace').toEqual([]);
});

test('skip link is the first keyboard stop and moves focus to main content', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');

  const skipLink = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();

  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
});

test('quick navigation keeps focus inside the dialog and restores the opener', async ({ page }) => {
  await page.goto('/');
  const opener = page.getByRole('button', { name: /Switch to (light|dark) mode/ });
  await opener.click();
  await page.keyboard.press('Control+k');

  const dialog = page.getByRole('dialog', { name: 'Quick navigation' });
  const close = dialog.getByRole('button', { name: 'Close quick navigation' });
  const firstItem = dialog.locator('.command-item').first();
  const lastItem = dialog.locator('.command-item').last();

  await expect(dialog).toBeVisible();
  await expect(firstItem).toBeFocused();

  await page.keyboard.press('Shift+Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(lastItem).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});
