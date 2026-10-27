import { test, expect } from '@playwright/test';

test('navigation opens a functional module directory', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Every decision/i })).toBeVisible();
  await page.keyboard.press('Control+k');
  await page.getByRole('dialog', { name: 'Quick navigation' }).getByRole('button', { name: /Football Systems/i }).click();
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


test('imports real observed attributes into Player Lab without fake CA/PA', async ({ page }) => {
  await page.goto('/#/players');
  await expect(page.getByRole('heading',{name:'Player Lab'})).toBeVisible();
  const csv = [
    'Name;Position;Age;Club;Passing;Vision;Decisions;First Touch;Technique;Composure;Positioning;Teamwork;Tackling;Pace;Stamina;Work Rate',
    'Test Creator;CM;23;Verified Export FC;18;18;17;17;16;16;11;14;8;14;15;13',
    'Test Defender;CB;27;Verified Export FC;10;9;13;12;9;14;18;17;19;10;14;16'
  ].join('\r\n');
  await page.locator('input[type=file]').setInputFiles({name:'export.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
  await expect(page.getByText('2 player records')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Test Creator'})).toBeVisible();
  await expect(page.getByText('Uncalibrated · Not eCA')).toBeVisible();
  await expect(page.getByText('Not verified').first()).toBeVisible();
  await page.getByRole('tab',{name:'Role fit'}).click();
  await expect(page.getByText('Deep-Lying Playmaker')).toBeVisible();
  await page.getByRole('tab',{name:'Recruitment'}).click();
  await expect(page.getByText('Do not recommend a transfer yet')).toBeVisible();
  await page.getByRole('button',{name:/Test Defender/}).click();
  await expect(page.getByRole('heading',{name:'Test Defender'})).toBeVisible();
});

test('treats masked scouting attributes as unknown, not zero', async ({page}) => {
  await page.goto('/#/players');
  await page.locator('input[type=file]').setInputFiles({
    name:'masked.tsv',mimeType:'text/tab-separated-values',
    buffer:Buffer.from('Name\tPassing\tVision\tDecisions\nUnscouted\t-\t14-17\t?')
  });
  await expect(page.getByText('1 player records')).toBeVisible();
  await expect(page.getByText('No recognized, exact 1–20 attributes')).toHaveCount(0); // overview shows an empty radar
  await expect(page.getByText('No exact attributes observed')).toBeVisible();
  await page.getByRole('tab',{name:'Role fit'}).click();
  await expect(page.getByText('N/A').first()).toBeVisible();
});


test('supports native FM-style print to HTML table without external scripts', async ({page})=>{
  await page.goto('/#/players');
  const html = '<!doctype html><html><body><table><thead><tr><th>Name</th><th>Position</th><th>Passing</th><th>Vision</th><th>Decisions</th></tr></thead><tbody><tr><td>Test Native HTML</td><td>CM</td><td>16</td><td>18</td><td>14</td></tr></tbody></table></body></html>';
  await page.locator('input[type=file]').setInputFiles({name:'fm-print.html',mimeType:'text/html',buffer:Buffer.from(html)});
  await expect(page.getByRole('heading',{name:'Test Native HTML'})).toBeVisible();
  await page.getByRole('tab',{name:'Attributes'}).click();
  await expect(page.getByText('Passing', { exact: true })).toBeVisible();
  await expect(page.getByText('Vision', { exact: true })).toBeVisible();
  await expect(page.getByText('Uncalibrated · Not eCA')).toBeVisible();
});
