import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { collectErrors } from './consoleErrors';

// The code verification page end to end: the matrix and its smoke verdicts
// are in the server HTML, the full suite rejects the example-only patch,
// and a report replays from its configuration, not its saved verdict.

const PAGE = '/projects/reinforcement-learning/code-verification';

async function exportReport(page: Page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON report', exact: true }).click();
  const file = await (await pending).path();
  expect(file).toBeTruthy();
  return { file: file!, data: JSON.parse(await readFile(file!, 'utf8')) };
}

test('the matrix and its smoke verdicts are in the server HTML, before any script runs', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(PAGE);
  await expect(page.getByText(/On the two-test smoke suite, 3 of 4 patches pass/)).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Suite satisfied');
  await context.close();
});

test('the full suite rejects the example-only patch; a report replays from its configuration', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(PAGE);
  await page.getByRole('radio', { name: /^Full/ }).check();
  await expect(page.getByRole('status')).toContainText('Not resolved');

  await page.getByRole('button', { name: 'General repair', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Resolved on full suite');
  const fixed = await exportReport(page);
  expect(fixed.data.counts).toEqual({ repaired: 3, preserved: 3, stillBroken: 0, regressed: 0 });

  const forged = { ...fixed.data, config: { ...fixed.data.config, candidateId: 'empty' }, resolved: true };
  await page.getByLabel('Import report file', { exact: true }).setInputFiles({ name: 'forged.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(forged)) });
  await expect(page.getByRole('status')).toContainText('Not resolved');

  await page.getByRole('button', { name: 'Test synthesis', exact: true }).click();
  await page.getByRole('button', { name: 'Run synthesis', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Reproduces');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
