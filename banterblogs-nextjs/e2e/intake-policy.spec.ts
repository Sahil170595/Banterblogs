import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { collectErrors } from './consoleErrors';

async function exportResult(page: Page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export applied result', exact: true }).click();
  const file = await (await pending).path();
  expect(file).toBeTruthy();
  return { file: file!, data: JSON.parse(await readFile(file!, 'utf8')) };
}

test('intake safety overrides operational priority and receipts replay applied state', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/work/projects/intake-policy');
  const baseline = await exportResult(page);
  await page.getByRole('combobox', { name: 'Synthetic case', exact: true }).selectOption('flagged');
  expect((await exportResult(page)).data).toEqual(baseline.data);
  await page.getByRole('button', { name: 'Evaluate', exact: true }).click();
  await expect(page.getByLabel('Applied priority', { exact: true })).toHaveText('P0');
  await expect(page.getByLabel('Applied operational score', { exact: true })).toHaveText('Bypassed');
  const flagged = await exportResult(page);
  await page.getByRole('button', { name: 'Reset case and policy', exact: true }).click();
  expect((await exportResult(page)).data).toEqual(baseline.data);
  await page.getByLabel('Receipt file', { exact: true }).setInputFiles(flagged.file);
  await expect(page.getByLabel('Applied priority', { exact: true })).toHaveText('P0');
  expect((await exportResult(page)).data).toEqual(flagged.data);
  await page.getByRole('combobox', { name: 'Synthetic case', exact: true }).selectOption('conflict');
  await page.getByRole('button', { name: 'Evaluate', exact: true }).click();
  await expect(page.getByText('Yes; reconciliation needed', { exact: true })).toBeVisible();
  await expect(page.getByText('0 external effects', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(errors).toEqual([]);
});
