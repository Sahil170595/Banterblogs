import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { collectErrors } from './consoleErrors';

// The flight routing page end to end: the grid is on screen before any
// script runs, a square replays its world, decisions step, rewind and
// export real engine state, and the projects' first URL still lands here.

const PAGE = '/projects/reinforcement-learning/flight-routing';
// WCAG 2.5.8's minimum target size, in CSS pixels
const MIN_TAP_TARGET = 24;

async function exportedTrace(page: Page) {
  const hood = page.locator('details', { hasText: 'Under the hood' });
  if (!(await hood.evaluate((details) => (details as HTMLDetailsElement).open))) await hood.locator('summary').click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON trace', exact: true }).click();
  const file = await (await pending).path();
  expect(file).toBeTruthy();
  return JSON.parse(await readFile(file!, 'utf8'));
}

const status = (page: Page) => page.getByTestId('episode-status');

test('the finding is in the server HTML, before any script runs', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(PAGE);
  await expect(page.getByRole('group', { name: /^Nonstop first: 0 of 64/ })).toBeVisible();
  await expect(page.getByRole('group', { name: /^Deadline lookahead: 40 of 64/ })).toBeVisible();
  await context.close();
});

test('a square replays its world; decisions step, rewind and export real state', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(PAGE);
  await expect(status(page)).toHaveText('Arrived on time');

  await page
    .getByRole('group', { name: /^Nonstop first/ })
    .getByRole('button', { name: /^World 1, seed 42/ })
    .click();
  await expect(status(page)).toHaveText('Arrived late');

  await page.getByRole('button', { name: 'Restart this world', exact: true }).click();
  await expect(status(page)).toHaveText('In progress');
  await page.getByRole('radio', { name: 'Choose F2 to DEN', exact: true }).check();
  await page.getByRole('button', { name: 'Take F2', exact: true }).click();
  const first = await exportedTrace(page);
  expect(first.version).toBe('flight-routing.trace.v1');
  expect(first.episode.legs).toHaveLength(1);
  expect(first.comparison.count).toBe(64);

  await page.getByRole('button', { name: 'Let the policy finish', exact: true }).click();
  await expect(status(page)).not.toHaveText('In progress');
  await page.getByRole('button', { name: 'Rewind one decision', exact: true }).click();
  expect((await exportedTrace(page)).episode).toEqual(first.episode);

  await page.getByRole('radio', { name: /09:00/ }).check();
  await expect(page.getByRole('group', { name: /^Nonstop first: 55 of 64/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('a square below the fold brings its replay into view', async ({ page }) => {
  await page.goto(PAGE);
  const replay = page.getByRole('region', { name: /^Replay: world/ });
  await page
    .getByRole('group', { name: /^Greedy next arrival/ })
    .getByRole('button', { name: /^World 5,/ })
    .click();
  await expect(replay).toHaveAccessibleName('Replay: world 5 of 64');
  await expect(replay.getByRole('heading', { level: 3 })).toBeInViewport();
});

// live QA: Enter on a square scrolled the replay into view and left the focus ring off screen
test('a square chosen from the keyboard takes focus to its replay', async ({ page }) => {
  await page.goto(PAGE);
  await page
    .getByRole('group', { name: /^Greedy next arrival/ })
    .getByRole('button', { name: /^World 1,/ })
    .focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  const heading = page.getByRole('region', { name: /^Replay: world/ }).getByRole('heading', { level: 3 });
  await expect(heading).toHaveText(/^World 2/);
  await expect(heading).toBeFocused();
  await expect(heading).toBeInViewport();
});

test('the exported file is named for the trip, and records who made each decision', async ({ page }) => {
  await page.goto(PAGE);
  await page.getByRole('button', { name: 'Restart this world', exact: true }).click();
  // the row's third cell, not its radio: the whole row chooses
  await page.getByRole('region', { name: 'Bookable flights' }).getByRole('row', { name: /F1/ }).getByRole('cell').nth(2).click();
  await page.getByRole('button', { name: 'Take F1', exact: true }).click();
  const hood = page.locator('details', { hasText: 'Under the hood' });
  await hood.locator('summary').click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON trace', exact: true }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('flight-routing-sfo-to-jfk-mixed-seed-42-deadline-lookahead-with-your-choices.json');
  const trace = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(trace.replay.decisions).toEqual([{ flight: 'F1', by: 'your choice' }]);
  await expect(page.getByRole('status', { name: 'Export' })).toHaveText('Trace exported.');
});

test('on a phone, a world square is big enough to tap', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(PAGE);
  const square = (await page.getByRole('group', { name: /^Nonstop first/ }).getByRole('button', { name: /^World 1,/ }).boundingBox())!;
  expect(square.width).toBeGreaterThanOrEqual(MIN_TAP_TARGET);
  expect(square.height).toBeGreaterThanOrEqual(MIN_TAP_TARGET);
});

test('on a phone, every bookable flight shows its chance of making the deadline without a sideways scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(PAGE);
  await page.getByRole('button', { name: 'Restart this world', exact: true }).click();
  const chances = page.getByRole('region', { name: 'Bookable flights' }).locator('td[data-label="Chance of making the deadline"]');
  await expect(chances.first()).toBeVisible();
  for (const cell of await chances.all()) {
    const box = (await cell.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

// re-review: the formula's last term scrolled out of a phone's view, so the visible formula was wrong
test('on a phone the reward formula shows whole, with no sideways scroll inside it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(PAGE);
  const formula = page.locator('pre', { hasText: '/ horizon' });
  await formula.scrollIntoViewIfNeeded();
  expect(await formula.evaluate((pre) => pre.scrollWidth <= pre.clientWidth)).toBe(true);
});

test('the first URL under /work redirects here', async ({ page }) => {
  const response = await page.goto('/work/projects/flight-routing');
  expect(new URL(page.url()).pathname).toBe(PAGE);
  expect(response?.status()).toBe(200);
});
