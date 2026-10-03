import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { collectErrors } from './consoleErrors';

// The workflow page end to end: the evidence table is in the server HTML,
// the opening attempt runs when the app scrolls into view, picking an attempt
// runs the executor on the real controls, the wrong room is made by hand, and
// an exported run replays. On a phone the table stacks into one card per
// attempt, so the committed record is never scrolled out of sight.

const PAGE = '/projects/agents-and-evaluation/workflow-observatory';
const PHONE = { width: 390, height: 844 };

const status = (page: Page) => page.getByRole('status', { name: 'Workflow status', exact: true });
const attempt = (page: Page, label: string) => page.getByRole('button', { name: new RegExp(`^${label}`) });

test('the evidence table and its headline are in the server HTML, before any script runs', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(PAGE);
  await expect(page.getByText(/6 attempts to book North lab for “Spectral scan”, and only one saved the booking that was asked for\. Only the completion gate gets every attempt right\./)).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Success notice: done, wrong' })).toHaveCount(2);
  await context.close();
});

test('the opening attempt runs once the app is in view', async ({ page }) => {
  await page.goto(PAGE);
  await expect(status(page)).toContainText('Ready');
  await page.getByRole('region', { name: 'Completion gate', exact: true }).scrollIntoViewIfNeeded();
  await expect(status(page)).toContainText('Done');
  await expect(page.getByRole('row', { name: /Spectral scan North lab Committed/ })).toBeVisible();
});

test('on a phone every attempt shows what it saved without a sideways scroll', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto(PAGE);
  const records = page.getByRole('region', { name: 'What each kind of evidence says' }).getByRole('cell', { name: /Saved as asked: (yes|none|.*wrong)/ });
  await expect(records).toHaveCount(6);
  for (const cell of await records.all()) {
    const box = (await cell.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(PHONE.width);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('picked attempts run on the real controls; the wrong room is made by hand; a run replays', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(PAGE);

  await attempt(page, 'Notice shown, nothing saved').click();
  await expect(status(page)).toContainText('Not done: no committed record');
  await expect(page.getByRole('status', { name: 'Fixture notice', exact: true })).toContainText('Reservation saved');
  await expect(page.getByRole('row', { name: /Spectral scan/ })).toHaveCount(0);

  await attempt(page, 'Saves normally').click();
  await expect(status(page)).toContainText('Done');
  await expect(page.getByRole('row', { name: /Spectral scan North lab Committed/ })).toBeVisible();
  await page.getByText('Settings, the action plan and the step-by-step trace').click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export trace', exact: true }).click();
  const file = await (await pending).path();
  expect(file).toBeTruthy();
  const exported = JSON.parse(await readFile(file!, 'utf8'));
  expect(exported.trace.entries).toHaveLength(5);
  expect(exported.trace.status).toBe('complete');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
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
  const gate = page.getByRole('region', { name: 'Completion gate', exact: true });
  await expect(gate.getByText('Room matches the requested task')).toHaveAttribute('data-met', 'false');

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
