// Story S5: accessibility (TC-S5-13) and layout at three widths (TC-S5-14).
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { TABS } from '../src/v2/features/tabs';
import { settled, stubServices } from './stubs';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

for (const mode of ['light', 'dark'] as const) {
  for (const tab of TABS) {
    test(`TC-S5-13 TC-EXEC-028 axe finds no WCAG 2.1 AA violations on ${tab.label} (${mode} mode)`, async ({ page }) => {
      await stubServices(page, { colorMode: mode, planner: true });
      await page.goto(`./?tab=${tab.key}`);
      await settled(page);
      await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
      const r = await new AxeBuilder({ page }).withTags(WCAG).analyze();
      const summary = r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length}× e.g. ${v.nodes[0]?.target.join(' ')} · ${v.nodes[0]?.failureSummary?.split('\n')[1]?.trim() ?? ''}`);
      expect(summary).toEqual([]);
    });
  }
}

test('TC-S5-13 TC-EXEC-028 keyboard: tabs, tiles and the filter bar are reachable, and Enter opens a tile', async ({ page }) => {
  await stubServices(page);
  await page.goto('./');
  await settled(page);
  const reached = new Set<string>();
  for (let i = 0; i < 80; i++) {
    await page.keyboard.press('Tab');
    const what = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return '';
      // A tile's keyboard control is its title button.
      const tile = el.tagName === 'BUTTON' ? el.closest('[data-tile]') : null;
      if (tile && el.getAttribute('aria-label')?.endsWith(': details')) return tile.getAttribute('data-kpi') ?? '';
      return el.getAttribute('role') ?? el.tagName.toLowerCase();
    });
    reached.add(what);
    if (/^EX-0[1-9]$/.test(what)) break;
  }
  expect([...reached].some((x) => x === 'tab'), 'a dashboard tab').toBe(true);
  expect([...reached].some((x) => x === 'radio'), 'the period presets').toBe(true);
  expect([...reached].some((x) => /^EX-0[1-9]$/.test(x)), 'a KPI tile').toBe(true);
  // A focused tile opens its detail sheet with Enter.
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: /^Open in / })).toBeVisible();
});

test('TC-S5-13 TC-EXEC-028 status is never shown by colour alone: every RAG mark has a word', async ({ page }) => {
  await stubServices(page);
  for (const tab of TABS) {
    await page.goto(`./?tab=${tab.key}`);
    await settled(page);
    // RAG marks carry their word (On track / Watch / Act…) as text or an accessible name.
    const unlabelled = await page.evaluate(() =>
      [...document.querySelectorAll('[data-rag]')].filter((el) => !(el.textContent?.trim() || el.getAttribute('aria-label'))).length,
    );
    expect(unlabelled, tab.key).toBe(0);
  }
});

for (const [width, height] of [
  [1440, 900],
  [1024, 768],
  [390, 844],
] as const) {
  test(`TC-S5-14 TC-EXEC-029 @layout no horizontal page scroll and tiles stay readable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await stubServices(page);
    for (const tab of TABS) {
      await page.goto(`./?tab=${tab.key}`);
      await settled(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${tab.key} at ${width}px scrolls sideways by ${overflow}px`).toBeLessThanOrEqual(1);
      // KPI tiles are not squeezed below a readable width.
      const narrowest = await page.evaluate(() =>
        Math.min(...[...document.querySelectorAll('[data-kpi][data-tile]')].map((el) => el.getBoundingClientRect().width).filter((w) => w > 0)),
      );
      expect(narrowest, `${tab.key}: narrowest tile`).toBeGreaterThanOrEqual(width < 768 ? 150 : 140);
      await page.screenshot({ path: test.info().outputPath(`${tab.key}-${width}.png`), fullPage: false });
    }
  });
}
