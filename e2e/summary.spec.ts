// Summary tab requests of 16 Nov 2026: 1.0 gauge footers (FR-EXEC-040), a Days
// gone tile on Budget Accuracy TSCL (FR-EXEC-038), no comparison line on tiles
// (FR-EXEC-010) and no help cards on detail pages (FR-EXEC-037).
import { expect, test } from '@playwright/test';
import { realErrors, settled, stubServices } from './stubs';

test('TC-EXEC-043 both accuracy gauges show the 1.0 footer: month budget or target, achieved, and how far above or below target', async ({ page }) => {
  const t = await stubServices(page);
  await page.goto('./?tab=revenue');
  await settled(page);
  for (const [panel, label] of [['Budget Accuracy TSCL', 'Month Budget'], ['Forecast Accuracy IBL', 'Month Target']] as const) {
    const footer = page.locator(`section[aria-label="${panel}"] [data-gauge-footer]`);
    await expect(footer, panel).toBeVisible();
    await expect(footer).toContainText(label);
    await expect(footer).toContainText('Achieved');
    await expect(footer).not.toContainText('PKR');
    await expect(footer).toContainText(/\d/);
    await expect(page.locator(`section[aria-label="${panel}"]`).getByText(/[▲▼] \d+(\.\d)?% (above|below) target/)).toBeVisible();
  }
  expect(realErrors(t)).toEqual([]);
});

test('TC-EXEC-045 beside each accuracy gauge: 3 months of accuracy by class, as 1.0; no days-gone lines or "(1.0 gauge)"', async ({ page }) => {
  const t = await stubServices(page);
  await page.goto('./?tab=revenue');
  await settled(page);
  for (const panel of ['Budget Accuracy TSCL', 'Forecast Accuracy IBL']) {
    const card = page.locator(`section[aria-label="${panel}"]`);
    const chart = card.locator('[data-class-history]');
    await expect(chart, `${panel}: class history`).toBeVisible();
    // Sales Pulse horizontal bars (FR-EXEC-045): one row per class, three bars each.
    const bars = chart.locator('[data-hbars]');
    await expect(bars).toBeVisible();
    await expect(bars.locator('[data-hbar="A"]')).toBeVisible();
    // The legend names the three months only.
    await expect(chart.locator('[data-legend] li')).toHaveCount(3);
    await expect(chart.locator('[data-legend] li').filter({ hasText: /^[A-Z][a-z]+ \d{4}$/ })).toHaveCount(3);
    await expect(card.getByText(/Days[- ]gone (target|budget)/i)).toHaveCount(0);
    await expect(card.getByText(/Days Gone \d+%/)).toHaveCount(0);
    await expect(card.getByText('(1.0 gauge)', { exact: false })).toHaveCount(0);
  }
  expect(realErrors(t)).toEqual([]);
});

test('TC-EXEC-042 Days gone on both accuracy panels; tiles show no comparison line; detail pages have no help cards', async ({ page }) => {
  const t = await stubServices(page);
  await page.goto('./?tab=revenue');
  await settled(page);
  for (const panel of ['Budget Accuracy TSCL', 'Forecast Accuracy IBL']) {
    await expect(page.locator(`section[aria-label="${panel}"] [data-tile][data-kpi="RV-16"]`), `${panel}: Days gone`).toHaveCount(1);
  }
  // No tile on any tab carries a "pts vs …" / "% vs …" comparison line.
  for (const tab of ['overview', 'revenue', 'inventory', 'fulfilment', 'distribution']) {
    await page.goto(`./?tab=${tab}`);
    await settled(page);
    await expect(page.locator('[data-tile]').filter({ hasText: /[▲▼■] [\d.]+( pts|%) vs / }), `${tab}: tiles with a comparison line`).toHaveCount(0);
    // TC-EXEC-036: no "PKR" sign and no value with two or more decimals anywhere on the tab.
    const text = await page.locator('main, [role="main"], body').first().innerText();
    expect(text, `${tab}: PKR on screen`).not.toMatch(/PKR/);
    expect(text.match(/\d\.\d{2,}/g) ?? [], `${tab}: values with 2+ decimals`).toEqual([]);
  }
  // A detail page shows the comparison but not the help cards.
  // (TC-EXEC-036 on screen: checked per tab in the loop below.)
  await page.goto('./?tab=overview');
  await settled(page);
  await page.locator('[data-kpi="EX-01"] button[aria-label$=": details"]').first().click();
  // The comparison is named by the B period's months: "vs Oct 2026" (FR-EXEC-043).
  await expect(page.getByText(/vs [A-Z][a-z]{2}(–[A-Z][a-z]{2})? \d{4}|No comparison/).first()).toBeVisible();
  await expect(page.getByText('What it tells you')).toHaveCount(0);
  await expect(page.getByText('How it is calculated')).toHaveCount(0);
  expect(realErrors(t)).toEqual([]);
});

