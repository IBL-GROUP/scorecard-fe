// The ⤢ button on every chart card opens it full-size with its content drawn
// (FR-EXEC-035). Before the fix the dialog body had no height, so charts that
// fill their container drew at 0 px and the dialog looked empty.
import { expect, test } from '@playwright/test';
import { realErrors, settled, stubServices } from './stubs';

for (const tab of ['overview', 'revenue', 'inventory', 'fulfilment', 'distribution']) {
  test(`TC-EXEC-041 every chart on "${tab}" opens full-size with its content drawn`, async ({ page }) => {
    const t = await stubServices(page);
    await page.goto(`./?tab=${tab}`);
    await settled(page);
    const buttons = page.locator('button[aria-label^="Expand "]');
    const n = await buttons.count();
    expect(n, 'expand buttons on the tab').toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      const button = buttons.nth(i);
      const name = (await button.getAttribute('aria-label')) ?? `#${i}`;
      await button.click();
      const body = page.locator('[data-expanded-body]');
      await expect(body, name).toBeVisible();
      // The tallest drawn thing in the dialog (a chart's svg, a table, a heatmap) has real height.
      const tallest = await body.evaluate((el) => {
        const things = el.querySelectorAll('svg.recharts-surface, table, svg[role="img"], [data-bullet], [data-hbars]');
        const bullets = Array.from(el.querySelectorAll('[data-bullet]')).reduce((t, x) => t + x.getBoundingClientRect().height, 0);
        return Math.max(bullets, ...Array.from(things).map((x) => x.getBoundingClientRect().height));
      });
      expect(tallest, `${name}: content height in the dialog`).toBeGreaterThan(80);
      // Esc closes it. Under load the first press can land before the dialog's
      // key listener is attached, so press again until it closes (or time out).
      await expect(async () => {
        await page.keyboard.press('Escape');
        await expect(body).toHaveCount(0, { timeout: 1500 });
      }, `${name} closes with Esc`).toPass({ timeout: 15_000 });
    }
    expect(realErrors(t)).toEqual([]);
  });
}
