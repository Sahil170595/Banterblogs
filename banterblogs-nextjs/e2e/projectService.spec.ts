import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { collectErrors } from './consoleErrors';

// The customer-service page end to end: the board is in the server HTML, a
// row loads its trajectory below, an episode exports and replays exactly,
// and a forged receipt is refused.

const PAGE = '/projects/reinforcement-learning/customer-service';

async function exportEpisode(page: Page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON trace', exact: true }).click();
  const file = await (await pending).path();
  expect(file).toBeTruthy();
  return { file: file!, data: JSON.parse(await readFile(file!, 'utf8')) };
}

test('the board and the wrong refund are in the server HTML, before any script runs', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(PAGE);
  await expect(page.getByText(/10 scripted trajectories, each a fixed sequence of agent actions/)).toBeVisible();
  await expect(page.getByLabel('Total reward')).toHaveText('−0.40');
  await context.close();
});

test('on a phone, every score is on screen and a picked row brings its replay into view', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(PAGE);
  for (const score of await page.locator('button[aria-pressed] span:last-child').all()) {
    const box = (await score.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(390);
  }
  await page.getByRole('button', { name: /^Return and replace: reward 1\.00/ }).click();
  await expect(page.getByLabel('Total reward')).toHaveText('1.00');
  await expect(page.getByRole('heading', { name: 'Damaged desk lamp', exact: true })).toBeInViewport();
  // a phone widens its layout viewport to fit overflowing content, so the width itself is the check
  await page.getByText(/^Run it yourself/).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  expect(errors).toEqual([]);
});

test('a row loads its trajectory; an episode exports, replays and refuses a forgery', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(PAGE);
  await page.getByRole('button', { name: /^Return and replace: reward 1\.00/ }).click();
  await expect(page.getByLabel('Total reward')).toHaveText('1.00');
  await page.getByText(/^Run it yourself/).click();
  const completed = await exportEpisode(page);
  expect(completed.data.reward.completed).toBe(true);
  expect(completed.data.final.replacements).toHaveLength(1);

  await page.getByRole('button', { name: 'New episode', exact: true }).click();
  expect((await exportEpisode(page)).data.events).toHaveLength(0);
  await page.getByLabel('Trace file', { exact: true }).setInputFiles(completed.file);
  expect((await exportEpisode(page)).data).toEqual(completed.data);

  const forged = { ...completed.data, final: { ...completed.data.final, replacements: [] } };
  await page
    .getByLabel('Trace file', { exact: true })
    .setInputFiles({ name: 'forged.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(forged)) });
  await expect(page.getByRole('alert').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
