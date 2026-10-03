import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { collectErrors } from './consoleErrors';

async function exportResult(page: Page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export applied evaluation JSON', exact: true }).click();
  const file = await (await pending).path();
  expect(file).toBeTruthy();
  return JSON.parse(await readFile(file!, 'utf8'));
}

test('offline evaluation preserves applied results, exposes support gaps, and resets reproducibly', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/work/projects/offline-policy-evaluation');
  const first = await exportResult(page);
  const settings = page.getByRole('button', { name: 'Evaluation settings', exact: true });
  if (await settings.isVisible()) await settings.click();
  await page.getByRole('spinbutton', { name: 'Seed', exact: true }).fill('42');
  expect((await exportResult(page)).config.seed).toBe(first.config.seed);
  await page.getByRole('button', { name: 'Evaluate', exact: true }).click();
  const changed = await exportResult(page);
  expect(changed.config.seed).toBe(42);
  expect(changed.cohort).not.toEqual(first.cohort);
  await page.getByRole('combobox', { name: 'Logging support', exact: true }).selectOption('gap');
  await page.getByRole('button', { name: 'Evaluate', exact: true }).click();
  await expect(page.getByText(/Target values withheld:/)).toBeVisible();
  expect((await exportResult(page)).comparisons[0].result.normalized).toBeNull();
  await page.getByRole('button', { name: 'Reset evaluation', exact: true }).click();
  expect(await exportResult(page)).toEqual(first);
  await page.getByRole('button', { name: 'Raw IS', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Raw IS', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(errors).toEqual([]);
});
