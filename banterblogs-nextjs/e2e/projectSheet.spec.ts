import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { collectErrors } from './consoleErrors';

// The spreadsheet page end to end: the labelled graph and its score are in
// the server HTML, the policy and review controls move the score, edits
// recompute through the dependency graph, and a replay recomputes. On a
// phone the sheets stack, so every cell and its label is on screen.

const PAGE = '/projects/agents-and-evaluation/spreadsheet-reasoning';
const PHONE = { width: 390, height: 844 };
const HOOD = 'Edit the workbook, review a cell, the illustrative ballots, export and replay';

async function exportWorkbook(page: Page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON', exact: true }).click();
  const file = await (await pending).path();
  expect(file).toBeTruthy();
  return { file: file!, data: JSON.parse(await readFile(file!, 'utf8')) };
}

test('the labelled graph and its score are in the server HTML, before any script runs', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(PAGE);
  await expect(page.getByText(/With balanced votes the rules find 2 of 2 final values/)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Report!B4, .*not final in the key$/ })).toBeVisible();
  await context.close();
});

test('on a phone every cell of the graph, labels included, sits inside the screen', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto(PAGE);
  const cells = page.getByRole('region', { name: 'Workbook dependency graph' }).getByRole('button');
  await expect(cells).toHaveCount(11);
  for (const cell of await cells.all()) {
    const box = (await cell.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(PHONE.width);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('controls move the score; edits recompute; a replay recomputes', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(PAGE);
  await page.getByRole('radio', { name: 'Drop Report!B4', exact: true }).check();
  await expect(page.getByRole('button', { name: /^Report!B4, .*labelled intermediate$/ })).toBeVisible();

  await page.getByText(HOOD).click();
  const initial = await exportWorkbook(page);
  await page.getByRole('button', { name: 'Inspect Inputs!B2', exact: true }).click();
  await page.getByRole('textbox', { name: 'Value or formula', exact: true }).fill('240');
  await page.getByRole('button', { name: 'Recalculate', exact: true }).click();
  const revenue = page.getByRole('row').filter({ has: page.getByRole('button', { name: 'Inspect Calc!B2', exact: true }) });
  await expect(revenue).toContainText('2,880');
  const changed = await exportWorkbook(page);

  await page.getByRole('button', { name: 'Reset workbook', exact: true }).click();
  await page.getByLabel('JSON replay file', { exact: true }).setInputFiles(changed.file);
  expect((await exportWorkbook(page)).data).toEqual(changed.data);
  expect(changed.data).not.toEqual(initial.data);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
