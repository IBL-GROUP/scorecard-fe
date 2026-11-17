// Story S5 journeys: portal sign-in, Overview tiles, drill paths (PRD 5.4).
import { expect, test } from '@playwright/test';
import { realErrors, settled, stubServices, TICKET } from './stubs';

/** Overview tiles and where "Open in …" takes them (PRD 5.4, OverviewPage goTo). */
const TILE_TARGETS: [tile: string, tab: string, focus: string][] = [
  ['EX-01', 'revenue', 'RV-02'],
  ['EX-02', 'revenue', 'RV-02'],
  ['EX-03', 'revenue', 'RV-04'],
  ['EX-04', 'revenue', 'IN-03'],
  ['EX-05', 'inventory', 'IN-10'],
  ['EX-06', 'fulfilment', 'OP-01'],
  ['EX-07', 'inventory', 'IN-01'],
  ['EX-08', 'revenue', 'IN-08'],
  ['EX-09', 'distribution', 'DH-01'],
];

test('TC-S5-04 TC-EXEC-023 portal ticket signs in and lands on the Executive Overview', async ({ page }) => {
  const t = await stubServices(page, { signedIn: false });
  await page.goto(`./?t=${TICKET}`);
  await expect(page.getByRole('tablist', { name: 'Dashboard tabs' })).toBeVisible();
  await settled(page);
  expect(t.redeemed).toEqual([TICKET]);
  // The ticket is taken out of the address bar (FEAT-AUTH).
  expect(new URL(page.url()).searchParams.has('t')).toBe(false);
  await expect(page.locator('[data-kpi="EX-01"]').first()).toBeVisible();
  expect(realErrors(t)).toEqual([]);
});

test('TC-S5-04 TC-EXEC-023 without a session or ticket the browser is sent to the portal sign-in', async ({ page }) => {
  await stubServices(page, { signedIn: false });
  const toPortal = page.waitForRequest((r) => r.url().startsWith('http://portal.e2e.invalid/login'));
  await page.goto('./');
  const req = await toPortal;
  expect(new URL(req.url()).searchParams.get('redirect')).toContain('/scorecard-dashboard/');
});

for (const [tile, tab, focus] of TILE_TARGETS) {
  test(`TC-S5-04 TC-EXEC-024 Overview tile ${tile} opens ${tab} at ${focus}; Back returns to the Overview`, async ({ page }) => {
    const t = await stubServices(page);
    await page.goto('./');
    await settled(page);
    // A tile is clickable once its figure has loaded: its title becomes a button.
    await page.locator(`[data-kpi="${tile}"][data-tile]`).getByRole('button', { name: /: details$/ }).click();
    await page.getByRole('button', { name: /^Open in / }).click();
    await expect(page).toHaveURL(new RegExp(`tab=${tab}&focus=${focus}`));
    await settled(page);
    await expect(page.locator(`[data-kpi~="${focus}"]`).first()).toBeInViewport({ ratio: 0.1 });
    await page.goBack();
    await expect(page).not.toHaveURL(/tab=/);
    await expect(page.locator(`[data-kpi="${tile}"]`).first()).toBeVisible();
    expect(realErrors(t)).toEqual([]);
  });
}

test('TC-S5-05 TC-EXEC-024 an exception row (EX-10) opens its domain tab, with the class/branch/channel as a chip', async ({ page }) => {
  await stubServices(page);
  await page.goto('./');
  await settled(page);
  const rows = page.locator('[data-kpi="EX-10"] [role="link"]');
  // The list is ranked once every figure is in ("Checking the figures…" until then).
  await expect(rows.first()).toBeVisible();
  const n = await rows.count();
  // One full Overview load per row: allow 25 s each.
  test.setTimeout(60_000 + n * 25_000);
  for (let i = 0; i < n; i++) {
    await page.goto('./');
    await settled(page);
    await expect(rows.nth(i)).toBeVisible();
    await rows.nth(i).click();
    // Rows about a class, branch or channel open its sheet first; "Filter … to this" goes to the tab with a chip.
    const filter = page.getByRole('button', { name: /^Filter / }).first();
    const viaSheet = await filter.isVisible({ timeout: 2_000 }).catch(() => false);
    if (viaSheet) await filter.click();
    await expect(page).toHaveURL(/tab=(revenue|inventory|fulfilment|distribution)/);
    if (viaSheet) await expect(page.getByRole('button', { name: 'Clear this filter' })).toBeVisible();
  }
});

