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
  await expect(
    page.getByText(/Here it drops every filter, reports “ready” and returns 4 notes, two of which do not match the request/),
  ).toBeVisible();
  await expect(page.getByRole('region', { name: 'Search results' })).toContainText('no, outside the request');
  // the hard criterion is in the request, apart from the filters relaxation drops
  await expect(page.getByText('contains “cache”', { exact: true })).toBeVisible();
  await expect(page.getByText('hard, never dropped', { exact: true })).toBeVisible();
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
  await expect(results).toBeInViewport();

  // the query, the scores and the files are under the hood
  await page.getByText('Edit the query, see the scores, export a run', { exact: true }).click();
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

// live QA: on a phone an edit changed results above and scores below, and nothing in view
test('on a phone an edit to the query shows its verdict beside the form', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(PAGE);
  await page.getByText('Edit the query, see the scores, export a run', { exact: true }).click();
  const hard = page.getByLabel('Hard criteria', { exact: true });
  await hard.scrollIntoViewIfNeeded();
  await hard.fill('');
  await expect(page.getByTestId('query-verdict')).toBeInViewport();
  // the field select keeps its word whole, beside the operator
  // a label's text includes its options, so name the select by role
  const field = page.getByRole('combobox', { name: 'Filter 1 field', exact: true });
  await field.selectOption('collection');
  expect(await field.evaluate((select) => select.scrollWidth <= select.clientWidth + 1)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

// a phone shows every ladder row and result as a card: the column that
// carries the finding is on screen, not scrolled out of a wide table
test('on a phone the finding columns sit inside the screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(PAGE);
  for (const label of ['Match the request', 'Matches the request']) {
    const cells = page.locator(`[data-label="${label}"]`);
    await expect(cells.first()).toBeVisible();
    for (const box of await cells.evaluateAll((all) => all.map((cell) => cell.getBoundingClientRect().toJSON()))) {
      expect(box.left, label).toBeGreaterThanOrEqual(0);
      expect(box.right, label).toBeLessThanOrEqual(390);
    }
  }
});
