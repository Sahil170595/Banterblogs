import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { collectErrors } from './consoleErrors';

// The send pacing page end to end: the sweep and the flagged sends are in the
// server HTML, seeds step, a sweep row loads, and an export replays.

const PAGE = '/projects/systems/send-pacing';

test('the sweep finding and the flagged sends are in the server HTML, before any script runs', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(PAGE);
  await expect(page.getByText(/Across 1,000 seeds of the source's own replay, twelve messages over two hours, every schedule sends its last two messages/)).toBeVisible();
  await expect(page.getByRole('region', { name: 'Message ledger' }).getByText('sent before it could be typed')).toHaveCount(2);
  await context.close();
});

test('seeds step, a sweep row loads, an export replays', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(PAGE);
  const seed = page.getByLabel('Seed', { exact: true });
  await expect(seed).toHaveValue('7');
  await page.getByRole('button', { name: 'Next seed', exact: true }).click();
  await expect(seed).toHaveValue('8');
  await expect(page.getByRole('region', { name: 'Message ledger' }).getByText('sent before it could be typed')).toHaveCount(2);

  await page.getByRole('button', { name: '12 over 2 hours from 16:00', exact: true }).click();
  await expect(page.getByText(/16:00 to 18:00 UTC/)).toBeVisible();

  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export the replay', exact: true }).click();
  const file = await (await pending).path();
  const exported = JSON.parse(await readFile(file!, 'utf8'));
  expect(exported.replay).toMatchObject({ seed: 8, startHour: 16 });
  await page.getByRole('button', { name: 'Reset to the source replay', exact: true }).click();
  await expect(seed).toHaveValue('7');
  await page.getByLabel('Replay file', { exact: true }).setInputFiles(file!);
  await expect(seed).toHaveValue('8');
  await expect(page.getByText(/16:00 to 18:00 UTC/)).toBeVisible();

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
