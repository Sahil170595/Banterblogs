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
  // every action shows whole: no inner box cuts a row off
  const actions = page.getByRole('list', { name: 'Actions' });
  expect(await actions.evaluate((list) => list.scrollHeight <= list.clientHeight)).toBe(true);
  // a phone widens its layout viewport to fit overflowing content, so the width itself is the check
  await page.getByText(/^Run it yourself/).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  expect(errors).toEqual([]);
});

// live QA: on a phone the world and reward a tool call changed sat 950–2,070 px above it, with no feedback
test('on a phone, a tool call says what it did beside the button, and shows the world on request', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(PAGE);
  await page.getByText(/^Run it yourself/).click();
  await page.getByRole('button', { name: 'New episode', exact: true }).click();
  await page.getByRole('button', { name: 'Run read order', exact: true }).click();
  const latest = page.getByRole('status', { name: 'Latest action' });
  await expect(latest).toHaveText(/^#1 Read order: /);
  await expect(latest).toBeInViewport();
  await latest.getByRole('button', { name: 'Show the world and reward', exact: true }).click();
  await expect(page.getByLabel('Total reward')).toBeInViewport();
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
  // live QA: a good import and an export used to say nothing
  await expect(page.getByText(/^Trace replayed: \d+ actions, reward 1\.00\.$/)).toBeVisible();
  expect((await exportEpisode(page)).data).toEqual(completed.data);
  await expect(page.getByText(/^Trace exported as .+\.json\.$/)).toBeVisible();

  const forged = { ...completed.data, final: { ...completed.data.final, replacements: [] } };
  await page
    .getByLabel('Trace file', { exact: true })
    .setInputFiles({ name: 'forged.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(forged)) });
  await expect(page.getByRole('alert').first()).toBeVisible();

  // live QA: an edited reward was replayed without a word
  const rewardEdited = { ...completed.data, reward: { ...completed.data.reward, total: 0.5 } };
  await page
    .getByLabel('Trace file', { exact: true })
    .setInputFiles({ name: 'edited.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(rewardEdited)) });
  await expect(page.getByRole('alert').first()).toHaveText(/the reward receipt does not match the recorded actions/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
