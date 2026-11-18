// Service Measure laid out as 1.0 (FR-EXEC-052, user request 17 Nov 2026):
// the five 1.0 matrices on the page, in 1.0's places and names, in 2.0 cards;
// the 2.0 additions follow below and the page scrolls.
import { expect, test } from '@playwright/test';
import { realErrors, settled, stubServices } from './stubs';

/** The 1.0 matrices, row by row, with their 1.0 names. */
const V1_ROWS: [kpi: string, title: string][][] = [
  [
    ['IN-13', 'Inventory Days Threshold'],
    ['IN-17', 'Inventory Days'],
    ['IN-12', 'Cover Days by Branch'], // a 2.0 addition the user placed in row 1, column 3
  ],
  [
    ['IN-10', 'Service Measure by Branch'],
    ['IN-15', 'Cover Days Threshold vs Actual'],
    ['IN-16', 'SKUs Against Threshold'],
  ],
];

test('TC-EXEC-060 Service Measure shows the five 1.0 matrices on the page in 1.0 places and names, the 2.0 additions below', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const t = await stubServices(page);
  await page.goto('./?tab=inventory');
  await settled(page);

  const boxes: { kpi: string; x: number; y: number }[][] = [];
  for (const row of V1_ROWS) {
    const got: { kpi: string; x: number; y: number }[] = [];
    for (const [kpi, title] of row) {
      const card = page.locator(`[data-kpi="${kpi}"]`).first();
      await expect(card, kpi).toBeVisible();
      await expect(card.locator('p').first(), kpi).toHaveText(title);
      const b = (await card.boundingBox())!;
      got.push({ kpi, x: b.x, y: b.y });
    }
    boxes.push(got);
  }
  // Each row's cards share a top edge and run left to right; row 2 sits under row 1.
  for (const row of boxes) {
    for (let i = 1; i < row.length; i++) {
      expect(Math.abs(row[i].y - row[0].y), `${row[i].kpi} on ${row[0].kpi}'s row`).toBeLessThanOrEqual(2);
      expect(row[i].x, `${row[i].kpi} right of ${row[i - 1].kpi}`).toBeGreaterThan(row[i - 1].x);
    }
  }
  expect(boxes[1][0].y).toBeGreaterThan(boxes[0][0].y);

  // Inventory Days is open on the page (no sheet, no collapsed block).
  await expect(page.locator('[data-kpi="IN-17"] [data-table-root]')).toBeVisible();
  // Every class starts collapsed: class rows only, each with aria-expanded=false; a click opens one.
  const classRows = page.locator('[data-kpi="IN-17"] [aria-expanded]');
  expect(await classRows.count()).toBeGreaterThan(1);
  for (const v of await classRows.evaluateAll((els) => els.map((e) => e.getAttribute('aria-expanded')))) expect(v).toBe('false');
  await classRows.first().click();
  await expect(classRows.first()).toHaveAttribute('aria-expanded', 'true');
  // Nothing is behind a Details sheet on this tab.
  await expect(page.locator('[data-kpi-more]')).toHaveCount(0);

  // The 2.0 additions follow below the 1.0 matrices.
  const lastV1 = Math.max(...boxes[1].map((b) => b.y));
  for (const kpi of ['IN-01', 'IN-02', 'IN-09', 'IN-06', 'IN-11', 'EX-10']) {
    const el = page.locator(`[data-kpi="${kpi}"]`).first();
    await expect(el, kpi).toBeAttached();
    expect((await el.boundingBox())!.y, `${kpi} below the 1.0 matrices`).toBeGreaterThan(lastV1);
  }
  // The page scrolls (the other tabs keep the fixed screen).
  expect(await page.evaluate(() => document.documentElement.scrollHeight > document.documentElement.clientHeight)).toBe(true);
  expect(realErrors(t)).toEqual([]);
});

test('TC-EXEC-061 Inventory Days drill: Class → SKU → cover by branch, and a branch bar opens nothing more', async ({ page }) => {
  const t = await stubServices(page);
  await page.goto('./?tab=inventory');
  await settled(page);
  const table = page.locator('[data-kpi="IN-17"]');
  // Unfold the first class, then click its first SKU.
  await table.locator('[aria-expanded="false"]').first().click();
  const sku = table.locator('tbody tr:not([data-group-row]):not([data-total-row])').first();
  const name = (await sku.locator('td').first().innerText()).trim();
  await sku.click();
  const sheet = page.getByRole('dialog').filter({ hasText: 'Cover by branch' }).last();
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText(name);
  const dialogs = await page.getByRole('dialog').count();
  // The branch bars are figures only: no pointer, and a click adds no sheet.
  const bar = sheet.locator('[data-bullet]').first();
  await expect(bar).toBeVisible();
  expect(await bar.evaluate((el) => getComputedStyle(el).cursor)).not.toBe('pointer');
  await bar.click();
  await page.waitForTimeout(400);
  expect(await page.getByRole('dialog').count()).toBe(dialogs);
  await expect(page.getByRole('dialog').filter({ hasText: 'Cover days by class' })).toHaveCount(0);
  expect(realErrors(t)).toEqual([]);
});
