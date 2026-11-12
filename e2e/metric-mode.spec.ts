// "All metrics / 1.0 only" switch in the header (FR-EXEC-024).
import { expect, test, type Page } from '@playwright/test';
import { PRD_ITEMS, V1_IDS } from '../src/v2/features/catalog';
import type { TabKey } from '../src/v2/features/tabs';
import { realErrors, settled, stubServices } from './stubs';

const TABS = Object.keys(PRD_ITEMS) as TabKey[];

/** Every PRD ID on the page right now (tiles, cards, Operational Detail, header stamp). */
const renderedIds = (page: Page) =>
  page.$$eval('[data-kpi]', (els) => [...new Set(els.flatMap((e) => (e.getAttribute('data-kpi') ?? '').split(/\s+/).filter(Boolean)))]);

const modeSwitch = (page: Page) => page.getByRole('group', { name: 'Metrics shown' });

for (const tab of TABS) {
  test(`TC-EXEC-031 ${tab}: "1.0 only" shows just the 1.0 items, survives a reload, and "All metrics" brings back the rest`, async ({ page }) => {
    const t = await stubServices(page);
    await page.goto(`./?tab=${tab}`);
    await settled(page);
    const before = await renderedIds(page);
    // Starts on "All metrics": 2.0-only items are there.
    await expect(modeSwitch(page)).toHaveAttribute('data-metric-mode', 'all');
    const twoOnly = PRD_ITEMS[tab].filter((id) => !V1_IDS.has(id));
    expect(before).toEqual(expect.arrayContaining(twoOnly));

    await modeSwitch(page).getByRole('button', { name: '1.0 only' }).click();
    await expect(modeSwitch(page).getByRole('button', { name: '1.0 only' })).toHaveAttribute('aria-pressed', 'true');
    const v1 = await renderedIds(page);
    // Nothing 2.0-only is left, and every 1.0 item of the tab still is.
    expect(v1.filter((id) => !V1_IDS.has(id))).toEqual([]);
    expect(v1).toEqual(expect.arrayContaining(PRD_ITEMS[tab].filter((id) => V1_IDS.has(id))));
    // Every tab carries 1.0 metrics, so all five stay in the tab bar.
    await expect(page.getByRole('tab')).toHaveCount(TABS.length);

    // Remembered for this user.
    await page.reload();
    await settled(page);
    await expect(modeSwitch(page)).toHaveAttribute('data-metric-mode', 'v1');
    expect((await renderedIds(page)).filter((id) => !V1_IDS.has(id))).toEqual([]);

    await modeSwitch(page).getByRole('button', { name: 'All metrics' }).click();
    await settled(page);
    expect(await renderedIds(page)).toEqual(expect.arrayContaining(before));
    expect(realErrors(t)).toEqual([]);
  });
}
