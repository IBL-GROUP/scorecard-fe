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
