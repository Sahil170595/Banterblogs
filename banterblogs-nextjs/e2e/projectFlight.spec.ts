import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { collectErrors } from './consoleErrors';

// The flight routing page end to end: the grid is on screen before any
// script runs, a square replays its world, decisions step, rewind and
// export real engine state, and the projects' first URL still lands here.

const PAGE = '/projects/reinforcement-learning/flight-routing';

async function exportedTrace(page: Page) {
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

  await page.getByRole('group', { name: /^Nonstop first/ }).getByRole('button', { name: /^World 1, seed 42/ }).click();
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

test('the first URL under /work redirects here', async ({ page }) => {
  const response = await page.goto('/work/projects/flight-routing');
  expect(new URL(page.url()).pathname).toBe(PAGE);
  expect(response?.status()).toBe(200);
});
