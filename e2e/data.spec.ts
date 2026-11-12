// Story S5 journeys: period presets and comparisons, Zone 4 exports, and
// permission gating for each section.
import { expect, test, type Page } from '@playwright/test';
import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { categoryCallEnds, comparisonWindow, presetWindow, type CompareKey } from '../src/v2/features/period';
import { ALL_SECTIONS, SECTION_OF, TABS, type Section } from '../src/v2/features/tabs';
import { realErrors, settled, stubServices } from './stubs';

const PRESETS = [
  ['mtd', 'MTD'],
  ['lastMonth', 'Last month'],
  ['qtd', 'QTD'],
  ['ytd', 'YTD'],
  ['custom', 'Custom'],
] as const;
const COMPARES: [CompareKey, string, RegExp][] = [
  ['prev', 'Previous period', /vs previous period/],
  ['ly', 'Same period LY', /vs same period LY/],
];

const radio = (page: Page, group: string, name: string) => page.getByRole('radiogroup', { name: group }).getByRole('radio', { name, exact: true });

for (const [preset, presetLabel] of PRESETS) {
  for (const [compare, compareLabel, compareText] of COMPARES) {
    test(`TC-S5-06 TC-EXEC-025 ${presetLabel} with ${compareLabel}: values load, windows and labels are right, no console errors`, async ({ page }) => {
      const t = await stubServices(page);
      await page.goto('./');
      await settled(page);
      await radio(page, 'Period', presetLabel).click();
      await radio(page, 'Compare to', compareLabel).click();
      await expect(radio(page, 'Period', presetLabel)).toHaveAttribute('aria-checked', 'true');
      await settled(page);

      // The current and the comparison window were both requested: as a date
      // range, or (windows over a month, rule F1) as month-end category calls.
      if (preset !== 'custom') {
        const w = presetWindow(preset);
        const c = comparisonWindow(w, compare);
        const asked = (win: { start: string; end: string }) =>
          t.apiCalls.some((x) => x.params.get('endDate') === win.end && (x.params.get('startDate') === win.start || !x.params.has('startDate'))) ||
          categoryCallEnds(win).every((end) => t.apiCalls.some((x) => x.path.startsWith('/forecast-accuracy-category') && x.params.get('endDate') === end));
        expect(asked(w), `current window ${w.start}..${w.end}`).toBe(true);
        expect(asked(c), `comparison window ${c.start}..${c.end}`).toBe(true);
      }
      await expect(page.getByText(compareText).first()).toBeVisible();
      await expect(page.getByText('Couldn’t load')).toHaveCount(0);
      expect(realErrors(t)).toEqual([]);
    });
  }
}

/** Every Zone 4 section and the tab it lives on. */
const DETAILS: [tab: string, id: string][] = [
  ['revenue', 'rev-acc'],
  ['inventory', 'inv-days'],
  ['fulfilment', 'dispatch'],
  ['fulfilment', 'wip'],
  ['fulfilment', 'rmpm'],
  ['distribution', 'rd-list'],
];

for (const [tab, id] of DETAILS) {
  test(`TC-S5-07 TC-EXEC-026 export every table in Zone 4 "${id}": file has the Total row; one export event per file`, async ({ page }) => {
    const t = await stubServices(page, { planner: true });
    await page.goto(`./?tab=${tab}`);
    await settled(page);
    const detail = page.locator(`[data-detail="${id}"]`);
    const toggle = detail.locator('> button[aria-expanded]');
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
    await settled(page);
    const tables = detail.locator('[data-table-root]');
    const n = await tables.count();
    expect(n, 'tables').toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      const table = tables.nth(i);
      // The export carries the Total row exactly when the table shows one (GAP-024, FR-EXEC-0xx).
      // Tables of days or percentages (e.g. Inventory Days) show none: those are never summed.
      const shown = await table.locator('[data-total-row]').count();
      const [download] = await Promise.all([page.waitForEvent('download'), table.getByRole('button', { name: /^Export/ }).click()]);
      expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
      const wb = XLSX.read(readFileSync(await download.path()));
      const rows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[wb.SheetNames[0]], { header: 1 });
      expect(rows.length, 'header + rows').toBeGreaterThan(1);
      const last = rows[rows.length - 1].map(String).join(' ');
      if (shown) expect(last, `last row of ${download.suggestedFilename()}`).toMatch(/Total/i);
      else expect(last, `${download.suggestedFilename()} shows no Total row, so exports none`).not.toMatch(/^Total\b/);
    }
    await expect.poll(() => t.usage.export.length).toBe(n);
  });
}

const SECTION_SETS: Section[][] = [...ALL_SECTIONS.map((s) => [s]), ALL_SECTIONS];

for (const sections of SECTION_SETS) {
  test(`TC-S5-08 TC-EXEC-027 user with ${sections.length === 4 ? 'all four sections' : sections[0]}: right tabs and tiles, no requests for hidden sections`, async ({ page }) => {
    const t = await stubServices(page, { sections });
    await page.goto('./');
    await settled(page);
    const expectedTabs = TABS.filter((x) => x.anyOf.some((s) => sections.includes(s)));
    await expect(page.getByRole('tablist', { name: 'Dashboard tabs' }).getByRole('tab')).toHaveCount(expectedTabs.length);

    // Visit every visible tab so every query it may run has run.
    for (const tab of expectedTabs) {
      await page.goto(`./?tab=${tab.key}`);
      await settled(page);
    }
    const outside = [...new Set(t.api)].filter((p) => SECTION_OF[p] && !sections.includes(SECTION_OF[p]));
    expect(outside, 'requests for sections the user does not hold').toEqual([]);

    // Overview: tiles of other sections are locked placeholders, never figures.
    await page.goto('./');
    await settled(page);
    const locked = page.getByText(/^Needs .* access$/);
    if (sections.length === 4) await expect(locked).toHaveCount(0);
    else expect(await locked.count()).toBeGreaterThan(0);
    expect(realErrors(t)).toEqual([]);
  });
}

test('TC-S5-08 TC-EXEC-027 user with no section sees the no-access screen and no data is requested', async ({ page }) => {
  const t = await stubServices(page, { sections: [] });
  await page.goto('./');
  await expect(page.getByTestId('no-access')).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(t.api).toEqual([]);
});
