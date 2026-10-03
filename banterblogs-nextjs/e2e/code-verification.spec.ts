import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { collectErrors } from './consoleErrors';

async function exportReport(page: Page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON report', exact: true }).click();
  const file = await (await pending).path();
  expect(file).toBeTruthy();
  return { file: file!, data: JSON.parse(await readFile(file!, 'utf8')) };
}

test('verification executes assertions and replays recomputed reports', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/work/projects/code-verification');
  await page.getByRole('button', { name: 'Run verification', exact: true }).click();
  const fixed = await exportReport(page);
  expect(fixed.data.resolved).toBe(true);
  expect(fixed.data.counts).toEqual({ repaired: 3, preserved: 3, stillBroken: 0, regressed: 0 });
  await page.getByRole('combobox', { name: 'Implementation', exact: true }).selectOption({ label: 'Example-only repair' });
  await page.getByRole('button', { name: 'Run verification', exact: true }).click();
  expect((await exportReport(page)).data.resolved).toBe(false);
  await page.getByRole('button', { name: 'Reset verifier', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Export JSON report', exact: true })).toBeDisabled();
  await page.getByLabel('Import report file', { exact: true }).setInputFiles(fixed.file);
  expect((await exportReport(page)).data).toEqual(fixed.data);
  await page.getByRole('button', { name: 'Test synthesis', exact: true }).click();
  await page.getByRole('button', { name: 'Run synthesis', exact: true }).click();
  expect((await exportReport(page)).data.resolved).toBe(true);
  await page.getByRole('button', { name: 'Broken assertion', exact: true }).click();
  await page.getByRole('button', { name: 'Run synthesis', exact: true }).click();
  expect((await exportReport(page)).data.resolved).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(errors).toEqual([]);
});
