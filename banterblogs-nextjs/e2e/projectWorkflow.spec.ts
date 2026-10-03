import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { collectErrors } from './consoleErrors';

// The workflow page end to end: the evidence table is in the server HTML,
// the opening attempt runs when the app scrolls into view, picking an attempt
// runs the executor on the real controls, the wrong room is made by hand, and
// an exported run replays.

const PAGE = '/projects/agents-and-evaluation/workflow-observatory';

const status = (page: Page) => page.getByRole('status', { name: 'Workflow status', exact: true });
const attempt = (page: Page, label: string) => page.getByRole('button', { name: new RegExp(`^${label}`) });

test('the evidence table and its headline are in the server HTML, before any script runs', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(PAGE);
  await expect(page.getByText(/Of these 6 attempts, a success notice claims 3 saved the reservation and Parallax's completion check accepts 5\. One did\./)).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Success notice: done, wrong' })).toHaveCount(2);
  await context.close();
});

test('the opening attempt runs once the app is in view', async ({ page }) => {
  await page.goto(PAGE);
  await expect(status(page)).toContainText('Ready');
  await page.getByRole('region', { name: 'Live completion conditions', exact: true }).scrollIntoViewIfNeeded();
  await expect(status(page)).toContainText('Complete');
  await expect(page.getByRole('row', { name: /Spectral scan North lab Committed/ })).toBeVisible();
});

test('picked attempts run on the real controls; the wrong room is made by hand; a run replays', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(PAGE);

  await attempt(page, 'Notice shown, nothing saved').click();
  await expect(status(page)).toContainText('Failed');
  await expect(page.getByRole('status', { name: 'Fixture notice', exact: true })).toContainText('Reservation saved');
  await expect(page.getByRole('row', { name: /Spectral scan/ })).toHaveCount(0);

  await attempt(page, 'Saves normally').click();
  await expect(status(page)).toContainText('Complete');
  await expect(page.getByRole('row', { name: /Spectral scan North lab Committed/ })).toBeVisible();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export trace', exact: true }).click();
  const file = await (await pending).path();
  expect(file).toBeTruthy();
  const exported = JSON.parse(await readFile(file!, 'utf8'));
  expect(exported.trace.entries).toHaveLength(5);
  expect(exported.trace.status).toBe('complete');
  await page.getByRole('button', { name: 'Reset observatory', exact: true }).click();
  await page.getByLabel('Trace file', { exact: true }).setInputFiles(file!);
  const replay = page.getByRole('region', { name: 'Recomputed event replay', exact: true });
  await expect(replay).toBeVisible();
  await page.getByRole('slider', { name: 'Replay frame' }).fill(String(exported.events.length));
  await expect(replay).toContainText('Conditions met');

  await attempt(page, 'Saved to the wrong room').click();
  await expect(page.getByText(/never picks the wrong room/)).toBeVisible();
  await expect(status(page)).toContainText('Ready');
  await page.getByRole('button', { name: 'Reserve slot', exact: true }).click();
  await page.getByRole('textbox', { name: 'Reservation title', exact: true }).fill('Spectral scan');
  await page.getByRole('combobox', { name: 'Room', exact: true }).selectOption('south');
  await page.getByRole('button', { name: 'Save reservation', exact: true }).click();
  await expect(page.getByRole('row', { name: /Spectral scan South lab Committed/ })).toBeVisible();
  await expect(page.getByRole('status', { name: 'Fixture notice', exact: true })).toContainText('Reservation saved');
  const gate = page.getByRole('region', { name: 'Live completion conditions', exact: true });
  await expect(gate.getByText('Room matches the requested task')).toHaveAttribute('data-met', 'false');

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
