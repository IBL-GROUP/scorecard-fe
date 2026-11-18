// Sales Pulse 2.0 (DSR-fe) style adopted on 16 Nov 2026: menu (FR-EXEC-042),
// control panel and period button (FR-EXEC-043), terminology (FR-EXEC-044),
// horizontal bars (FR-EXEC-045) and group-wise tables (FR-EXEC-046).
import { expect, test } from '@playwright/test';
import { realErrors, settled, stubServices } from './stubs';
import { TABS } from '../src/v2/features/tabs';

test('TC-EXEC-046 menu: logo, product and version badge, one tab per view, "How we calculate", theme switch; tabs that do not fit go behind "More"', async ({ page }) => {
  const t = await stubServices(page);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('./?tab=revenue');
  await settled(page);
  const header = page.locator('header');
  await expect(header.getByRole('img', { name: 'ONE Thunder' })).toBeVisible();
  await expect(header.getByText('Supply Chain Pulse')).toBeVisible();
  await expect(header.getByText('2.0', { exact: true })).toBeVisible();
  await expect(page.getByRole('tablist', { name: 'Dashboard tabs' }).getByRole('tab')).toHaveCount(TABS.length);
  await expect(page.getByRole('tab', { name: 'Summary' })).toHaveAttribute('aria-selected', 'true');
  // "How we calculate" lists every KPI's rule.
  await header.getByRole('button', { name: 'How we calculate' }).click();
  const methods = page.locator('[data-methods]');
  await expect(methods).toBeVisible();
  await expect(methods.getByText('EX-01', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(methods).toHaveCount(0);
  // Theme switch.
  const before = await page.locator('html').getAttribute('data-theme');
  await header.getByRole('button', { name: /Switch to (dark|light) mode/ }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', before ?? '');
  // A narrow window folds tabs into "More views"; picking one opens it.
  await page.setViewportSize({ width: 1100, height: 800 });
  const more = page.getByRole('button', { name: 'More views' });
  await expect(more).toBeVisible();
  const shown = await page.getByRole('tablist', { name: 'Dashboard tabs' }).getByRole('tab').count();
  expect(shown).toBeLessThan(TABS.length);
  await more.click();
  const last = TABS[TABS.length - 1];
  await page.getByRole('menuitem').filter({ hasText: last.mid }).click();
  await expect(page).toHaveURL(new RegExp(`tab=${last.key}`));
  expect(realErrors(t)).toEqual([]);
});

test('TC-EXEC-047 control panel: a search chip applies at once (no Apply); the period button names A vs B and opens presets and the comparison', async ({ page }) => {
  const t = await stubServices(page);
  await page.goto('./?tab=revenue');
  await settled(page);
  await expect(page.getByRole('button', { name: 'Apply' })).toHaveCount(0);
  // Class A from the search box, applied at once.
  const calls = t.apiCalls.length;
  const search = page.locator('[data-filter-search]').getByRole('textbox', { name: 'Search' });
  await search.fill('Class A');
  await search.press('Enter');
  await expect(page.locator('[data-filter-search]').getByRole('button', { name: /^Remove / })).toHaveCount(1);
  await expect.poll(() => t.apiCalls.slice(calls).some((x) => [...x.params.entries()].some(([k, v]) => k.startsWith('classification') && v.split(',').includes('A')))).toBe(true);
  // Period button: "Nov 2026 vs Oct 2026"; QTD changes A to the quarter's months.
  const button = page.locator('[data-period-button]');
  await expect(button).toHaveAccessibleName(/^Period: [A-Z][a-z]{2}(–[A-Z][a-z]{2})? \d{4} vs [A-Z][a-z]{2}(–[A-Z][a-z]{2})? \d{4}/);
  await button.click();
  const dialog = page.getByRole('dialog', { name: 'Period and comparison' });
  await expect(dialog.getByText('Compare with')).toBeVisible();
  await dialog.getByRole('radiogroup', { name: 'Period' }).getByRole('radio', { name: 'QTD', exact: true }).click();
  await dialog.getByRole('radiogroup', { name: 'Compare to' }).getByRole('radio', { name: 'Same period last year', exact: true }).click();
  await expect(dialog.getByText('A', { exact: true })).toBeVisible();
  await expect(dialog.getByText('B', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  const name = await button.getAttribute('aria-label');
  const [a, b] = name!.replace('Period: ', '').split(' vs ');
  expect(Number(b.slice(-4))).toBe(Number(a.slice(-4)) - 1);
  expect(realErrors(t)).toEqual([]);
});

test('TC-EXEC-048 terminology: Achievement, Key insights with "Needs attention" / "Going well", and "vs <month>" comparisons', async ({ page }) => {
  const t = await stubServices(page);
  for (const tab of ['overview', 'revenue']) {
    await page.goto(`./?tab=${tab}`);
    await settled(page);
    const text = await page.locator('main').innerText();
    expect(text, `${tab}: no "attainment" on screen`).not.toMatch(/attainment/i);
    expect(text, `${tab}: no "Risks & Opportunities"`).not.toMatch(/Risks & Opportunities/);
    expect(text).toMatch(/Key insights/);
    expect(text).toMatch(/achievement to date/i);
    expect(text).toMatch(/Needs attention|Going well/);
    // Insight rows say Needs attention / Going well; tile statuses keep On track / Watch / Act (FR-EXEC-010).
    await expect(page.locator('main').getByText('Opportunity', { exact: true })).toHaveCount(0);
  }
  // A tile's detail page names the comparison by its months.
  await page.goto('./?tab=overview');
  await settled(page);
  await page.locator('[data-kpi="EX-01"] button[aria-label$=": details"]').first().click();
  await expect(page.getByText(/vs [A-Z][a-z]{2}(–[A-Z][a-z]{2})? \d{4}/).first()).toBeVisible();
  expect(realErrors(t)).toEqual([]);
});

test('TC-EXEC-049 horizontal bars in the Sales Pulse style: A→Z rows, value bar, target line, B-period bar, figures on the right', async ({ page }) => {
  const t = await stubServices(page);
  await page.goto('./?tab=fulfilment');
  await settled(page);
  const fill = page.locator('[data-kpi="OP-03"] [data-hbars]');
  await expect(fill).toBeVisible();
  const names = await fill.locator('[data-hbar]').evaluateAll((els) => els.map((e) => e.getAttribute('data-hbar') ?? ''));
  expect(names.length).toBeGreaterThan(1);
  expect(names).toEqual([...names].sort((x, y) => x.localeCompare(y, undefined, { numeric: true, sensitivity: 'base' })));
  await expect(fill.getByText(/% target/).first()).toBeVisible();
  // The other horizontal bar charts: on a panel, or in its Details sheet.
  const checks: [tab: string, sheet: string | null, kpis: string[]][] = [
    ['revenue', null, ['RV-11']],
    ['revenue', 'Sales & mix', ['RV-10']],
    ['inventory', null, ['IN-11', 'IN-16']],
    ['distribution', 'Reporting', ['DH-05']],
  ];
  for (const [tab, sheet, kpis] of checks) {
    await page.goto(`./?tab=${tab}`);
    await settled(page);
    if (sheet) await page.getByRole('button', { name: `${sheet}: details`, exact: true }).click();
    for (const kpi of kpis) await expect(page.locator(`[data-kpi="${kpi}"] [data-hbars]`), `${tab} ${kpi}`).toBeVisible();
    if (sheet) await page.getByRole('button', { name: 'Close details' }).click();
  }
  expect(realErrors(t)).toEqual([]);
});

test('TC-EXEC-050 group-wise tables: Group by, folding groups with subtotals and counts, Total last', async ({ page }) => {
  const t = await stubServices(page, { planner: true });
  await page.goto('./?tab=fulfilment');
  await settled(page);
  await page.getByRole('button', { name: 'Orders: details', exact: true }).click();
  const section = page.locator('[data-detail="dispatch"]');
  const toggle = section.locator('> button[aria-expanded]');
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
  const table = section.locator('[data-grouped]');
  await expect(table).toBeVisible();
  await expect(table.getByRole('radiogroup', { name: 'Group by' })).toBeVisible();
  const groups = table.locator('[data-group-row="channel"]');
  expect(await groups.count()).toBeGreaterThan(0);
  // Fold the first group: its rows go; unfold: they come back.
  const first = groups.first().getByRole('button', { name: /^(Fold|Unfold) / });
  const rowsBefore = await table.locator('tbody tr').count();
  await first.click();
  await expect.poll(() => table.locator('tbody tr').count()).not.toBe(rowsBefore);
  await first.click();
  await expect.poll(() => table.locator('tbody tr').count()).toBe(rowsBefore);
  // Collapse all leaves only the group rows (no stale rows: two source rows can share a key).
  await table.getByRole('button', { name: 'Collapse all' }).click();
  await expect.poll(() => table.locator('tbody tr').count()).toBe(await groups.count());
  // Group by Material instead.
  await table.getByRole('radio', { name: 'Material › Channel' }).click();
  await expect(table.locator('[data-group-row="material"]').first()).toBeVisible();
  // The Total row is the last row (in the table foot).
  await expect(table.locator('tfoot [data-total-row]')).toHaveCount(1);
  expect(realErrors(t)).toEqual([]);
});

test('TC-EXEC-053 Cover days input: the days the month target is spread over; cover-days calls carry it and the figures follow', async ({ page }) => {
  const t = await stubServices(page);
  await page.goto('./?tab=revenue');
  await settled(page);
  const input = page.getByRole('spinbutton', { name: 'Cover days' });
  await expect(input).toBeVisible();
  // Empty = the days in the month (shown as the placeholder).
  expect(Number(await input.getAttribute('placeholder'))).toBeGreaterThanOrEqual(28);
  const classA = page.locator('[data-kpi="IN-07"] [data-bullet]').first();
  const daysOf = async () => Number((await classA.innerText()).match(/(\d+) d/)?.[1] ?? NaN);
  const before = await daysOf();
  const calls = t.apiCalls.length;
  await input.fill('15');
  await input.press('Enter');
  await settled(page);
  // Only the cover-days endpoints carry it.
  await expect.poll(() => t.apiCalls.slice(calls).some((x) => x.path === '/cover-days' && x.params.get('coverDays') === '15')).toBe(true);
  expect(t.apiCalls.slice(calls).filter((x) => x.path === '/sales-summary' && x.params.has('coverDays'))).toEqual([]);
  await expect(page.locator('[data-kpi="IN-07"]')).toContainText('÷ 15 days');
  // Half the days in a 30-day month: the daily target doubles, so cover days about halve.
  await expect.poll(daysOf).toBeLessThan(before);
  // A value outside 1–366 is put back.
  await input.fill('500');
  await input.press('Enter');
  await expect(input).toHaveValue('15');
  expect(realErrors(t)).toEqual([]);
});

test('TC-EXEC-055 Sales (TP) tile as Sales Pulse: value, % of target to date, comparison, and a bar split Rd / Ibl / Pharma Healthcare to trade', async ({ page }) => {
  const t = await stubServices(page);
  await page.goto('./?tab=revenue');
  await settled(page);
  const tile = page.locator('[data-kpi="RV-01"][data-tile]');
  await expect(tile).toContainText(/\d+% of [\d.,]+[MK]? target to date/);
  await expect(tile.locator('[data-sales-comparison]')).toContainText(/vs [\d.,]+[MK]? in /);
  const split = tile.locator('[data-split]');
  await expect(split).toBeVisible();
  const parts = await split.locator('[data-split-part]').evaluateAll((els) => els.map((e) => e.getAttribute('data-split-part')));
  expect(parts).toEqual(['Rd to trade', 'Ibl to trade', 'Pharma Healthcare to trade']);
  // The shares add up to 100%.
  const shares = (await split.innerText()).match(/\((\d+(?:\.\d)?)%\)/g)!.map((x) => Number(x.slice(1, -2)));
  expect(Math.round(shares.reduce((a, b) => a + b, 0))).toBe(100);
  expect(t.apiCalls.some((x) => x.path === '/sales-summary/by-sales-type')).toBe(true);
  expect(realErrors(t)).toEqual([]);
});

test('TC-EXEC-056 no Details buttons; click a Forecast vs budget class → its SKUs (target, budget, alignment, Total first) → click a SKU → its sheet', async ({ page }) => {
  const t = await stubServices(page);
  await page.goto('./?tab=revenue');
  await settled(page);
  // Panels have no "Details" button; the title opens the sheet.
  await expect(page.locator('[data-topic] button').filter({ hasText: /^Details/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Stock level: details', exact: true })).toBeVisible();
  // Click Class A on Forecast vs budget.
  const calls = t.apiCalls.length;
  await page.locator('[data-kpi="RV-11"] [data-hbar="A"]').click();
  const sheet = page.getByRole('dialog').filter({ hasText: 'forecast vs budget by SKU' }).last();
  await expect(sheet).toBeVisible();
  await expect.poll(() => t.apiCalls.slice(calls).some((x) => x.path === '/ibl-vs-tscl' && x.params.get('groupBy') === 'sku' && x.params.getAll('classification').concat(x.params.getAll('classification[]')).includes('A'))).toBe(true);
  await expect(sheet.locator('[data-total-row]')).toHaveCount(1);
  const rows = sheet.locator('tbody tr:not([data-total-row])');
  expect(await rows.count()).toBeGreaterThan(1);
  await expect(sheet).toContainText('National: the budget has no branch');
  // A SKU opens its own sheet on top.
  const sku = (await rows.first().locator('td').first().innerText()).trim();
  await rows.first().click();
  await expect(page.getByRole('dialog').filter({ hasText: sku }).last()).toBeVisible();
  expect(realErrors(t)).toEqual([]);
});

test('TC-EXEC-057 tabs use the 1.0 menu names; Forecast vs budget sits right under Key insights with no empty gap', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const t = await stubServices(page);
  await page.goto('./?tab=revenue');
  await settled(page);
  await expect(page.getByRole('tab')).toHaveText(['Overview', 'Summary', 'Service Measure', 'Dispatch & WIP', 'RD Data Status']);
  const panel = page.locator('section[aria-label="Forecast vs budget"]');
  await expect(panel).toBeVisible();
  const list = await page.locator('[data-kpi="EX-10"]').boundingBox();
  const box = await panel.boundingBox();
  expect(list && box).toBeTruthy();
  const gap = box!.y - (list!.y + list!.height);
  expect(gap).toBeGreaterThanOrEqual(0);
  expect(gap).toBeLessThanOrEqual(16);
  expect(realErrors(t)).toEqual([]);
});

test('TC-EXEC-059 Cover days also drives Service Measure: its four cover-days calls carry the value and the figures follow', async ({ page }) => {
  const t = await stubServices(page);
  await page.goto('./?tab=inventory');
  await settled(page);
  // Service Level by Branch × Class (IN-10): the sum of its cells, % of SKUs above threshold.
  const cells = page.locator('[data-kpi="IN-10"] td');
  const levelOf = async () => (await cells.allInnerTexts()).reduce((t, x) => t + (Number(x.trim().match(/^(\d+)%$/)?.[1]) || 0), 0);
  const before = await levelOf();
  expect(before).toBeGreaterThan(0);
  const calls = t.apiCalls.length;
  const input = page.getByRole('spinbutton', { name: 'Cover days' });
  await input.fill('5');
  await input.press('Enter');
  await settled(page);
  for (const path of ['/service-measure', '/inventory-days', '/tgt-vs-actual', '/above-below-threshold'])
    await expect.poll(() => t.apiCalls.slice(calls).some((x) => x.path === path && x.params.get('coverDays') === '5'), { message: path }).toBe(true);
  // Target spread over 5 days instead of ~30: daily target ×6, cover days fall, fewer SKUs stay above threshold.
  await expect.poll(levelOf).toBeLessThan(before);
  expect(realErrors(t)).toEqual([]);
});