test('TC-EXEC-058 Forecast Accuracy IBL: Run-rate required replaces Projected month-end; Sales achievement to date has no graph', async ({ page }) => {
  const t = await stubServices(page);
  await page.goto('./?tab=revenue');
  await settled(page);
  const ibl = page.locator('section[aria-label="Forecast Accuracy IBL"]');
  await expect(ibl).toContainText('Run-rate required');
  await expect(ibl).toContainText(/\/day/);
  await expect(ibl).not.toContainText('Projected month-end');
  await expect(ibl.locator('[data-kpi="RV-03"]')).toHaveCount(0);
  await expect(ibl.locator('[data-kpi="RV-02"] [aria-label="6-month trend"]')).toHaveCount(0);
  expect(realErrors(t)).toEqual([]);
});

test('TC-EXEC-064 tiles show only label, value and status: supporting figures move to the detail page; a filters-ignored note once per panel', async ({ page }) => {
  const t = await stubServices(page);
  await page.goto('./?tab=revenue');
  await settled(page);
  // No "vs pace", "Running …/day", "Need …/day more" or "On course" on any tile face (FR-EXEC-055).
  await expect(page.locator('[data-tile]').filter({ hasText: /vs pace|Running [\d.,]+[MK]?\/day|\/day more|On course for/ })).toHaveCount(0);
  // They are in the tile's detail page instead.
  const budget = page.locator('section[aria-label="Budget Accuracy TSCL"]');
  await budget.locator('[data-kpi="RV-04"] button[aria-label$=": details"]').click();
  await expect(page.getByRole('dialog').getByText(/vs pace: [+−]/)).toBeVisible();
  await page.keyboard.press('Escape');
  await budget.locator('[data-kpi="RV-05"] button[aria-label$=": details"]').click();
  await expect(page.getByRole('dialog').getByText(/Running [\d.,]+[MK]?\/day/)).toBeVisible();
  await page.keyboard.press('Escape');
  // Production ignores the filters: said once in the panel header, not on each tile.
  await page.goto('./?tab=fulfilment');
  await settled(page);
  const production = page.locator('section[aria-label="Production"]');
  await expect(production.locator('[data-topic-note]')).toContainText('Filters not applied: dates only');
  await expect(production.locator('[data-tile]').filter({ hasText: 'Filters not applied' })).toHaveCount(0);
  expect(realErrors(t)).toEqual([]);
});

test('TC-EXEC-065 no graph on any tile: no sparkline, no split bar, no chart; the Sales (TP) split stays as text', async ({ page }) => {
  const t = await stubServices(page);
  for (const tab of ['overview', 'revenue', 'inventory', 'fulfilment', 'distribution']) {
    await page.goto(`./?tab=${tab}`);
    await settled(page);
    await expect(page.locator('[data-tile]').first(), `${tab}: tiles`).toBeVisible();
    await expect(page.locator('[data-tile] [aria-label="6-month trend"]'), `${tab}: sparklines`).toHaveCount(0);
    await expect(page.locator('[data-tile] [data-split] [role="img"]'), `${tab}: split bars`).toHaveCount(0);
    await expect(page.locator('[data-tile] .recharts-wrapper'), `${tab}: charts`).toHaveCount(0);
  }
  await page.goto('./?tab=revenue');
  await settled(page);
  await expect(page.locator('[data-kpi="RV-01"][data-tile] [data-split-part]')).toHaveCount(3);
  expect(realErrors(t)).toEqual([]);
});
