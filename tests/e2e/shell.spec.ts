import { test, expect } from '@playwright/test';

function makeSquadExport(additional: readonly (readonly [string,string])[] = []): string {
  const attributeHeaders = [
    'Finishing','Off The Ball','Acceleration','Pace','Anticipation','Composure','First Touch',
    'Strength','Heading','Jumping Reach','Bravery','Teamwork','Dribbling','Crossing','Agility',
    'Passing','Vision','Decisions','Technique','Flair','Stamina','Work Rate','Positioning',
    'Tackling','Marking','Concentration','Handling','Reflexes','One On Ones',
    'Aerial Reach','Communication'
  ];
  const playerPositions = [
    ['GK Player','GK'],['Left Defender','D (L)'],['Right Defender','D (R)'],
    ['Centre Back 1','D (C)'],['Centre Back 2','D (C)'],
    ['Central Midfielder 1','M (C)'],['Central Midfielder 2','M (C)'],['Central Midfielder 3','M (C)'],
    ['Left Wing','AM (L)'],['Right Wing','AM (R)'],['Striker','ST (C)']
  ];
  const escapeCsv = (value: string) => /[,"]/.test(value) ? '"' + value.replaceAll('"','""') + '"' : value;
  return [
    ['Name','Position',...attributeHeaders].map(escapeCsv).join(','),
    ...[...playerPositions,...additional].map(([name,position]) =>
      [name,position,...attributeHeaders.map(()=>15)].map(value=>escapeCsv(String(value))).join(','))
  ].join('\n');
}


test('navigation opens a functional module directory', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Every decision/i })).toBeVisible();
  await page.keyboard.press('Control+k');
  await page.getByRole('dialog', { name: 'Quick navigation' }).getByRole('button', { name: /Football Systems/i }).click();
  await expect(page.getByRole('heading', { name: 'Football Systems' })).toBeVisible();
  await expect(page.getByText('27 / 27 modules')).toBeVisible();
  await page.getByPlaceholder('Search modules or ID…').fill('Player Intelligence');
  await expect(page.getByText('1 / 27 modules')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Player Intelligence & eCA' })).toBeVisible();
  await page.getByPlaceholder('Search modules or ID…').fill('MH-07');
  await expect(page.locator('.module-card')).toContainText('In development');
});

