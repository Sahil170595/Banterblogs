import { expect, test } from '@playwright/test';
import { collectErrors } from './consoleErrors';

// The mission page end to end: the fault matrix and its headline are in the
// server HTML, a cell flies on the map, a resumed mission is left unwatched,
// and the notched fence passes its check.

const PAGE = '/projects/systems/mission-governance';

test('the fault matrix and its headline are in the server HTML, before any script runs', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(PAGE);
  await expect(
    page.getByText(/With no telemetry at all, the mission passes its pre-flight check with two warnings and flies all 6 waypoints/),
  ).toBeVisible();
  await expect(page.getByRole('region', { name: 'Each fault and how the flight ends' })).toContainText('home after waypoint 3');
  await expect(page.getByRole('region', { name: 'Each fault and how the flight ends' })).toContainText('check does not test the link');
  await expect(page.getByText('Status: a simulation-phase build.')).toBeAttached();
  await context.close();
});

test('a cell flies; a resumed mission is unwatched; the notched fence passes', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(PAGE);
  const matrix = page.getByRole('region', { name: 'Each fault and how the flight ends', exact: true });
  await matrix
    .getByRole('row', { name: /Estimator fault/ })
    .getByRole('button')
    .nth(1)
    .click();
  await expect(page.getByText('returning to launch: estimator fault', { exact: true })).toBeInViewport();

  await page.getByRole('group', { name: 'When' }).getByText('After a pause and resume').click();
  await expect(page.getByText(/executing at waypoint 2, unwatched/).first()).toBeVisible();

  // the option names itself as this page's own example
  await page.getByRole('radio', { name: 'Notched fence, this page’s example' }).check();
  await expect(page.getByText(/the straight leg between them crosses the notch/)).toBeVisible();

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

// a phone shows each fault as a card: the mid-flight outcome, where stale
// and missing telemetry fly the whole route, is on screen
test('on a phone the outcomes sit inside the screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(PAGE);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  const cells = page.locator('[data-label="Starts after waypoint 2"]');
  await expect(cells.first()).toBeVisible();
  for (const box of await cells.evaluateAll((all) => all.map((cell) => cell.getBoundingClientRect().toJSON()))) {
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(390);
  }
});