test('TC-S5-05 TC-EXEC-024 heatmap shift-click (IN-10) opens Inventory Days (IN-17) for that branch and class', async ({ page }) => {
  await stubServices(page);
  await page.goto('./?tab=inventory');
  await settled(page);
  const cell = page.locator('[data-kpi~="IN-10"] td[title^="Click for details"]').first();
  await cell.click({ modifiers: ['Shift'] });
  const detail = page.locator('[data-detail="inv-days"]');
  await expect(detail.locator('> button[aria-expanded]')).toHaveAttribute('aria-expanded', 'true');
  await expect(detail.getByRole('button', { name: /show all/i })).toBeVisible();
});

test('TC-S5-05 TC-EXEC-024 Pareto bar (OP-05) opens Dispatch Vs Order (OP-14) filtered to that material', async ({ page }) => {
  await stubServices(page);
  await page.goto('./?tab=fulfilment');
  await settled(page);
  // The Pareto chart is in the Orders topic's Details sheet (FR-EXEC-025).
  await page.getByRole('button', { name: 'Orders: details', exact: true }).click();
  await page.locator('[data-kpi~="OP-05"] .recharts-bar-rectangle').first().click();
  const detail = page.locator('[data-detail="dispatch"]');
  await expect(detail.locator('> button[aria-expanded]')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: 'Clear this filter' })).toContainText('Material');
});

test('TC-S5-05 TC-EXEC-024 branch bar on Distribution sets a branch chip, and the chip can be cleared', async ({ page }) => {
  await stubServices(page);
  await page.goto('./?tab=distribution');
  await settled(page);
  // Compliance by Branch is in the Reporting topic's Details sheet (FR-EXEC-025).
  await page.getByRole('button', { name: 'Reporting: details', exact: true }).click();
  // Sales Pulse bars (FR-EXEC-045): each branch is a row.
  await page.locator('[data-kpi~="DH-05"] [data-hbar]').first().click();
  await page.getByRole('button', { name: 'Close details' }).click();
  const remove = page.getByRole('button', { name: 'Clear this filter' });
  await expect(remove).toBeVisible();
  await remove.click();
  await expect(remove).toHaveCount(0);
});

for (const tab of ['revenue', 'inventory', 'fulfilment', 'distribution']) {
  test(`TC-S5-05 TC-EXEC-024 every "View details" on ${tab} expands its Operational Detail table`, async ({ page }) => {
    await stubServices(page);
    await page.goto(`./?tab=${tab}`);
    await settled(page);
    // At least one Zone 4 section is open and on screen after each click.
    const expanded = page.locator('[data-detail] > button[aria-expanded="true"]').first();
    const close = page.getByRole('button', { name: 'Close details' });
    // A link on a panel opens the Details sheet holding its table (FR-EXEC-025).
    const onPanels = page.locator('[data-topic]').getByRole('button', { name: 'View details', exact: true });
    const n = await onPanels.count();
    for (let i = 0; i < n; i++) {
      await onPanels.nth(i).click();
      await expect(expanded).toBeVisible();
      await close.click();
    }
    // Links inside each Details sheet.
    const sheets = page.locator('[data-kpi-more]');
    const m = await sheets.count();
    for (let j = 0; j < m; j++) {
      await sheets.nth(j).click();
      const inSheet = page.locator('[data-topic-sheet]').getByRole('button', { name: 'View details', exact: true });
      const k = await inSheet.count();
      for (let i = 0; i < k; i++) {
        await inSheet.nth(i).click();
        await expect(expanded).toBeVisible();
      }
      await close.click();
    }
  });
}

for (const [w, h] of [
  [1920, 1080],
  [1440, 900],
] as const) {
  test(`TC-EXEC-032 at ${w}×${h} every tab fits the screen; each Details sheet opens with its items and closes with Esc`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: w, height: h });
    const t = await stubServices(page);
    for (const tab of ['overview', 'revenue', 'inventory', 'fulfilment', 'distribution']) {
      await page.goto(`./?tab=${tab}`);
      await settled(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollHeight - document.documentElement.clientHeight);
      expect(overflow, `${tab} scrolls by ${overflow}px`).toBeLessThanOrEqual(1);
      const buttons = page.locator('[data-kpi-more]');
      const n = await buttons.count();
      for (let i = 0; i < n; i++) {
        const ids = ((await buttons.nth(i).getAttribute('data-kpi-more')) ?? '').split(/\s+/).filter(Boolean);
        await buttons.nth(i).click();
        const sheet = page.locator('[data-topic-sheet]');
        await expect(sheet).toBeVisible();
        for (const id of ids) await expect(sheet.locator(`[data-kpi~="${id}"]`).first()).toBeAttached();
        await page.keyboard.press('Escape');
        await expect(sheet).toHaveCount(0);
      }
    }
    expect(realErrors(t)).toEqual([]);
  });
}
