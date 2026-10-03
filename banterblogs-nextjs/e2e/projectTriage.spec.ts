import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { collectErrors } from './consoleErrors';

// The intake triage page end to end: the counted claims are in the server
// HTML, an example loads into the scorer with its deciding signal, a fixture
// message compares with the source, and an export replays.

const PAGE = '/projects/agents-and-evaluation/intake-triage';

test('the influence table and its headline are in the server HTML, before any script runs', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(PAGE);
  await expect(page.getByText(/Across all 12,672 of their combinations, urgent wording changes the priority in 0/)).toBeVisible();
  await expect(page.getByRole('region', { name: 'What each signal can change', exact: true })).toContainText('none exists');
  await context.close();
});

test('an example loads with its deciding signal; a fixture compares with the source; an export replays', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(PAGE);
  const priority = page.getByLabel('Priority', { exact: true });
  await expect(priority).toHaveText('P1');

  await page.getByRole('button', { name: /Load the example for Concern is about caregiving/ }).click();
  await expect(priority).toHaveText('P1');
  await page.getByRole('group', { name: 'Concern is about caregiving' }).getByText('Yes').click();
  await expect(priority).toHaveText('P0');

  // a select's name carries its current option, so match the label's start
  await page.getByRole('combobox', { name: /^Start from a fixture message/ }).selectOption('spam');
  await expect(priority).toHaveText('P3');
  await expect(page.getByText(/Intakegate's own scorer gave this message P3, spam: the same\./)).toBeVisible();

  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export signals and decision', exact: true }).click();
  const file = await (await pending).path();
  const exported = JSON.parse(await readFile(file!, 'utf8'));
  expect(exported.decision.urgency).toBe('P3');
  await page.getByRole('button', { name: 'Reset to the opening message', exact: true }).click();
  await expect(priority).toHaveText('P1');
  await page.getByLabel('Signals file', { exact: true }).setInputFiles(file!);
  await expect(priority).toHaveText('P3');

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
