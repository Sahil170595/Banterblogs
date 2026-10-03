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
  await expect(page.getByText(/With no telemetry at all, it passes the pre-flight check with two warnings and flies all 6 waypoints/)).toBeVisible();
  await expect(page.getByRole('region', { name: 'Each fault and how the flight ends' })).toContainText('home after waypoint 3');
  await context.close();
});

test('a cell flies; a resumed mission is unwatched; the notched fence passes', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(PAGE);
  const matrix = page.getByRole('region', { name: 'Each fault and how the flight ends', exact: true });
  await matrix.getByRole('row', { name: /Estimator fault/ }).getByRole('button').nth(1).click();
  await expect(page.getByText(/rtl · degraded\.estimator/)).toBeVisible();

  await page.getByRole('group', { name: 'When' }).getByText('After a pause and resume').click();
  await expect(page.getByText(/executing at waypoint 2, unwatched/).first()).toBeVisible();

  await page.getByRole('group', { name: 'Route' }).getByText('Notched fence').click();
  await expect(page.getByText(/the straight leg between them crosses the notch/)).toBeVisible();

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
