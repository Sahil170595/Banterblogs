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
  await expect(verdict(page)).toContainText('On its face the target beats the logger by 0.27');
  await expect(verdict(page)).toContainText('gets 65% of that gain');
  await expect(verdict(page)).toContainText('target − control, is 0.10 (paired 95% interval 0.03 to 0.17)');
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

// live QA: Chrome's accessibility tree named none of the six sliders
test('every settings slider has its label as its name', async ({ page }) => {
  await page.goto(PAGE);
  await openUnderTheHood(page);
  const names = ['Intervention probability', 'Load responsiveness', 'Blend toward the logger', 'Gain coefficient', 'Harm penalty', 'Discount'];
  for (const name of names) await expect(page.getByRole('slider', { name, exact: true })).toBeVisible();
});

// live QA: the outermost axis labels sat off their gridlines, the rules poked out of their tracks, and the ESS tracks differed in length
test('on a phone, the charts line up: labels under gridlines, rules inside tracks, equal ESS tracks', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(PAGE);
  const forest = page.getByRole('figure', { name: /Estimated discounted return/ });
  const row = forest.locator('[data-row="target"]');
  const lines = await row.locator('[data-tick]').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().left));
  const labels = await forest
    .locator('[aria-hidden="true"] [data-tick]')
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect()).map((box) => box.left + box.width / 2));
  expect(labels).toHaveLength(lines.length);
  labels.forEach((x, i) => expect(Math.abs(x - lines[i])).toBeLessThanOrEqual(1));
  const [rule, track] = await row
    .locator('[data-rule="logger"]')
    .evaluate((el) => [el.getBoundingClientRect(), el.parentElement!.getBoundingClientRect()].map((box) => ({ top: box.top, bottom: box.bottom })));
  expect(rule.top).toBeGreaterThanOrEqual(track.top);
  expect(rule.bottom).toBeLessThanOrEqual(track.bottom);

  await openUnderTheHood(page);
  const widths = await page
    .locator('figure', { hasText: 'Trajectories the weights really use' })
    .locator('li > span:nth-child(2)')
    .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().width)));
  expect(widths.length).toBeGreaterThan(1);
  expect(new Set(widths).size).toBe(1);
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
