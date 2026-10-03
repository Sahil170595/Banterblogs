import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { collectErrors } from './consoleErrors';

// The intake triage page end to end: the counted claims are in the server
// HTML, an example loads into the scorer with its deciding signal, a fixture
// message compares with the source, and an export replays. On a phone each
// signal is a card, so its counts are never cut off.

const PAGE = '/projects/agents-and-evaluation/intake-triage';
const PHONE = { width: 390, height: 844 };

test('the influence table and its headline are in the server HTML, before any script runs', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(PAGE);
  await expect(page.getByText(/Across all 12,672 combinations of them, urgent wording never changes it/)).toBeVisible();
  await expect(page.getByRole('region', { name: 'What each signal can change', exact: true })).toContainText('none exists');
  await context.close();
});

test('on a phone every count shows whole, inside the screen', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto(PAGE);
  const counts = page.getByRole('region', { name: 'What each signal can change' }).getByLabel(/of 12,672 combinations$/);
  await expect(counts).toHaveCount(10);
  for (const cell of await counts.all()) {
    const box = (await cell.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(PHONE.width);
  }
  await expect(page.getByText('8,448', { exact: true }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
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
  await page.getByRole('combobox', { name: /^Start from one of Intakegate's example messages/ }).selectOption('spam');
  await expect(priority).toHaveText('P3');
  await expect(page.getByText(/Same as Intakegate's own scorer: P3, spam\./)).toBeVisible();

  await page.getByText('Export or import the signals and the decision').click();
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
