import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { collectErrors } from './consoleErrors';

// The offline policy evaluation page end to end: the claim and its control
// are in the server HTML, the presets change the verdict, a structural
// support gap withholds the target, and export reproduces the applied run.

const PAGE = '/projects/reinforcement-learning/offline-policy-evaluation';

async function openUnderTheHood(page: Page) {
  const hood = page.locator('details', { hasText: 'Under the hood' });
  if (!(await hood.evaluate((details) => (details as HTMLDetailsElement).open))) await hood.locator('summary').click();
}

async function exported(page: Page) {
  await openUnderTheHood(page);
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export evaluation JSON', exact: true }).click();
  const file = await (await pending).path();
  expect(file).toBeTruthy();
  return JSON.parse(await readFile(file!, 'utf8'));
}

const verdict = (page: Page) => page.getByRole('status').first();

test('the claim and its control are in the server HTML, before any script runs', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(PAGE);
  await expect(verdict(page)).toContainText('The target beats the logger by 0.27');
  await expect(verdict(page)).toContainText('gets 65% of that gain');
  await context.close();
});

test('presets move the verdict, a support gap withholds the target, export replays the run', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(PAGE);
  const first = await exported(page);
  expect(first.schema).toBe('offline-policy-evaluation/v1');

  await page.getByRole('radio', { name: 'Gain dropped', exact: true }).check();
  await expect(verdict(page)).toContainText('No measurable difference from the logger');

  await page.getByRole('radio', { name: 'None at low load', exact: true }).check();
  await expect(verdict(page)).toContainText('Withheld: part of the target has no logged evidence.');
  const withheld = await exported(page);
  expect(withheld.comparisons[0].result.normalized).toBeNull();
  expect(withheld.config.scenario).toBe('gap');

  await page.getByRole('button', { name: 'Reset evaluation', exact: true }).click();
  expect(await exported(page)).toEqual(first);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('on a phone, the support table shows every load’s Intensify cell without a sideways scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(PAGE);
  await openUnderTheHood(page);
  const intensify = page.getByRole('region', { name: 'Action support' }).locator('td[data-label="Intensify"]');
  await expect(intensify).toHaveCount(3);
  for (const cell of await intensify.all()) {
    await cell.scrollIntoViewIfNeeded();
    const box = (await cell.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
