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
  await expect(page.getByText(/We can check this save’s format/)).toBeVisible();
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
  await expect(page.getByText('Passing', { exact: true }).first()).toBeVisible();
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
    const open = indexedDB.open('managerhub-local', 2);
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

  await page.getByRole('button', { name: 'Xóa thông tin save đã lưu' }).click();
  await expect(page.getByText('Chỉ trong phiên hiện tại')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Chưa có file save nào')).toBeVisible();
});


test('upgrades the v1 IndexedDB schema without dropping the existing player library', async ({ page }) => {
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
    const request = indexedDB.open('managerhub-local', 2);
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
  expect(migration.version).toBe(2);
  expect(migration.stores).toContain('player-exports');
  expect(migration.stores).toContain('player-export-summaries');
  expect(migration.stores).toContain('save-inspections');
  expect(migration.legacy).toMatchObject({ id: 'legacy-summary', fileName: 'legacy-export.csv' });
});


test('save inspection metadata library enforces its 50-record limit', async ({ page }) => {
  await page.goto('/#/saves');
  await expect(page.getByRole('heading', { name: 'Save Library' })).toBeVisible();
  // Wait for the lazy Save Library hook to finish opening/upgrading IndexedDB.
  await expect(page.getByText('Session only')).toBeVisible();
  await page.evaluate(async () => {
    const request = indexedDB.open('managerhub-local', 2);
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


test('incompatible save metadata can be cleared without deleting the player library', async ({ page }) => {
  await page.goto('/#/saves');
  await expect(page.getByRole('heading', { name: 'Save Library' })).toBeVisible();
  await expect(page.getByText('Session only')).toBeVisible();

  await page.evaluate(async () => {
    const request = indexedDB.open('managerhub-local', 2);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['save-inspections', 'player-export-summaries'], 'readwrite');
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
  await page.getByRole('button', { name: 'Clear incompatible saved metadata' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByText('No files inspected yet')).toBeVisible();

  const stores = await page.evaluate(async () => {
    const request = indexedDB.open('managerhub-local', 2);
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
        names: Array.from(db.objectStoreNames)
      };
    } finally {
      db.close();
    }
  });
  expect(stores.saveCount).toBe(0);
  expect(stores.playerSummaryCount).toBe(1);
  expect(stores.names).toContain('player-exports');
});
