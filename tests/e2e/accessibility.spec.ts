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

for (const theme of ['dark', 'light'] as const) {
  for (const workspace of WORKSPACES) {
    test(workspace + ' workspace meets WCAG 2.2 A/AA (' + theme + ')', async ({ page }) => {
      test.setTimeout(60_000);
      await page.goto('/#/' + workspace);

      if (theme === 'light') {
        await page.getByRole('button', { name: 'Switch to light mode' }).click();
      }
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await expect(page.locator('#main-content h1').first(), workspace + ' workspace heading').toBeVisible();

      const results = await new AxeBuilder({ page }).withTags(WCAG_AA_TAGS).analyze();
      expect(
        summarizeViolations(results.violations),
        theme + ' ' + workspace + ' has WCAG A/AA accessibility violations'
      ).toEqual([]);
    });
  }
}
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
