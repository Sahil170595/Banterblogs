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
  await page
    .getByLabel('Import report file', { exact: true })
    .setInputFiles({ name: 'forged.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(forged)) });
  await expect(page.getByRole('status')).toContainText('Not resolved');

  await page.getByRole('button', { name: 'Test synthesis', exact: true }).click();
  await page.getByRole('button', { name: 'Run synthesis', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Reproduces');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

// re-review: opening the diff widened the page to 1799px on desktop and 1691px on a phone
for (const width of [1440, 390]) {
  test(`the diff stays inside the page at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(PAGE);
    await page.getByText('Implementation & replacement diff').click();
    await expect(page.locator('ins').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  });
}

test('on a phone, each patch is a card that leads with its two verdicts, all on screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(PAGE);
  // a smoke and a full verdict for each of the four patches
  const verdicts = page.getByRole('cell').filter({ hasText: /^(Passes|Fails)$/ });
  await expect(verdicts).toHaveCount(8);
  for (const verdict of await verdicts.all()) {
    const box = (await verdict.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
  }
  // the cards' column names, beside each value
  expect(await verdicts.first().evaluate((cell) => getComputedStyle(cell, '::before').content)).toContain('Smoke verdict');
  await page.getByRole('button', { name: 'General repair', exact: true }).click();
  await expect(page.getByRole('status')).toBeInViewport();
  // a phone widens its layout viewport to fit overflowing content, so the width itself is the check
  await page.getByRole('button', { name: 'Test synthesis', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
