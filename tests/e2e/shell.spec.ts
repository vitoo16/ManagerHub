import { test, expect } from '@playwright/test';

test('navigation opens a functional module directory', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Every decision/i })).toBeVisible();
  await page.getByRole('button', { name: /Explore the systems/i }).click();
  await expect(page.getByRole('heading', { name: 'Football Systems' })).toBeVisible();
  await expect(page.getByText('27 of 27 modules')).toBeVisible();
  await page.getByPlaceholder('Search modules or ID…').fill('Player Intelligence');
  await expect(page.getByText('1 of 27 modules')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Player Intelligence & eCA' })).toBeVisible();
});

test('inspects AFE header locally and never claims full save support', async ({ page }) => {
  await page.goto('/#/saves');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'career.fm',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from([2, 1, 97, 102, 101, 46, 5, 0, 0, 0])
  });
  await expect(page.getByText('Signature recognized')).toBeVisible();
  await expect(page.getByText('Not decoded')).toBeVisible();
  await expect(page.getByText(/Container family detected; player records/i)).toBeVisible();
  await expect(page.getByText('career.fm').first()).toBeVisible();
});

test('theme and glass preference controls remain accessible', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Disable glass effects' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-glass', 'off');
});

test('command navigation supports keyboard access', async ({ page, isMobile }) => {
  await page.goto('/');
  await page.keyboard.press('Control+k');
  const modal = page.getByRole('dialog', { name: 'Quick navigation' });
  await expect(modal).toBeVisible();
  await modal.getByRole('button', { name: /Data & Trust/i }).click();
  await expect(page.getByRole('heading', { name: 'Data & Trust' })).toBeVisible();
  if (isMobile) {
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  }
});

test('discovers a bounded synthetic trailing archive catalogue without extracting player data', async ({ page }) => {
  const { deflateSync } = await import('node:zlib');
  const index: number[] = [];
  const u32 = (n: number) => index.push(n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255);
  const name = (s: string) => { u32(s.length); for (const char of s) index.push(char.charCodeAt(0), 0); index.push(0, 0); };
  u32(0); u32(1); name('game_info'); name('.dat'); u32(0); u32(128); u32(256);
  const file = Buffer.concat([
    Buffer.from([2, 1, 97, 102, 101, 46]),
    Buffer.alloc(128, 0),
    Buffer.from([2, 1, 102, 109, 102, 46, 4, 0, 0]),
    deflateSync(Buffer.from(index))
  ]);
  await page.goto('/#/saves');
  await page.locator('input[type="file"]').setInputFiles({ name: 'synthetic.fm', mimeType: 'application/octet-stream', buffer: file });
  await expect(page.getByText('Internal archive index')).toBeVisible();
  await expect(page.getByText('game_info.dat')).toBeVisible();
  await expect(page.getByText(/member contents and game records are NOT decoded/i)).toBeVisible();
});