test('overview points first-time users to real player exports and local planning', async ({ page }) => {
  await page.goto('/#/overview');
  await expect(page.getByRole('heading', { name: 'Continue where you left off' })).toBeVisible();
  await expect(page.locator('.overview-resume__current')).toContainText('Nothing loaded');
  await expect(page.locator('.overview-resume__saved')).toContainText('No saved lists yet.');
  await expect(page.getByRole('heading', { name: 'What you can do today' })).toBeVisible();
  await page.locator('.hero').getByRole('button', { name: 'Import player list' }).click();
  await expect(page.getByRole('heading', { name: 'Player Lab' })).toBeVisible();

  await page.keyboard.press('Control+k');
  await page.getByRole('dialog', { name: 'Quick navigation' })
    .getByRole('button', { name: /Overview/ }).click();
  await page.getByRole('button', { name: 'Switch language to Vietnamese' }).click();
  await expect(page.getByRole('heading', { name: 'Tiếp tục công việc đang làm' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Bạn có thể làm gì ngay bây giờ' })).toBeVisible();
});

test('overview resumes saved exports after restart and confirms replacement of active work', async ({ page }) => {
  await page.goto('/#/players');
  await page.locator('input[type=file]').setInputFiles({
    name: 'resume-first.csv', mimeType: 'text/csv', buffer: Buffer.from(makeSquadExport())
  });
  await expect(page.getByRole('heading', { name: 'GK Player' })).toBeVisible();
  await page.getByRole('button', { name: 'Save on this browser' }).click();
  await expect(page.getByRole('button', { name: 'Saved to this browser' })).toBeDisabled();

  await page.keyboard.press('Control+k');
  await page.getByRole('dialog', { name: 'Quick navigation' })
    .getByRole('button', { name: /Overview/ }).click();
  await expect(page.locator('.overview-resume__current')).toContainText('resume-first.csv');
  await page.locator('.overview-resume__current').getByRole('button', { name: 'Continue in Squad Planner' }).click();
  await expect(page.getByRole('heading', { name: 'Squad Planner' })).toBeVisible();
  await expect(page.getByText('Starting eleven ready').first()).toBeVisible();

  await page.keyboard.press('Control+k');
  await page.getByRole('dialog', { name: 'Quick navigation' })
    .getByRole('button', { name: /Overview/ }).click();
  await page.reload();
  await expect(page.locator('.overview-resume__current')).toContainText('Nothing loaded');
  await expect(page.locator('.overview-resume__saved')).toContainText('resume-first.csv');
  await page.locator('.overview-resume__saved').getByRole('button', { name: 'Open in Squad Planner' }).click();
  await expect(page.getByRole('heading', { name: 'Squad Planner' })).toBeVisible();
  await expect(page.getByText('Starting eleven ready').first()).toBeVisible();

  await page.keyboard.press('Control+k');
  await page.getByRole('dialog', { name: 'Quick navigation' })
    .getByRole('button', { name: /Player Lab/ }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'resume-second.csv', mimeType: 'text/csv', buffer: Buffer.from(makeSquadExport([['Extra Defender','D (C)']]))
  });
  await expect(page.getByRole('heading', { name: 'GK Player' })).toBeVisible();
  await page.keyboard.press('Control+k');
  await page.getByRole('dialog', { name: 'Quick navigation' })
    .getByRole('button', { name: /Overview/ }).click();
  await expect(page.locator('.overview-resume__current')).toContainText('resume-second.csv');
  await page.locator('.overview-resume__saved').getByRole('button', { name: 'Open in Squad Planner' }).click();
  await expect(page.getByRole('group', { name: 'Replace current roster?' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator('.overview-resume__current')).toContainText('resume-second.csv');
  await page.locator('.overview-resume__saved').getByRole('button', { name: 'Open in Squad Planner' }).click();
  await page.getByRole('button', { name: 'Replace and open' }).click();
  await expect(page.getByRole('heading', { name: 'Squad Planner' })).toBeVisible();
  await page.keyboard.press('Control+k');
  await page.getByRole('dialog', { name: 'Quick navigation' })
    .getByRole('button', { name: /Overview/ }).click();
  await expect(page.locator('.overview-resume__current')).toContainText('resume-first.csv');
});

test('scouting shortlist saves, restores and exports only candidates from the active player list', async ({ page }) => {
  await page.goto('/#/players');
  await page.locator('input[type=file]').setInputFiles({
    name: 'shortlist.csv', mimeType: 'text/csv', buffer: Buffer.from(makeSquadExport())
  });
  await expect(page.getByRole('heading', { name: 'GK Player' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Scouting shortlist' })).toBeVisible();
  await page.getByRole('button', { name: 'Add selected player to shortlist' }).click();
  await page.getByRole('list', { name: 'Imported players' })
    .getByRole('button', { name: /Left Defender/ }).click();
  await page.getByRole('button', { name: 'Add selected player to shortlist' }).click();
  const shortlist = page.getByRole('region', { name: 'Scouting shortlist' });
  await expect(shortlist.locator('.scout-shortlist__candidates li')).toHaveCount(2);

  // In-session selections remain available across workspaces without auto-saving them.
  await page.keyboard.press('Control+k');
  await page.getByRole('dialog', { name: 'Quick navigation' })
    .getByRole('button', { name: /Squad Planner/ }).click();
  await expect(page.getByRole('heading', { name: 'Squad Planner' })).toBeVisible();
  await page.keyboard.press('Control+k');
  await page.getByRole('dialog', { name: 'Quick navigation' })
    .getByRole('button', { name: /Player Lab/ }).click();
  await expect(shortlist.locator('.scout-shortlist__candidates li')).toHaveCount(2);

  await page.getByRole('button', { name: 'Save shortlist locally' }).click();
  await expect(page.getByText('Shortlist saved on this browser for this exact player export.')).toBeVisible();
  await page.getByRole('button', { name: 'Save on this browser' }).click();
  await expect(page.getByRole('button', { name: 'Saved to this browser' })).toBeDisabled();

  await page.reload();
  await page.getByRole('list', { name: 'Saved exports' })
    .getByRole('button', { name: 'Open' }).click();
  await expect(page.getByRole('heading', { name: 'GK Player' })).toBeVisible();
  await page.getByRole('button', { name: 'Restore saved shortlist' }).click();
  await expect(page.getByText('Saved shortlist restored.')).toBeVisible();
  await expect(shortlist.locator('.scout-shortlist__candidates li')).toHaveCount(2);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export shortlist CSV' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('ManagerHub-shortlist-shortlist.csv');
  const stream = await download.createReadStream();
  let csv = '';
  for await (const chunk of stream) csv += String(chunk);
  expect(csv).toContain('"GK Player"');
  expect(csv).toContain('"Left Defender"');
  expect(csv).not.toContain('"Striker"');
  expect(csv).toContain('not verified CA/PA, transfer value');

  await page.locator('input[type=file]').setInputFiles({
    name: 'different-scout-career.csv', mimeType: 'text/csv',
    buffer: Buffer.from(makeSquadExport([['Extra Defender', 'D (C)']]))
  });
  await expect(page.getByRole('heading', { name: 'GK Player' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Scouting shortlist' })
    .locator('.scout-shortlist__candidates li')).toHaveCount(0);
  await page.getByRole('button', { name: 'Restore saved shortlist' }).click();
  await expect(page.getByText('No saved shortlist exists for this player export.')).toBeVisible();

  await page.getByRole('button', { name: 'Switch language to Vietnamese' }).click();
  await expect(page.getByRole('region', { name: 'Danh sách theo dõi tuyển trạch' })).toBeVisible();
});

test('shortlist compares role fit on a shared axis and preserves unknown inputs', async ({ page }) => {
  const csv = [
    'Name,Position,Finishing,Off The Ball,Acceleration,Pace,Anticipation,Composure,First Touch',
    'High Striker,ST (C),19,19,19,19,19,19,19',
    'Low Striker,ST (C),5,5,5,5,5,5,5',
    'Partial Striker,ST (C),19,,,,,,'
  ].join('\n');
  await page.goto('/#/players');
  await page.locator('input[type=file]').setInputFiles({
    name: 'role-shortlist.csv', mimeType: 'text/csv', buffer: Buffer.from(csv)
  });
  await expect(page.getByRole('heading', { name: 'High Striker' })).toBeVisible();
  const shortlist = page.getByRole('region', { name: 'Scouting shortlist' });
  await shortlist.getByRole('button', { name: 'Add selected player to shortlist' }).click();
  for (const name of ['Low Striker', 'Partial Striker']) {
    await page.getByRole('list', { name: 'Imported players' }).getByRole('button', { name: new RegExp(name) }).click();
    await shortlist.getByRole('button', { name: 'Add selected player to shortlist' }).click();
  }

  const table = shortlist.getByRole('table', { name: 'Candidate role-fit ranking' });
  await expect(table.locator('tbody tr')).toHaveCount(3);
  await expect(table.locator('tbody tr').first()).toContainText('High Striker');
  await expect(table.locator('tbody tr').first()).toContainText('95/100');
  await expect(table.locator('tbody tr').nth(1)).toContainText('Low Striker');
  await expect(table.locator('tbody tr').nth(2)).toContainText('Partial Striker');
  await expect(table.locator('tbody tr').nth(2)).toContainText('Insufficient data');
  await expect(table.locator('tbody tr').nth(2)).toContainText('20%');
  await table.locator('tbody tr').nth(2).getByText('Inspect role inputs').click();
  await expect(table.locator('tbody tr').nth(2)).toContainText('Off The Ball');

  await shortlist.getByLabel('Compare for role').selectOption('goalkeeper');
  await expect(table.locator('tbody tr').first()).toContainText('Insufficient data');
  await expect(table.locator('tbody tr').nth(1)).toContainText('Insufficient data');
  await shortlist.getByLabel('Compare for role').selectOption('advanced-forward');
  await expect(table.locator('tbody tr').first()).toContainText('High Striker');

  await page.getByRole('button', { name: 'Switch language to Vietnamese' }).click();
  await expect(page.getByRole('table', { name: 'Xếp hạng mức phù hợp vai trò của ứng viên' })).toBeVisible();
  await expect(page.getByText('So sánh ứng viên theo vai trò')).toBeVisible();
});

test('shortlist compares with a source-bound reference outside the shortlist and suppresses unknown deltas', async ({ page }) => {
  const csv = [
    'Name,Position,Finishing,Off The Ball,Acceleration,Pace,Anticipation,Composure,First Touch',
    'Candidate A,ST (C),19,19,19,19,19,19,19',
    'Candidate B,ST (C),19,,,,,,',
    'Incumbent,ST (C),5,5,5,5,5,5,5'
  ].join('\n');
  await page.goto('/#/players');
  await page.locator('input[type=file]').setInputFiles({
    name: 'reference-role.csv', mimeType: 'text/csv', buffer: Buffer.from(csv)
  });
  const players = page.getByRole('list', { name: 'Imported players' });
  const shortlist = page.getByRole('region', { name: 'Scouting shortlist' });
  await shortlist.getByRole('button', { name: 'Add selected player to shortlist' }).click();
  await players.getByRole('button', { name: /Candidate B/ }).click();
  await shortlist.getByRole('button', { name: 'Add selected player to shortlist' }).click();
  await players.getByRole('button', { name: /Incumbent/ }).click();
  await shortlist.getByRole('button', { name: 'Use viewed player as reference' }).click();

  const comparison = shortlist.getByRole('table', { name: 'Candidate role-fit ranking' });
  await expect(shortlist.locator('.scout-role-compare__reference-details')).toContainText('Incumbent');
  await expect(shortlist.locator('.scout-role-compare__reference-details')).toContainText('21/100');
  await expect(comparison.locator('tbody tr').first()).toContainText('+74 pts');
  await expect(comparison.locator('tbody tr').nth(1)).toContainText('Insufficient data');
  await shortlist.getByText('Inspect reference inputs').click();
  await expect(shortlist.locator('.scout-role-compare__reference-details')).toContainText('Finishing');

  await shortlist.getByLabel('Compare for role').selectOption('goalkeeper');
  await expect(shortlist.locator('.scout-role-compare__reference-details')).toContainText('Insufficient data');
  await expect(comparison.locator('tbody tr').first()).toContainText('Insufficient data');
  await shortlist.getByLabel('Compare for role').selectOption('advanced-forward');
  await shortlist.getByRole('button', { name: 'Clear reference player' }).click();
  await expect(comparison.locator('tbody tr').first()).not.toContainText('+74 pts');

  await shortlist.getByRole('button', { name: 'Use viewed player as reference' }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'second-reference-role.csv', mimeType: 'text/csv', buffer: Buffer.from(csv.replace('Incumbent', 'New Player'))
  });
  await expect(shortlist.locator('.scout-role-compare__reference-details')).toHaveCount(0);
  await expect(shortlist.locator('.scout-shortlist__candidates li')).toHaveCount(0);

  await page.getByRole('button', { name: 'Switch language to Vietnamese' }).click();
  await expect(page.getByRole('region', { name: 'Danh sách theo dõi tuyển trạch' })).toBeVisible();
});

test('shortlist evaluates an outside candidate against an observed club-group XI and resets with the source', async ({ page }) => {
  const rows = makeSquadExport().split('\n');
  const originalStriker = rows.find(row => row.startsWith('Striker,'));
  expect(originalStriker).toBeTruthy();
  const csv = [
    `${rows[0]},Club`,
    ...rows.slice(1).map(row => `${row},Home Club`),
    `${originalStriker!.replace('Striker,', 'Target Striker,').replaceAll(',15', ',20')},Away Club`
  ].join('\n');
  await page.goto('/#/players');
  await page.locator('input[type=file]').setInputFiles({
    name: 'club-scenario.csv', mimeType: 'text/csv', buffer: Buffer.from(csv)
  });
  await page.getByRole('textbox', { name: 'Search imported players' }).fill('Target Striker');
  const players = page.getByRole('list', { name: 'Imported players' });
  await players.getByRole('button', { name: /Target Striker/ }).click();
  const shortlist = page.getByRole('region', { name: 'Scouting shortlist' });
  await shortlist.getByRole('button', { name: 'Add selected player to shortlist' }).click();
  const scenario = page.getByRole('region', { name: 'Club-group recruitment scenario' });
  await scenario.getByLabel('Observed club group').selectOption('Home Club');
  const slotComparison = scenario.getByRole('region', { name: 'Shortlist comparison by squad slot' });
  const slotTable = slotComparison.getByRole('table', { name: 'Candidate role-fit ranking' });
  await expect(slotComparison).toContainText('Observed incumbent');
  await expect(slotComparison).toContainText('Striker');
  await expect(slotComparison.getByRole('region', { name: 'Best replacement XI' }))
    .toContainText('Without this player, the current export cannot fill all eleven positions');
  await expect(slotTable.locator('tbody tr')).toHaveCount(1);
  await expect(slotTable.locator('tbody tr').first()).toContainText('Target Striker');
  await expect(slotTable.locator('tbody tr').first()).toContainText('+');
  await slotTable.getByText('Inspect role inputs').click();
  await expect(slotTable).toContainText('Finishing');
  await slotTable.getByRole('button', { name: 'Try in XI' }).click();
  await expect(scenario.getByLabel('Shortlisted candidate')).toHaveValue(/.+/);
  const outsideTrial = slotComparison.getByRole('region', { name: 'Try in XI · Without this player' });
  await expect(outsideTrial).toContainText('Adding this candidate makes a complete best-fit XI possible');
  await expect(outsideTrial).not.toContainText('Role-fit difference');
  await expect(scenario).toContainText('The candidate enters the hypothetical best-fit XI.');
  await expect(scenario).toContainText('Previous player in this slot: Striker');
  await expect(scenario).toContainText('XI average before');
  await expect(scenario).toContainText('Changed positions');

  await slotComparison.getByLabel('Selected position:').selectOption('lb');
  await expect(outsideTrial).toHaveCount(0);
  await expect(slotTable).toContainText('Declared position is ineligible');
  await expect(slotTable.getByRole('button', { name: 'Try in XI' })).toBeDisabled();
  await slotComparison.getByLabel('Selected position:').selectOption('lcm');

  await scenario.getByLabel('Formation to test').selectOption('4-2-3-1');
  await expect(slotComparison.getByLabel('Selected position:')).toHaveValue('gk');
  await expect(scenario).toContainText('The observed club group plus this candidate cannot form a complete eligible XI');
  await slotComparison.getByLabel('Selected position:').selectOption('st');
  await expect(slotComparison).toContainText('No complete observed XI for this formation');
  await expect(outsideTrial).toHaveCount(0);
  await page.getByRole('button', { name: 'Switch language to Vietnamese' }).click();
  await expect(page.getByRole('region', { name: 'Mô phỏng tuyển trạch theo nhóm CLB' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'So sánh danh sách tuyển trạch theo vị trí đội hình' })).toBeVisible();

  await page.locator('input[type=file]').setInputFiles({
    name: 'new-club-scenario.csv', mimeType: 'text/csv', buffer: Buffer.from(makeSquadExport())
  });
  await expect(page.getByRole('region', { name: 'Mô phỏng tuyển trạch theo nhóm CLB' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Danh sách theo dõi tuyển trạch' })
    .locator('.scout-shortlist__candidates li')).toHaveCount(0);
});

test('shortlist exposes internal XI depth and recomputes other positions on absence', async ({ page }) => {
  const rows = makeSquadExport([['Bench Striker','ST (C)']]).split('\n');
  const originalStriker = rows.find(row => row.startsWith('Striker,'));
  expect(originalStriker).toBeTruthy();
  const csv = [
    `${rows[0]},Club`,
    ...rows.slice(1).map(row => `${row.startsWith('Bench Striker,') ? row.replaceAll(',15', ',1') : row},Home Club`),
    `${originalStriker!.replace('Striker,', 'Target Striker,').replaceAll(',15', ',20')},Away Club`
  ].join('\n');
  await page.goto('/#/players');
  await page.locator('input[type=file]').setInputFiles({
    name: 'internal-depth.csv', mimeType: 'text/csv', buffer: Buffer.from(csv)
  });
  await page.getByRole('textbox', { name: 'Search imported players' }).fill('Target Striker');
  await page.getByRole('list', { name: 'Imported players' }).getByRole('button', { name: /Target Striker/ }).click();
  await page.getByRole('region', { name: 'Scouting shortlist' })
    .getByRole('button', { name: 'Add selected player to shortlist' }).click();

  const scenario = page.getByRole('region', { name: 'Club-group recruitment scenario' });
  await scenario.getByLabel('Observed club group').selectOption('Home Club');
  const comparison = scenario.getByRole('region', { name: 'Shortlist comparison by squad slot' });
  const depth = comparison.getByRole('region', { name: 'Best replacement XI' });
  await expect(depth).toContainText('When this player is excluded: Striker');
  await expect(depth).toContainText('Selected position: ST · Bench Striker');
  await expect(depth).toContainText('Role-fit difference');
  await expect(depth).toContainText('Changed positions: 1');

  await comparison.getByRole('table', { name: 'Candidate role-fit ranking' })
    .getByRole('button', { name: 'Try in XI' }).click();
  const outsideTrial = comparison.getByRole('region', { name: 'Try in XI · Without this player' });
  await expect(outsideTrial).toContainText('Target Striker · ST');
  await expect(outsideTrial).toContainText('Role-fit difference: +');
  await expect(outsideTrial).toContainText('Changed positions: 1');

  await comparison.getByLabel('Selected position:').selectOption('lb');
  await expect(depth).toContainText('Without this player, the current export cannot fill all eleven positions');
  await expect(outsideTrial).toHaveCount(0);
  await scenario.getByLabel('Formation to test').selectOption('4-2-3-1');
  await expect(depth).toHaveCount(0);

  await scenario.getByLabel('Formation to test').selectOption('4-3-3');
  await comparison.getByLabel('Selected position:').selectOption('st');
  await page.getByRole('button', { name: 'Switch language to Vietnamese' }).click();
  await expect(page.getByRole('region', { name: 'Đội hình thay thế tốt nhất' }))
    .toContainText('Khi loại cầu thủ này');
  await expect(page.getByRole('region', { name: 'Thử trong XI · Không có cầu thủ này' }))
    .toContainText('Chênh lệch điểm hợp vai trò');
  await page.locator('input[type=file]').setInputFiles({
    name: 'new-internal-depth.csv', mimeType: 'text/csv', buffer: Buffer.from(makeSquadExport())
  });
  await expect(page.getByRole('region', { name: 'Đội hình thay thế tốt nhất' })).toHaveCount(0);
});

test('inspects AFE header locally and never claims full save support', async ({ page }) => {
  await page.goto('/#/saves');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'career.fm',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from([2, 1, 97, 102, 101, 46, 5, 0, 0, 0])
  });
  await expect(page.getByText('Family signature detected')).toBeVisible();
  await expect(page.getByText('Reader compatibility')).toBeVisible();
  await expect(page.getByText('Edition/build not identified')).toBeVisible();
  const coverage = page.locator('.save-coverage');
  await coverage.locator('summary').click();
  await expect(coverage.getByText('Player identity')).toBeVisible();
  await expect(coverage.getByText('Not decoded').first()).toBeVisible();
  await expect(page.getByText(/A container signature is recognized/)).toBeVisible();
  await page.getByText('Technical details').click();
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
    // Keep the synthetic member extent within directoryOffset - 18, matching the observed layout.
    Buffer.alloc(140, 0),
    Buffer.from([2, 1, 102, 109, 102, 46, 4, 0, 0]),
    deflateSync(Buffer.from(index))
  ]);
  await page.goto('/#/saves');
  await page.locator('input[type="file"]').setInputFiles({ name: 'synthetic.fm', mimeType: 'application/octet-stream', buffer: file });
  await expect(page.getByText('Internal archive index')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Internal save archive members' }).getByText('game_info.dat')).toBeVisible();
  await page.getByText('Technical details').click();
  await expect(page.getByText(/member contents and game records are NOT decoded/i)).toBeVisible();
  // Only vetted catalogue metadata persists; sampled header bytes remain ephemeral.
  await page.getByRole('button', { name: 'Save inspection metadata on this browser' }).click();
  await expect(page.getByRole('button', { name: 'Remove saved metadata' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('list', { name: 'Internal save archive members' }).getByText('game_info.dat')).toBeVisible();
  await expect(page.getByText('Member header diagnostics')).toHaveCount(0);
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
  await expect(page.getByText('Visible attributes only · Not CA')).toBeVisible();
  await expect(page.getByText('Not verified').first()).toBeVisible();
  await page.getByRole('tab',{name:'Role fit'}).click();
  await expect(page.getByText('Deep-Lying Playmaker')).toBeVisible();
  await page.getByRole('tab',{name:'Compare'}).click();
  await expect(page.getByText('Head-to-head analysis')).toBeVisible();
  await expect(page.getByRole('table',{name:'Role fit comparisons'})).toBeVisible();
  await page.getByRole('tab',{name:'Recruitment'}).click();
  await expect(page.getByRole('heading',{name:'Squad contribution preview'})).toBeVisible();
  await expect(page.getByLabel('Formation to test')).toHaveValue('4-3-3');
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
  await expect(page.getByText('No recognized, exact 1–20 attributes')).toHaveCount(0); // overview uses an explicit missing-data summary
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
  await expect(page.getByText('Passing', { exact: true }).first()).toBeVisible();
  await page.getByLabel('Attribute group', { exact: true }).selectOption('Mental');
  await expect(page.getByText('Vision', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Visible attributes only · Not CA')).toBeVisible();
});


test('locally saved player exports survive reload and can be explicitly deleted', async ({ page }) => {
  await page.goto('/#/players');
  await page.locator('input[type=file]').setInputFiles({
    name: 'persistent-squad.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('Name,Position,Passing,Vision,Decisions\nPreserved Prospect,CM,18,17,15')
  });
  await expect(page.getByRole('heading', { name: 'Preserved Prospect' })).toBeVisible();
  await page.getByRole('button', { name: 'Save on this browser' }).click();
  await expect(page.getByRole('button', { name: 'Saved to this browser' })).toBeDisabled();
  await expect(page.getByRole('list', { name: 'Saved exports' }).getByRole('listitem')).toHaveCount(1);

  await page.reload();
  await expect(page.getByText('No saved exports yet')).toHaveCount(0);
  await page.getByRole('list', { name: 'Saved exports' }).getByRole('button', { name: 'Open' }).click();
  await expect(page.getByRole('heading', { name: 'Preserved Prospect' })).toBeVisible();
  await expect(page.getByText('Visible attributes only · Not CA')).toBeVisible();

  await page.getByRole('list', { name: 'Saved exports' }).getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Confirm delete' }).click();
  await expect(page.getByText('No saved exports yet')).toBeVisible();
  await page.reload();
  await expect(page.getByText('No saved exports yet')).toBeVisible();
});

test('large exported squads render a bounded, accessible player list', async ({ page }) => {
  const rows = ['Name,Position,Passing,Decisions'];
  for (let i = 1; i <= 115; i++) rows.push('Player '+i+',CM,15,13');
  await page.goto('/#/players');
  await page.locator('input[type=file]').setInputFiles({
    name: 'large-squad.csv', mimeType: 'text/csv', buffer: Buffer.from(rows.join('\n'))
  });
  await expect(page.getByText('115 player records')).toBeVisible();
  const list = page.getByRole('list', { name: 'Imported players' });
  await expect.poll(() => list.getByRole('listitem').count()).toBeLessThanOrEqual(16);
  await list.evaluate(element => { element.scrollTop = element.scrollHeight; });
  await expect(list.getByRole('button', { name: /Player 99/ })).toBeVisible();
  await page.getByRole('button', { name: /Show next 100/ }).click();
  const viewportWidth = page.viewportSize()?.width ?? 1280;
  await expect.poll(() => list.getByRole('listitem').count())
    .toBeLessThanOrEqual(viewportWidth <= 760 ? 16 : 22);
  await page.getByPlaceholder('Search player, team, position…').fill('Player 115');
  await expect(list.getByRole('listitem')).toHaveCount(1);
  await expect(page.getByText('1 shown')).toBeVisible();
});


test('builds a unique eleven for an eligible export and explains infeasible formations', async ({ page }) => {
  const content = makeSquadExport();
  await page.goto('/#/players');
  await page.locator('input[type=file]').setInputFiles({
    name:'registered-export.csv',mimeType:'text/csv',buffer:Buffer.from(content)
  });
  await page.keyboard.press('Control+k');
  await page.getByRole('dialog', {name:'Quick navigation'}).getByRole('button', {name:/Squad Planner/}).click();
  await expect(page.getByRole('heading', {name:'Squad Planner'})).toBeVisible();
  await expect(page.getByText('Starting eleven ready').first()).toBeVisible();
  const lineup=page.getByRole('list', {name:'Assigned starting eleven'});
  await expect(lineup.getByRole('listitem')).toHaveCount(11);
  await expect(page.getByText('One player per slot')).toBeVisible();

  await page.getByLabel('Formation').selectOption('4-2-3-1');
  await expect(page.getByText('Starting eleven incomplete', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('This player list cannot fill all eleven positions yet.')).toBeVisible();
  await expect(lineup).toHaveCount(0);
});


test('Plan A/B supports versatile player pins, exclusions and honest comparisons', async ({ page }) => {
  await page.goto('/#/players');
  await page.locator('input[type=file]').setInputFiles({
    name:'squad-scenarios.csv',mimeType:'text/csv',
    buffer:Buffer.from(makeSquadExport([['Bench Versatile','D (R), AM (R)']]))
  });
  await page.keyboard.press('Control+k');
  await page.getByRole('dialog',{name:'Quick navigation'})
    .getByRole('button',{name:/Squad Planner/}).click();
  await expect(page.getByText('Starting eleven ready').first()).toBeVisible();

  await page.getByRole('group',{name:'Squad scenarios'})
    .getByRole('button',{name:'Plan B',exact:true}).click();
  await page.getByRole('combobox',{name:'Lock RB'}).selectOption('export-row-12');
  const lineup=page.getByRole('list',{name:'Assigned starting eleven'});
  await expect(lineup).toContainText('Bench Versatile');
  await expect(lineup.getByRole('listitem')).toHaveCount(11);
  await expect(page.getByText('New players in B')).toBeVisible();

  // A versatile player cannot be pinned to both RB and RW.
  await page.getByRole('combobox',{name:'Lock RW'}).selectOption('export-row-12');
  await expect(page.getByText('Starting eleven incomplete', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/same player to more than one position/)).toBeVisible();
  await page.getByRole('combobox',{name:'Lock RW'}).selectOption('');
  await expect(page.getByText('Starting eleven ready').first()).toBeVisible();

  // Exclusion of a pinned player is a hard conflict, never a silent substitution.
  await page.getByRole('group',{name:'Exclude players'})
    .getByRole('checkbox',{name:/Bench Versatile/}).check();
  await expect(page.getByText(/cannot exclude a player while keeping them in the starting lineup/)).toBeVisible();
  await page.getByRole('button',{name:'Clear all constraints'}).click();
  await expect(page.getByText('Starting eleven ready').first()).toBeVisible();

  // Explicit scenario copy restores a comparable unmodified XI.
  await page.getByRole('button',{name:'Copy Plan A to Plan B'}).click();
  await expect(page.getByText('Position assignments changed')).toBeVisible();
  await page.getByLabel('Formation').selectOption('4-2-3-1');
  await expect(page.getByText('Starting eleven incomplete', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Not directly comparable')).toBeVisible();

  await page.getByRole('button',{name:'Switch language to Vietnamese'}).click();
  await expect(page.getByRole('button',{name:'Sao chép phương án A sang phương án B'})).toBeVisible();
  await expect(page.getByLabel('Sơ đồ chiến thuật')).toBeVisible();
  await expect(page.getByText('Đội hình xuất phát chưa đủ 11 người',{exact:true}).first()).toBeVisible();
});


test('saves Plan A/B per export, restores after reload, rejects another career and forgets explicitly', async ({ page }) => {
  await page.goto('/#/players');
  await page.locator('input[type=file]').setInputFiles({
    name: 'persisted-squad.csv', mimeType: 'text/csv',
    buffer: Buffer.from(makeSquadExport([['Bench Versatile', 'D (R), AM (R)']]))
  });
  await expect(page.getByRole('heading', { name: 'GK Player' })).toBeVisible();
  await page.getByRole('button', { name: 'Save on this browser' }).click();
  await expect(page.getByRole('button', { name: 'Saved to this browser' })).toBeDisabled();
  await page.keyboard.press('Control+k');
  await page.getByRole('dialog', { name: 'Quick navigation' })
    .getByRole('button', { name: /Squad Planner/ }).click();
  await page.getByRole('button', { name: 'Plan B', exact: true }).click();
  await page.getByRole('combobox', { name: 'Lock RB' }).selectOption('export-row-12');
  await page.getByRole('button', { name: 'Save plans locally' }).click();
  await expect(page.getByText('Plans A and B saved for this exact player export on this browser.')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Squad Planner' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Saved player list' }).selectOption({ label: 'persisted-squad.csv (12 players)' });
  await page.getByRole('button', { name: 'Open saved list' }).click();
  await page.getByRole('button', { name: 'Restore saved plans' }).click();
  await expect(page.getByRole('button', { name: 'Plan B', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('combobox', { name: 'Lock RB' })).toHaveValue('export-row-12');

  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export both plans as CSV' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('ManagerHub-persisted-squad-plans.csv');
  const reportStream = await download.createReadStream();
  let csvText = '';
  for await (const chunk of reportStream) csvText += String(chunk);
  expect(csvText).toContain('"B","4-3-3"');
  expect(csvText).toContain('Bench Versatile');
  expect(csvText).toContain('Not CA/PA or predicted match performance');

  await page.getByRole('button', { name: 'Forget saved plans' }).click();
  await page.getByRole('button', { name: 'Confirm forget plans' }).click();
  await expect(page.getByText('Saved plans for this player export were removed. Current session plans remain unchanged.')).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Lock RB' })).toHaveValue('export-row-12');
  await page.getByRole('button', { name: 'Restore saved plans' }).click();
  await expect(page.getByText('No saved plans found for this exact player export.')).toBeVisible();

  await page.keyboard.press('Control+k');
  await page.getByRole('dialog', { name: 'Quick navigation' })
    .getByRole('button', { name: /Player Lab/ }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'different-career.csv', mimeType: 'text/csv', buffer: Buffer.from(makeSquadExport())
  });
  await page.keyboard.press('Control+k');
  await page.getByRole('dialog', { name: 'Quick navigation' })
    .getByRole('button', { name: /Squad Planner/ }).click();
  await page.getByRole('button', { name: 'Restore saved plans' }).click();
  await expect(page.getByText('No saved plans found for this exact player export.')).toBeVisible();
});

test('Tactical Lab preserves independent A/B and phase positions, and restores source-bound scenarios', async ({ page }) => {
  await page.goto('/#/players');
  await page.locator('input[type=file]').setInputFiles({
    name: 'tactical-source.csv', mimeType: 'text/csv', buffer: Buffer.from(makeSquadExport())
  });
  await page.getByRole('button', { name: 'Save on this browser' }).click();
  await page.keyboard.press('Control+k');
  await page.getByRole('dialog', { name: 'Quick navigation' })
    .getByRole('button', { name: /Squad Planner/ }).click();

  const lab = page.getByRole('region', { name: 'Tactical Lab' });
  const rightWinger = lab.locator('[data-slot="rw"]');
  await expect(rightWinger).toHaveAttribute('data-x', '18');
  await rightWinger.focus();
  await rightWinger.press('ArrowLeft');
  await expect(rightWinger).toHaveAttribute('data-x', '17');
  const pitch = lab.getByRole('group', { name: 'Editable tactical pitch' });
  const pitchBox = await pitch.boundingBox();
  expect(pitchBox).not.toBeNull();
  await rightWinger.hover();
  await page.mouse.down();
  await page.mouse.move(pitchBox!.x + pitchBox!.width / 2, pitchBox!.y + pitchBox!.height * 0.45, { steps: 8 });
  await page.mouse.up();
  await expect(rightWinger).toHaveAttribute('data-x', '10');
  await expect(rightWinger).toHaveAttribute('data-y', '9');
  await lab.getByRole('button', { name: 'Reset tactical plan' }).click();
  await rightWinger.focus();
  await rightWinger.press('ArrowLeft');
  await lab.getByRole('button', { name: 'Defending' }).click();
  await expect(rightWinger).toHaveAttribute('data-x', '18');
  await rightWinger.focus();
  await rightWinger.press('ArrowUp');
  await expect(rightWinger).toHaveAttribute('data-y', '3');
  await lab.getByRole('button', { name: 'In possession' }).click();
  await expect(rightWinger).toHaveAttribute('data-x', '17');
  await lab.getByLabel('Attacking width').selectOption('wide');

  await page.getByRole('button', { name: 'Plan B', exact: true }).click();
  await expect(rightWinger).toHaveAttribute('data-x', '18');
  await lab.getByLabel('Attacking width').selectOption('narrow');
  await lab.getByRole('button', { name: 'Save tactical scenarios' }).click();
  await expect(lab.getByText('Tactical scenarios A and B saved on this browser.')).toBeVisible();

  await page.getByRole('button', { name: 'Plan A', exact: true }).click();
  await expect(rightWinger).toHaveAttribute('data-x', '17');
  await lab.getByRole('button', { name: 'Reset tactical plan' }).click();
  await expect(rightWinger).toHaveAttribute('data-x', '18');
  await lab.getByRole('button', { name: 'Restore tactical scenarios' }).click();
  await expect(rightWinger).toHaveAttribute('data-x', '17');
  await expect(lab.getByLabel('Attacking width')).toHaveValue('wide');
  await page.getByLabel('Formation').selectOption('4-2-3-1');
  await page.getByLabel('Formation').selectOption('4-3-3');
  await expect(rightWinger).toHaveAttribute('data-x', '18');

  await page.reload();
  await page.getByRole('combobox', { name: 'Saved player list' })
    .selectOption({ label: 'tactical-source.csv (11 players)' });
  await page.getByRole('button', { name: 'Open saved list' }).click();
  await lab.getByRole('button', { name: 'Restore tactical scenarios' }).click();
  await expect(rightWinger).toHaveAttribute('data-x', '17');
  await page.getByRole('button', { name: 'Plan B', exact: true }).click();
  await expect(lab.getByLabel('Attacking width')).toHaveValue('narrow');
  await page.getByRole('button', { name: 'Switch language to Vietnamese' }).click();
  const localizedLab = page.getByRole('region', { name: 'Phòng phân tích chiến thuật' });
  await expect(localizedLab).toBeVisible();
  await localizedLab.getByRole('button', { name: 'Xóa phương án chiến thuật đã lưu' }).click();
  await localizedLab.getByRole('button', { name: 'Xác nhận xóa chiến thuật' }).click();
  await localizedLab.getByRole('button', { name: 'Khôi phục phương án chiến thuật' }).click();
  await expect(localizedLab.getByText('Chưa có phương án chiến thuật được lưu cho dữ liệu này.')).toBeVisible();
});

test('Tactical diagnostics react to scenario edits, plan switching and Vietnamese localization', async ({ page }) => {
  await page.goto('/#/players');
  await page.locator('input[type=file]').setInputFiles({
    name: 'diagnostics.csv', mimeType: 'text/csv', buffer: Buffer.from(makeSquadExport())
  });
  await page.keyboard.press('Control+k');
  await page.getByRole('dialog', { name: 'Quick navigation' })
    .getByRole('button', { name: /Squad Planner/ }).click();

  const lab = page.getByRole('region', { name: 'Tactical Lab' });
  const diagnostics = lab.getByRole('region', { name: 'Tactical diagnostics' });
  await expect(diagnostics.getByText('No shape risks detected by these rules')).toBeVisible();
  await lab.getByRole('button', { name: 'Defending' }).click();
  await lab.getByLabel('Proposed defensive line').selectOption('high');
  await lab.getByLabel('Proposed pressing').selectOption('low');
  await expect(diagnostics.getByText('High line with low pressing')).toBeVisible();
  await expect(diagnostics.getByText('Review pressure on the ball, or consider a lower defensive line.')).toBeVisible();
  await page.getByRole('button', { name: 'Plan B', exact: true }).click();
  await expect(diagnostics.getByText('No shape risks detected by these rules')).toBeVisible();
  await page.getByRole('button', { name: 'Plan A', exact: true }).click();
  await expect(diagnostics.getByText('High line with low pressing')).toBeVisible();
  await page.getByRole('button', { name: 'Switch language to Vietnamese' }).click();
  await expect(page.getByRole('region', { name: 'Chẩn đoán chiến thuật' })
    .getByText('Hàng thủ dâng cao nhưng gây áp lực thấp')).toBeVisible();
  await page.getByRole('region', { name: 'Phòng phân tích chiến thuật' })
    .getByLabel('Cường độ gây áp lực dự kiến').selectOption('balanced');
  await expect(page.getByRole('region', { name: 'Chẩn đoán chiến thuật' })
    .getByText('Các quy tắc hiện tại chưa phát hiện nguy cơ về bố trí')).toBeVisible();
});

test('Tactical diagnostics allow explicit correction and undo without changing Plan B', async ({ page }) => {
  await page.goto('/#/players');
  await page.locator('input[type=file]').setInputFiles({
    name: 'guided-adjustments.csv', mimeType: 'text/csv', buffer: Buffer.from(makeSquadExport())
  });
  await page.keyboard.press('Control+k');
  await page.getByRole('dialog', { name: 'Quick navigation' })
    .getByRole('button', { name: /Squad Planner/ }).click();
  const lab = page.getByRole('region', { name: 'Tactical Lab' });
  const diagnostics = lab.getByRole('region', { name: 'Tactical diagnostics' });
  await lab.getByRole('button', { name: 'Defending' }).click();
  await lab.getByLabel('Proposed defensive line').selectOption('high');
  await lab.getByLabel('Proposed pressing').selectOption('low');
  await expect(diagnostics.getByText('High line with low pressing')).toBeVisible();
  await diagnostics.getByRole('button', { name: /Apply suggested adjustment to High line with low pressing/ }).click();
  await expect(lab.getByLabel('Proposed defensive line')).toHaveValue('balanced');
  await expect(diagnostics.getByText('No shape risks detected by these rules')).toBeVisible();
  await diagnostics.getByRole('button', { name: 'Undo last tactical adjustment' }).click();
  await expect(lab.getByLabel('Proposed defensive line')).toHaveValue('high');
  await expect(diagnostics.getByText('High line with low pressing')).toBeVisible();
  await expect(diagnostics.getByRole('button', { name: 'Undo last tactical adjustment' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Plan B', exact: true }).click();
  await expect(lab.getByLabel('Proposed defensive line')).toHaveValue('balanced');
  await expect(diagnostics.getByText('No shape risks detected by these rules')).toBeVisible();
  await page.getByRole('button', { name: 'Plan A', exact: true }).click();
  await expect(diagnostics.getByText('High line with low pressing')).toBeVisible();
  await page.getByRole('button', { name: 'Switch language to Vietnamese' }).click();
  const localized = page.getByRole('region', { name: 'Chẩn đoán chiến thuật' });
  await expect(localized.getByRole('button', { name: /Áp dụng điều chỉnh cho/ })).toBeVisible();
  await localized.getByRole('button', { name: /Áp dụng điều chỉnh cho/ }).click();
  await expect(localized.getByRole('button', { name: 'Hoàn tác điều chỉnh chiến thuật vừa áp dụng' })).toBeVisible();
  await page.getByRole('region', { name: 'Phòng phân tích chiến thuật' }).getByLabel('Cường độ gây áp lực dự kiến').selectOption('high');
  await expect(localized.getByRole('button', { name: 'Hoàn tác điều chỉnh chiến thuật vừa áp dụng' })).toHaveCount(0);
});

test('Tactical report exports the active edited scenario and localized action without changing the plan', async ({ page }) => {
  await page.goto('/#/players');
  await page.locator('input[type=file]').setInputFiles({
    name: 'tactical-report.csv', mimeType: 'text/csv', buffer: Buffer.from(makeSquadExport())
  });
  await page.keyboard.press('Control+k');
  await page.getByRole('dialog', { name: 'Quick navigation' })
    .getByRole('button', { name: /Squad Planner/ }).click();
  const lab = page.getByRole('region', { name: 'Tactical Lab' });
  await lab.getByRole('button', { name: 'Defending' }).click();
  await lab.getByLabel('Proposed defensive line').selectOption('high');
  await lab.getByLabel('Proposed pressing').selectOption('low');
  const downloadPromise = page.waitForEvent('download');
  await lab.getByRole('button', { name: 'Export tactical plan as CSV' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('ManagerHub-tactical-report-tactical-A.csv');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const exported = Buffer.concat(chunks).toString('utf8');
  expect(exported).toContain('High line with low pressing');
  expect(exported).toContain('defensiveLine=high');
  expect(exported).toContain('not native FM2013 tactics');
  await expect(lab.getByLabel('Proposed defensive line')).toHaveValue('high');
  await page.getByRole('button', { name: 'Switch language to Vietnamese' }).click();
  await expect(page.getByRole('region', { name: 'Phòng phân tích chiến thuật' })
    .getByRole('button', { name: 'Xuất báo cáo chiến thuật CSV' })).toBeVisible();
});

test('MH-09 role interactions respond to selected XI positions and VI translation', async ({ page }) => {
  await page.goto('/#/players');
  await page.locator('input[type=file]').setInputFiles({
    name: 'role-interactions.csv', mimeType: 'text/csv', buffer: Buffer.from(makeSquadExport())
  });
  await page.getByRole('button', { name: 'Save on this browser' }).click();
  await page.keyboard.press('Control+k');
  await page.getByRole('dialog', { name: 'Quick navigation' })
    .getByRole('button', { name: /Squad Planner/ }).click();
  const lab = page.getByRole('region', { name: 'Tactical Lab' });
  const report = lab.getByRole('region', { name: 'Role partnerships' });
  await expect(report.getByText('No role interaction findings under these bounded rules')).toBeVisible();
  await lab.getByLabel('Select tactical position').selectOption('lb');
  const leftBack = lab.locator('[data-slot="lb"]');
  await leftBack.focus();
  await expect(report.getByText(/managerhub\.role-interactions\.v1/)).toBeVisible();
  for (let i = 0; i < 3; i++) await leftBack.press('ArrowUp');
  await expect(report.getByText('No role interaction findings under these bounded rules')).toBeVisible();
  await leftBack.press('ArrowUp');
  await expect(report.getByText('Advancing wing-back and winger share a flank')).toBeVisible();
  await expect(report.getByText('Assigned players: Left Defender, Left Wing', { exact: true })).toBeVisible();
  await expect(report.getByText(/not a measured overlap/)).toBeVisible();
  await lab.getByRole('button', { name: 'Move down', exact: true }).click();
  await expect(report.getByText('No role interaction findings under these bounded rules')).toBeVisible();
  await lab.getByRole('button', { name: 'Move up', exact: true }).click();
  await expect(report.getByText('Advancing wing-back and winger share a flank')).toBeVisible();
  await page.getByRole('button', { name: 'Plan B', exact: true }).click();
  await expect(report.getByText('No role interaction findings under these bounded rules')).toBeVisible();
  await page.getByRole('button', { name: 'Plan A', exact: true }).click();
  await expect(report.getByText('Advancing wing-back and winger share a flank')).toBeVisible();
  await lab.getByRole('button', { name: 'Save tactical scenarios' }).click();
  await expect(lab.getByText('Tactical scenarios A and B saved on this browser.')).toBeVisible();
  await page.reload();
  await page.getByRole('combobox', { name: 'Saved player list' })
    .selectOption({ label: 'role-interactions.csv (11 players)' });
  await page.getByRole('button', { name: 'Open saved list' }).click();
  await lab.getByRole('button', { name: 'Restore tactical scenarios' }).click();
  await expect(report.getByText('Assigned players: Left Defender, Left Wing', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Switch language to Vietnamese' }).click();
  const localizedReport = page.getByRole('region', { name: 'Tương tác giữa các vai trò' });
  await expect(localizedReport.getByText('Hậu vệ biên dâng cao cùng hành lang với cầu thủ chạy cánh')).toBeVisible();
  await expect(localizedReport.getByText('Cầu thủ liên quan: Left Defender, Left Wing', { exact: true })).toBeVisible();
});

test('MH-09 role partnerships keep Plan B formation and cover independent', async ({ page }) => {
  await page.goto('/#/players');
  await page.locator('input[type=file]').setInputFiles({
    name: 'role-cover.csv', mimeType: 'text/csv',
    buffer: Buffer.from(makeSquadExport([['DM One', 'DM'], ['DM Two', 'DM'], ['AM One', 'AM (C)']]))
  });
  await page.keyboard.press('Control+k');
  await page.getByRole('dialog', { name: 'Quick navigation' })
    .getByRole('button', { name: /Squad Planner/ }).click();
  const lab = page.getByRole('region', { name: 'Tactical Lab' });
  const report = lab.getByRole('region', { name: 'Role partnerships' });
  await page.getByRole('button', { name: 'Plan B', exact: true }).click();
  await page.getByLabel('Formation').selectOption('4-2-3-1');
  await page.getByRole('combobox', { name: 'Lock LDM' }).selectOption('export-row-12');
  await lab.getByLabel('Select tactical position').selectOption('rb');
  for (let i = 0; i < 4; i++) await lab.getByRole('button', { name: 'Move up', exact: true }).click();
  await expect(report.getByText('Assigned players: Right Defender, Right Wing', { exact: true })).toBeVisible();
  const dm = lab.locator('[data-slot="ldm"]');
  await dm.press('ArrowRight');
  await dm.press('ArrowRight');
  for (let i = 0; i < 4; i++) await dm.press('ArrowDown');
  await expect(report.getByText('Deep central midfield cover is drawn')).toBeVisible();
  await expect(report.getByText('Assigned players: DM One', { exact: true })).toBeVisible();
  await expect(report.getByText(/Position alone does not verify/)).toBeVisible();
  await page.getByRole('button', { name: 'Plan A', exact: true }).click();
  await expect(report.getByText('No role interaction findings under these bounded rules')).toBeVisible();
  await page.getByRole('button', { name: 'Plan B', exact: true }).click();
  await expect(report.getByText('Assigned players: DM One', { exact: true })).toBeVisible();
});

test('MH-09 Step 3 central dynamics: detects uncovered pivot and congestion with reversible adjustment', async ({ page }) => {
  await page.goto('/#/players');
  await page.locator('input[type=file]').setInputFiles({
    name: 'step3-central.csv', mimeType: 'text/csv',
    buffer: Buffer.from(makeSquadExport([['DM One', 'DM'], ['DM Two', 'DM'], ['AM One', 'AM (C)']]))
  });
  await page.keyboard.press('Control+k');
  await page.getByRole('dialog', { name: 'Quick navigation' })
    .getByRole('button', { name: /Squad Planner/ }).click();
  const lab = page.getByRole('region', { name: 'Tactical Lab' });
  const report = lab.getByRole('region', { name: 'Role partnerships' });

  // In 4-3-3: move all 3 central midfielders (lcm, cm, rcm) up to attacking depth (y <= 8)
  await lab.getByLabel('Select tactical position').selectOption('lcm');
  for (let i = 0; i < 3; i++) await lab.getByRole('button', { name: 'Move up', exact: true }).click();
  await lab.getByLabel('Select tactical position').selectOption('cm');
  for (let i = 0; i < 4; i++) await lab.getByRole('button', { name: 'Move up', exact: true }).click();
  await lab.getByLabel('Select tactical position').selectOption('rcm');
  for (let i = 0; i < 3; i++) await lab.getByRole('button', { name: 'Move up', exact: true }).click();

  await expect(report.getByText('Uncovered central pivot')).toBeVisible();
  await expect(report.getByText(/All central midfielders advance into attacking depth/)).toBeVisible();

  // Apply suggested adjustment to uncovered central pivot
  await report.getByRole('button', { name: 'Apply suggested adjustment to Uncovered central pivot' }).click();
  await expect(report.getByText('Uncovered central pivot')).not.toBeVisible();

  // Undo restores the warning
  await report.getByRole('button', { name: 'Undo last tactical adjustment' }).click();
  await expect(report.getByText('Uncovered central pivot')).toBeVisible();

  // Language switch to Vietnamese
  await page.getByRole('button', { name: 'Switch language to Vietnamese' }).click();
  const localizedReport = page.getByRole('region', { name: 'Tương tác giữa các vai trò' });
  await expect(localizedReport.getByText('Khoảng trống trục dọc trung lộ chưa được che chắn')).toBeVisible();
});

test('MH-09 applies the selected flank card and preserves independent undo history', async ({ page }) => {
  await page.goto('/#/players');
  await page.locator('input[type=file]').setInputFiles({
    name: 'role-targets.csv', mimeType: 'text/csv', buffer: Buffer.from(makeSquadExport())
  });
  await page.keyboard.press('Control+k');
  await page.getByRole('dialog', { name: 'Quick navigation' })
    .getByRole('button', { name: /Squad Planner/ }).click();
  const lab = page.getByRole('region', { name: 'Tactical Lab' });
  const report = lab.getByRole('region', { name: 'Role partnerships' });
  const left = lab.locator('[data-slot="lb"]');
  const right = lab.locator('[data-slot="rb"]');
  for (const slot of [left, right]) {
    for (let i = 0; i < 4; i++) await slot.press('ArrowUp');
  }
  await expect(report.getByText('Advancing wing-back and winger share a flank')).toHaveCount(2);
  await report.getByRole('button', {
    name: 'Apply suggested adjustment to Advancing wing-back and winger share a flank for Right Defender, Right Wing'
  }).click();
  await expect(left).toHaveAttribute('data-y', '11');
  await expect(right).toHaveAttribute('data-y', '15');
  await expect(report.getByText('Assigned players: Left Defender, Left Wing', { exact: true })).toBeVisible();
  await expect(lab.getByRole('button', { name: 'Undo last tactical adjustment' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Plan B', exact: true }).click();
  for (let i = 0; i < 4; i++) await left.press('ArrowUp');
  await report.getByRole('button', {
    name: 'Apply suggested adjustment to Advancing wing-back and winger share a flank for Left Defender, Left Wing'
  }).click();
  await expect(left).toHaveAttribute('data-y', '15');
  await page.getByRole('button', { name: 'Plan A', exact: true }).click();
  await report.getByRole('button', { name: 'Undo last tactical adjustment' }).click();
  await expect(left).toHaveAttribute('data-y', '11');
  await expect(right).toHaveAttribute('data-y', '11');
  await page.getByRole('button', { name: 'Plan B', exact: true }).click();
  await report.getByRole('button', { name: 'Undo last tactical adjustment' }).click();
  await expect(left).toHaveAttribute('data-y', '11');
  await expect(right).toHaveAttribute('data-y', '15');
});

test('Tactical diagnostics suppress shape warnings for incomplete XI', async ({ page }) => {
  await page.goto('/#/players');
  await page.locator('input[type=file]').setInputFiles({
    name: 'incomplete-diagnostics.csv', mimeType: 'text/csv',
    buffer: Buffer.from(makeSquadExport().split('\n').slice(0, -1).join('\n'))
  });
  await page.keyboard.press('Control+k');
  await page.getByRole('dialog', { name: 'Quick navigation' })
    .getByRole('button', { name: /Squad Planner/ }).click();
  const lab = page.getByRole('region', { name: 'Tactical Lab' });
  const diagnostics = lab.getByRole('region', { name: 'Tactical diagnostics' });
  await expect(diagnostics.getByText('Complete XI needed for shape diagnostics')).toBeVisible();
  await lab.getByRole('button', { name: 'Defending' }).click();
  await lab.getByLabel('Proposed defensive line').selectOption('high');
  await lab.getByLabel('Proposed pressing').selectOption('low');
  await expect(diagnostics.getByText('Complete the XI to assess tactical shape')).toBeVisible();
  await expect(diagnostics.getByText('High line with low pressing')).toHaveCount(0);
  await expect(diagnostics.getByRole('button', { name: /Apply suggested adjustment/ })).toHaveCount(0);
  const roleReport = lab.getByRole('region', { name: 'Role partnerships' });
  await expect(roleReport.getByText('Role partnership checks need a complete XI')).toBeVisible();
  await expect(roleReport.getByText('Advancing wing-back and winger share a flank')).toHaveCount(0);
  await expect(roleReport.getByText(/Assigned players:/)).toHaveCount(0);
});

test('Plan B remains intact across workspace navigation and resets for a different import', async ({page})=>{
  await page.goto('/#/players');
  await page.locator('input[type=file]').setInputFiles({
    name:'career-one.csv',mimeType:'text/csv',
    buffer:Buffer.from(makeSquadExport([['Bench Versatile','D (R), AM (R)']]))
  });
  await page.keyboard.press('Control+k');
  await page.getByRole('dialog',{name:'Quick navigation'})
    .getByRole('button',{name:/Squad Planner/}).click();
  await page.getByRole('button',{name:'Plan B',exact:true}).click();
  await page.getByRole('combobox',{name:'Lock RB'}).selectOption('export-row-12');
  await expect(page.getByRole('list',{name:'Assigned starting eleven'})).toContainText('Bench Versatile');

  await page.keyboard.press('Control+k');
  await page.getByRole('dialog',{name:'Quick navigation'})
    .getByRole('button',{name:/Player Lab/}).click();
  await page.keyboard.press('Control+k');
  await page.getByRole('dialog',{name:'Quick navigation'})
    .getByRole('button',{name:/Squad Planner/}).click();
  await expect(page.getByRole('button',{name:'Plan B',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.getByRole('combobox',{name:'Lock RB'})).toHaveValue('export-row-12');

  await page.keyboard.press('Control+k');
  await page.getByRole('dialog',{name:'Quick navigation'})
    .getByRole('button',{name:/Player Lab/}).click();
  await page.locator('input[type=file]').setInputFiles({
    name:'different-career.csv',mimeType:'text/csv',buffer:Buffer.from(makeSquadExport())
  });
  await page.keyboard.press('Control+k');
  await page.getByRole('dialog',{name:'Quick navigation'})
    .getByRole('button',{name:/Squad Planner/}).click();
  await expect(page.getByRole('button',{name:'Plan A',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Plan B',exact:true}).click();
  await expect(page.getByRole('combobox',{name:'Lock RB'})).toHaveValue('');
});


test('large player lists keep a bounded DOM and scroll to loaded records', async ({page}) => {
  const reserves = Array.from({length:500}, (_, index) => [`Reserve ${index}`, 'M (C)'] as const);
  await page.goto('/#/players');
  await page.locator('input[type=file]').setInputFiles({
    name:'large-roster.csv',
    mimeType:'text/csv',
    buffer:Buffer.from(makeSquadExport(reserves))
  });
  await expect(page.getByText('511 player records')).toBeVisible();
  const list = page.getByRole('list', {name:'Imported players'});
  await expect.poll(() => list.getByRole('listitem').count()).toBeLessThanOrEqual(16);
  await list.evaluate(element => { element.scrollTop = element.scrollHeight; });
  await expect(list.getByRole('button', {name:/Reserve 88/})).toBeVisible();
  const scrollTopBeforeLoadingMore = await list.evaluate(element => element.scrollTop);
  await page.getByRole('button', {name:/Show next 100/}).click();
  await expect.poll(() => list.evaluate(element => element.scrollTop))
    .toBeGreaterThan(scrollTopBeforeLoadingMore - 100);
  await expect.poll(() => list.getByRole('listitem').count()).toBeLessThanOrEqual(22);
});

test('VI/EN language switch localizes onboarding, saves choice and restores English', async ({page})=>{
  await page.goto('/#/overview');
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await page.getByRole('button',{name:'Switch language to Vietnamese'}).click();
  await expect(page.locator('html')).toHaveAttribute('lang','vi');
  await expect(page.getByRole('heading',{name:/Mọi quyết định/})).toBeVisible();
  await expect(page.getByText('TRÍ TUỆ BÓNG ĐÁ')).toBeVisible();
  await expect(page.getByRole('navigation',{name:'Điều hướng chính'})).toContainText('Phân tích cầu thủ');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang','vi');
  await expect(page.getByRole('heading',{name:/Mọi quyết định/})).toBeVisible();
  await page.keyboard.press('Control+k');
  await page.getByRole('dialog',{name:'Chuyển trang nhanh'})
    .getByRole('button',{name:/Phân tích cầu thủ/}).click();
  await expect(page.getByRole('heading',{name:'Phân tích cầu thủ'})).toBeVisible();
  await expect(page.getByText(/Trong FM, mở danh sách cầu thủ/)).toBeVisible();

  await page.getByRole('button',{name:'Switch to English'}).click();
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await expect(page.getByRole('heading',{name:'Player Lab'})).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await expect(page.getByRole('heading',{name:'Player Lab'})).toBeVisible();
});

test('Player Lab lazily loads recruitment comparison and hands the same roster to Squad Planner', async ({ page }) => {
  await page.goto('/#/players');
  await page.locator('input[type=file]').setInputFiles({
    name: 'recruitment-roster.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(makeSquadExport())
  });
  await expect(page.getByRole('heading', { name: 'GK Player' })).toBeVisible();
  await page.getByRole('tab', { name: 'Recruitment' }).click();
  await expect(page.getByRole('heading', { name: 'Squad contribution preview' })).toBeVisible();
  await expect(page.getByLabel('Formation to test')).toHaveValue('4-3-3');
  await page.getByRole('button', { name: 'Open this roster in Squad Planner' }).click();
  await expect(page.getByRole('heading', { name: 'Squad Planner' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Assigned starting eleven' })).toContainText('GK Player');
});

test('Vietnamese player scouting labels are readable and CA stays unverified',async ({page})=>{
  await page.goto('/#/players');
  await page.getByRole('button',{name:'Switch language to Vietnamese'}).click();
  await page.locator('input[type=file]').setInputFiles({
    name:'vi-squad.csv',mimeType:'text/csv',
    buffer:Buffer.from('Name,Position,Passing,Vision,Decisions,Stamina,Work Rate\nCầu thủ thử nghiệm,CM,17,18,16,14,16')
  });
  await expect(page.getByRole('heading',{name:'Cầu thủ thử nghiệm'})).toBeVisible();
  await expect(page.getByText('CA thật', { exact: true })).toBeVisible();
  await expect(page.getByText('Chưa xác minh').first()).toBeVisible();
  await page.getByRole('tab',{name:'Chỉ số'}).click();
  await expect(page.getByText('Chuyền bóng').first()).toBeVisible();
  await page.getByLabel('Nhóm chỉ số', { exact: true }).selectOption('Mental');
  await expect(page.getByText('Tầm nhìn').first()).toBeVisible();
});


test('save inspection errors give actionable guidance in both languages', async ({ page }) => {
  await page.goto('/#/saves');
  await page.locator('input[type=file]').setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not a Football Manager save')
  });

  const alert = page.getByRole('alert');
  await expect(alert).toContainText('Choose a Football Manager .fm save file.');
  await expect(alert).not.toContainText('Select a Football Manager .fm save file.');
  await page.getByRole('button', { name: 'Switch language to Vietnamese' }).click();
  await expect(alert).toContainText('Hãy chọn tệp save Football Manager có đuôi .fm.');
  await expect(alert).not.toContainText('Select a Football Manager');
});


test('save inspection metadata is opt-in, survives reload, and never stores the .fm bytes', async ({ page }) => {
  await page.goto('/#/saves');
  await page.locator('input[type=file]').setInputFiles({
    name: 'persistent-career.fm',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from([2, 1, 97, 102, 101, 46])
  });
  await expect(page.getByRole('heading', { name: 'persistent-career.fm' })).toBeVisible();
  await expect(page.getByText('Session only')).toBeVisible();
  await page.getByRole('button', { name: 'Save inspection metadata on this browser' }).click();
  await expect(page.getByRole('button', { name: 'Remove saved metadata' })).toBeVisible();
  await expect(page.getByText('Saved metadata on this browser')).toBeVisible();

  await page.getByRole('button', { name: 'Switch language to Vietnamese' }).click();
  await expect(page.getByRole('button', { name: 'Xóa thông tin save đã lưu' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'persistent-career.fm' })).toBeVisible();
  await expect(page.getByText('Đã lưu thông tin trên trình duyệt này')).toBeVisible();

  const stored = await page.evaluate(async () => {
    const open = indexedDB.open('managerhub-local', 4);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    try {
      const records = await new Promise<unknown[]>((resolve, reject) => {
        const request = db.transaction('save-inspections', 'readonly')
          .objectStore('save-inspections').getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const keys = Object.keys(records[0] as Record<string, unknown>).sort();
      return { count: records.length, keys, stores: Array.from(db.objectStoreNames) };
    } finally {
      db.close();
    }
  });
  expect(stored.count).toBe(1);
  expect(stored.keys).toEqual([
    'archiveIndex', 'build', 'detectedFamily', 'edition', 'id', 'importedAt',
    'inspectionStatus', 'lastModified', 'name', 'sha256', 'signature', 'size',
    'support', 'warnings'
  ]);
  expect(stored.stores).toContain('player-exports');
  expect(stored.stores).toContain('player-export-summaries');

  const removeDialogPromise = page.waitForEvent('dialog').then(async dialog => {
    const result = { type: dialog.type(), message: dialog.message() };
    await dialog.accept();
    return result;
  });
  await page.getByRole('button', { name: 'Xóa thông tin save đã lưu' }).click();
  const removeDialog = await removeDialogPromise;
  expect(removeDialog.type).toBe('confirm');
  expect(removeDialog.message).toContain('Tệp .fm gốc sẽ không bị thay đổi.');
  await expect(page.getByText('Chỉ trong phiên hiện tại')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Chưa có file save nào')).toBeVisible();
});


test('upgrades the v1 IndexedDB schema to v4 without dropping existing libraries', async ({ page }) => {
  await page.addInitScript(() => {
    const request = indexedDB.open('managerhub-local', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('player-exports')) {
        db.createObjectStore('player-exports', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('player-export-summaries')) {
        const summaries = db.createObjectStore('player-export-summaries', { keyPath: 'id' });
        summaries.add({
          id: 'legacy-summary',
          savedAt: '2026-10-28T12:00:00.000Z',
          fileName: 'legacy-export.csv',
          importedAt: '2026-10-28T11:59:00.000Z',
          playerCount: 1,
          attributeCount: 2
        });
      }
    };
    request.onsuccess = () => request.result.close();
    request.onerror = () => { /* The app will report storage errors if the test setup cannot initialize. */ };
  });

  await page.goto('/#/saves');
  await expect(page.getByRole('heading', { name: 'Save Library' })).toBeVisible();
  await expect(page.getByText('No files inspected yet')).toBeVisible();

  const migration = await page.evaluate(async () => {
    const request = indexedDB.open('managerhub-local', 4);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const legacy = await new Promise<unknown>((resolve, reject) => {
        const get = db.transaction('player-export-summaries', 'readonly')
          .objectStore('player-export-summaries').get('legacy-summary');
        get.onsuccess = () => resolve(get.result);
        get.onerror = () => reject(get.error);
      });
      return { version: db.version, stores: Array.from(db.objectStoreNames), legacy };
    } finally {
      db.close();
    }
  });
  expect(migration.version).toBe(4);
  expect(migration.stores).toContain('player-exports');
  expect(migration.stores).toContain('player-export-summaries');
  expect(migration.stores).toContain('save-inspections');
  expect(migration.stores).toContain('historical-editor-snapshots');
  expect(migration.stores).toContain('historical-editor-summaries');
  expect(migration.stores).toContain('historical-realism-snapshots');
  expect(migration.stores).toContain('historical-realism-summaries');
  expect(migration.legacy).toMatchObject({ id: 'legacy-summary', fileName: 'legacy-export.csv' });
});


test('save inspection metadata library enforces its 50-record limit', async ({ page }) => {
  await page.goto('/#/saves');
  await expect(page.getByRole('heading', { name: 'Save Library' })).toBeVisible();
  // Wait for the lazy Save Library hook to finish opening/upgrading IndexedDB.
  await expect(page.getByText('Session only')).toBeVisible();
  await page.evaluate(async () => {
    const request = indexedDB.open('managerhub-local', 4);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('save-inspections', 'readwrite');
        const store = tx.objectStore('save-inspections');
        for (let index = 0; index < 50; index++) {
          store.put({
            id: 'seed-' + index,
            name: 'career-' + index + '.fm',
            importedAt: new Date(1_790_000_000_000 + index).toISOString(),
            lastModified: 1,
            size: 6,
            sha256: null,
            signature: '02 01 61 66 65 2E',
            detectedFamily: 'afe',
            edition: null,
            build: null,
            support: 'signature_only',
            inspectionStatus: 'inspected',
            warnings: ['Player records have not been decoded.'],
            archiveIndex: null
          });
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  });
  await page.locator('input[type=file]').setInputFiles({
    name: 'one-more-career.fm',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from([2, 1, 97, 102, 101, 46])
  });
  await expect(page.getByRole('heading', { name: 'one-more-career.fm' })).toBeVisible();
  await page.getByRole('button', { name: 'Save inspection metadata on this browser' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'This browser already holds 50 saved save inspections. Delete one first.'
  );
});


test('incompatible save metadata can be cleared without deleting player or historical libraries', async ({ page }) => {
  await page.goto('/#/saves');
  await expect(page.getByRole('heading', { name: 'Save Library' })).toBeVisible();
  await expect(page.getByText('Session only')).toBeVisible();

  await page.evaluate(async () => {
    const request = indexedDB.open('managerhub-local', 4);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([
          'save-inspections', 'player-export-summaries',
          'historical-editor-snapshots', 'historical-realism-snapshots'
        ], 'readwrite');
        tx.objectStore('save-inspections').put({
          id: 'corrupt-record',
          name: 'legacy-career.fm',
          importedAt: '2026-10-29T12:00:00.000Z',
          lastModified: 1,
          size: 6,
          sha256: null,
          signature: '02 01 61 66 65 2E',
          detectedFamily: 'afe',
          edition: null,
          build: null,
          support: 'signature_only',
          inspectionStatus: 'inspected',
          warnings: ['Player records have not been decoded.'],
          archiveIndex: null,
          fileBytes: [1, 2, 3]
        });
        tx.objectStore('player-export-summaries').put({
          id: 'preserved-player-summary',
          savedAt: '2026-10-29T12:00:00.000Z',
          fileName: 'preserved-export.csv',
          importedAt: '2026-10-29T11:59:00.000Z',
          playerCount: 1,
          attributeCount: 2
        });
        tx.objectStore('historical-editor-snapshots').put({ id: 'preserved-editor-snapshot' });
        tx.objectStore('historical-realism-snapshots').put({ id: 'preserved-realism-snapshot' });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  });

  await page.reload();
  await expect(page.getByRole('alert')).toContainText(
    'Saved save inspection metadata is incompatible with this version. Clear the incompatible save metadata to continue; player exports will be preserved.'
  );
  const cancelClearPromise = page.waitForEvent('dialog').then(async dialog => {
    const result = { type: dialog.type(), message: dialog.message() };
    await dialog.dismiss();
    return result;
  });
  await page.getByRole('button', { name: 'Clear incompatible saved metadata' }).click();
  const cancelClearDialog = await cancelClearPromise;
  expect(cancelClearDialog.type).toBe('confirm');
  expect(cancelClearDialog.message).toContain('all saved Save Library inspection metadata');
  await expect(page.getByRole('alert')).toBeVisible();

  const acceptClearPromise = page.waitForEvent('dialog').then(async dialog => {
    const message = dialog.message();
    await dialog.accept();
    return message;
  });
  await page.getByRole('button', { name: 'Clear incompatible saved metadata' }).click();
  const acceptClearMessage = await acceptClearPromise;
  expect(acceptClearMessage).toContain('Player exports and historical snapshots will remain untouched.');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByText('No files inspected yet')).toBeVisible();

  const stores = await page.evaluate(async () => {
    const request = indexedDB.open('managerhub-local', 4);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const count = (storeName: string) => new Promise<number>((resolve, reject) => {
        const getCount = db.transaction(storeName, 'readonly').objectStore(storeName).count();
        getCount.onsuccess = () => resolve(getCount.result);
        getCount.onerror = () => reject(getCount.error);
      });
      return {
        saveCount: await count('save-inspections'),
        playerSummaryCount: await count('player-export-summaries'),
        editorSnapshotCount: await count('historical-editor-snapshots'),
        realismSnapshotCount: await count('historical-realism-snapshots'),
        names: Array.from(db.objectStoreNames)
      };
    } finally {
      db.close();
    }
  });
  expect(stores.saveCount).toBe(0);
  expect(stores.playerSummaryCount).toBe(1);
  expect(stores.editorSnapshotCount).toBe(1);
  expect(stores.realismSnapshotCount).toBe(1);
  expect(stores.names).toContain('player-exports');
});


test('upgrades an existing v2 database to v4 without losing save or player metadata', async ({ page }) => {
  await page.route('**/*', async route => {
    if (route.request().isNavigationRequest()) {
      await route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><head></head><body></body></html>' });
    } else {
      await route.abort();
    }
  });
  await page.goto('/');
  await page.evaluate(async () => {
    const request = indexedDB.open('managerhub-local', 2);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onupgradeneeded = () => {
        const upgradeDb = request.result;
        if (!upgradeDb.objectStoreNames.contains('player-exports')) upgradeDb.createObjectStore('player-exports', { keyPath: 'id' });
        if (!upgradeDb.objectStoreNames.contains('player-export-summaries')) upgradeDb.createObjectStore('player-export-summaries', { keyPath: 'id' });
        if (!upgradeDb.objectStoreNames.contains('save-inspections')) upgradeDb.createObjectStore('save-inspections', { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['player-export-summaries', 'save-inspections'], 'readwrite');
        tx.objectStore('player-export-summaries').put({
          id: 'v2-player-summary',
          savedAt: '2026-10-31T09:05:00.000Z',
          fileName: 'v2-export.csv',
          importedAt: '2026-10-31T09:00:00.000Z',
          playerCount: 1,
          attributeCount: 2
        });
        tx.objectStore('save-inspections').put({
          id: 'v2-save-summary',
          name: 'v2-career.fm',
          importedAt: '2026-10-31T09:00:00.000Z',
          lastModified: 1,
          size: 6,
          sha256: null,
          signature: '02 01 61 66 65 2E',
          detectedFamily: 'afe',
          edition: null,
          build: null,
          support: 'signature_only',
          inspectionStatus: 'inspected',
          warnings: ['Player records have not been decoded.'],
          archiveIndex: null
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } finally { db.close(); }
  });
  await page.unroute('**/*');
  await page.goto('/?load-app=1#/history');
  await expect(page.getByRole('heading', { name: 'Historical snapshots' })).toBeVisible();
  const result = await page.evaluate(async () => {
    const request = indexedDB.open('managerhub-local', 4);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const read = (store: string, id: string) => new Promise<unknown>((resolve, reject) => {
        const get = db.transaction(store, 'readonly').objectStore(store).get(id);
        get.onsuccess = () => resolve(get.result);
        get.onerror = () => reject(get.error);
      });
      return {
        version: db.version,
        stores: Array.from(db.objectStoreNames),
        player: await read('player-export-summaries', 'v2-player-summary'),
        save: await read('save-inspections', 'v2-save-summary')
      };
    } finally { db.close(); }
  });
  expect(result.version).toBe(4);
  expect(result.stores).toContain('historical-editor-snapshots');
  expect(result.stores).toContain('historical-realism-snapshots');
  expect(result.player).toMatchObject({ id: 'v2-player-summary', fileName: 'v2-export.csv' });
  expect(result.save).toMatchObject({ id: 'v2-save-summary', name: 'v2-career.fm' });
});

test('repairs a partially initialized v3 database and preserves existing historical records', async ({ page }) => {
  await page.route('**/*', async route => {
    if (route.request().isNavigationRequest()) {
      await route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><head></head><body></body></html>' });
    } else {
      await route.abort();
    }
  });
  await page.goto('/');
  await page.evaluate(async () => {
    const request = indexedDB.open('managerhub-local', 3);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onupgradeneeded = () => {
        const upgradeDb = request.result;
        upgradeDb.createObjectStore('player-exports', { keyPath: 'id' });
        upgradeDb.createObjectStore('player-export-summaries', { keyPath: 'id' });
        upgradeDb.createObjectStore('save-inspections', { keyPath: 'id' });
        const editorRecords = upgradeDb.createObjectStore('historical-editor-snapshots', { keyPath: 'id' });
        editorRecords.add({ id: 'preserved-editor-record' });
        const editorSummaries = upgradeDb.createObjectStore('historical-editor-summaries', { keyPath: 'id' });
        editorSummaries.add({ id: 'preserved-editor-summary' });
        // Simulate a v3 database where the Realism stores and summary indexes were never created.
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
  });
  await page.unroute('**/*');
  await page.goto('/?load-app=1#/history');
  await expect(page.getByRole('heading', { name: 'Historical snapshots' })).toBeVisible();
  await expect(page.getByText('No historical snapshots saved')).toBeVisible();

  const result = await page.evaluate(async () => {
    const request = indexedDB.open('managerhub-local', 4);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const editorIndexNames = Array.from(db.transaction('historical-editor-summaries', 'readonly')
        .objectStore('historical-editor-summaries').indexNames);
      const realismIndexNames = Array.from(db.transaction('historical-realism-summaries', 'readonly')
        .objectStore('historical-realism-summaries').indexNames);
      const preserved = await new Promise<unknown>((resolve, reject) => {
        const get = db.transaction('historical-editor-snapshots', 'readonly')
          .objectStore('historical-editor-snapshots').get('preserved-editor-record');
        get.onsuccess = () => resolve(get.result);
        get.onerror = () => reject(get.error);
      });
      return {
        version: db.version,
        stores: Array.from(db.objectStoreNames),
        editorIndexNames,
        realismIndexNames,
        preserved
      };
    } finally { db.close(); }
  });

  expect(result.version).toBe(4);
  expect(result.stores).toContain('historical-realism-snapshots');
  expect(result.stores).toContain('historical-realism-summaries');
  expect(result.editorIndexNames).toContain('bySourceSha256');
  expect(result.realismIndexNames).toContain('bySourceSha256');
  expect(result.preserved).toEqual({ id: 'preserved-editor-record' });
});


test('loads the shared Be Vietnam Pro faces locally without a font CDN', async ({ page }) => {
  const externalFontRequests: string[] = [];
  await page.route(/https:\/\/fonts\.(?:googleapis|gstatic)\.com\//, route => {
    externalFontRequests.push(route.request().url());
    return route.abort();
  });
  await page.goto('/');
  const heading = page.locator('.hero').getByRole('heading', { level: 1 });
  await expect(heading).toBeVisible();
  const result = await page.evaluate(async () => {
    const sample = 'Tiếng Việt: Đặng Nguyễn Ứng dụng 0123456789';
    const descriptors = ['400', '500', '600', '700', '800'].map(weight => `${weight} 16px "Be Vietnam Pro"`);
    descriptors.push('italic 400 16px "Be Vietnam Pro"');
    const faces = await Promise.all(descriptors.map(descriptor => document.fonts.load(descriptor, sample)));
    await document.fonts.ready;
    return {
      family: getComputedStyle(document.body).fontFamily,
      loaded: faces.every(group => group.length > 0 && group.every(face => face.status === 'loaded'))
    };
  });
  expect(result.family).toContain('Be Vietnam Pro');
  await expect(heading).toHaveCSS('font-family', /Be Vietnam Pro/);
  expect(result.loaded).toBe(true);
  expect(externalFontRequests).toEqual([]);
});


test('player attribute report uses bounded exact-value groups and preserves global ranking', async ({ page }) => {
  await page.goto('/#/players');
  await page.locator('input[type=file]').setInputFiles({
    name: 'compact-attributes.csv', mimeType: 'text/csv',
    buffer: Buffer.from('Name,Position,Passing,Vision,Decisions,Stamina,Finishing\nCompact Prospect,CM,18,17,15,16,20')
  });
  await expect(page.getByRole('heading', { name: 'Compact Prospect' })).toBeVisible();
  const report = page.getByRole('tablist', { name: 'Player report' });
  await expect(page.getByRole('table', { name: 'Attribute group summary' })).toBeVisible();
  await expect(page.locator('.role-results')).toHaveCount(0);
  await report.getByRole('tab', { name: 'Attributes' }).click();
  const panel = page.locator('.player-attribute-table');
  const technical = panel.getByRole('group', { name: 'Technical', exact: true });
  await expect(technical.locator('.mh-attribute-row').filter({ hasText: 'Finishing' }).locator('dd')).toHaveText('20');
  await expect(technical.locator('.mh-attribute-row').filter({ hasText: 'Corners' }).locator('dd')).toHaveText('—');
  await expect(panel.locator('svg, .mh-attribute-bar')).toHaveCount(0);
  await panel.getByLabel('Attribute group', { exact: true }).selectOption('all');
  await panel.getByRole('checkbox', { name: 'Sort highest first' }).check();
  await expect(panel.locator('.mh-attribute-row')).toHaveCount(14);
  await expect(panel.locator('.mh-attribute-row').first().locator('dt')).toHaveText('Finishing');
  await panel.getByRole('button', { name: 'Next attributes' }).click();
  await expect(panel.getByRole('group', { name: 'Attribute page' })).toContainText('2 /');
  await report.getByRole('tab', { name: 'Role fit' }).click();
  await expect(page.locator('.role-results')).toBeVisible();
});
