import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { collectErrors } from './consoleErrors';

// The staged search page end to end: the ladder is in the server HTML, a
// ladder row runs in the pipeline, a query edit redraws the ladder, and an
// export replays.

const PAGE = '/projects/systems/staged-search';

test('the ladder and its headline are in the server HTML, before any script runs', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(PAGE);
  await expect(page.getByText(/drops every filter it was given and reports ready with 4 results, two of which break the request/)).toBeVisible();
  await expect(page.getByRole('region', { name: 'Search results' })).toContainText('outside the request');
  await context.close();
});

test('a ladder row runs below; an edit redraws the ladder; an export replays', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(PAGE);
  const results = page.getByRole('region', { name: 'Search results', exact: true });
  const ladder = page.getByRole('region', { name: 'The same search at every relaxation threshold', exact: true });
  await expect(results).toContainText('Ready');

  await ladder.getByRole('button', { name: /^1 to 3/ }).click();
  await expect(results).toContainText('Shortfall');
  await expect(results).toContainText('No filter dropped.');

  // with no filters there is nothing to relax: one row, open-ended
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Remove filter 1', exact: true }).click();
  await expect(ladder.getByRole('row')).toHaveCount(2);

  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export the run', exact: true }).click();
  const file = await (await pending).path();
  const exported = JSON.parse(await readFile(file!, 'utf8'));
  expect(exported.query.filters).toEqual([]);
  await page.getByRole('button', { name: 'Reset to the source example', exact: true }).click();
  await expect(ladder.getByRole('row')).toHaveCount(4);
  await page.getByLabel('Run file', { exact: true }).setInputFiles(file!);
  await expect(ladder.getByRole('row')).toHaveCount(2);

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
