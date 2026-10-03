import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { collectErrors } from './consoleErrors';

async function exportWorkbook(page: Page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON', exact: true }).click();
  const file = await (await pending).path();
  expect(file).toBeTruthy();
  return { file: file!, data: JSON.parse(await readFile(file!, 'utf8')) };
}

test('spreadsheet edits recompute dependencies and replay the applied workbook', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/work/projects/spreadsheet-reasoning');
  const initial = await exportWorkbook(page);
  await page.getByRole('button', { name: 'Inspect Inputs!B2', exact: true }).click();
  await page.getByRole('textbox', { name: 'Value or formula', exact: true }).fill('240');
  await expect(page.getByRole('button', { name: 'Export JSON', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Recalculate', exact: true }).click();
  const changed = await exportWorkbook(page);
  expect(changed.data.session.workbook.cells.find((cell: { sheet: string; address: string }) => cell.sheet === 'Inputs' && cell.address === 'B2').input).toBe('240');
  const revenue = page.getByRole('row').filter({ has: page.getByRole('button', { name: 'Inspect Calc!B2', exact: true }) });
  await expect(revenue).toContainText('2,880');
  await page.getByRole('button', { name: 'Reset workbook', exact: true }).click();
  expect((await exportWorkbook(page)).data).toEqual(initial.data);
  await page.getByLabel('JSON replay file', { exact: true }).setInputFiles(changed.file);
  expect((await exportWorkbook(page)).data).toEqual(changed.data);
  await expect(revenue).toContainText('2,880');
  await page.getByRole('combobox', { name: 'Synthetic workbook', exact: true }).selectOption('broken');
  await expect(page.getByRole('cell', { name: 'Error', exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Inspect Calc!B2', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Cycle detected:' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(errors).toEqual([]);
});
