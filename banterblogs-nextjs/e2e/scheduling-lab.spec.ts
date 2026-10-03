import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { collectErrors } from './consoleErrors';

async function exportResult(page: Page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON', exact: true }).click();
  const file = await (await pending).path();
  expect(file).toBeTruthy();
  return { file: file!, data: JSON.parse(await readFile(file!, 'utf8')) };
}

test('scheduling recomputes seeded timing, simulates progress and replays actual inputs', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/work/projects/scheduling-lab');
  const settings = page.getByRole('button', { name: 'Schedule settings', exact: true });
  if (await settings.isVisible()) await settings.click();
  const initial = await exportResult(page);
  expect(initial.data.result.metrics.violationCount).toBe(0);
  await page.getByRole('spinbutton', { name: 'Seed', exact: true }).fill('73');
  await expect(page.getByRole('button', { name: 'Export JSON', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Recompute schedule', exact: true }).click();
  const changed = await exportResult(page);
  expect(changed.data.session.config.seed).toBe(73);
  expect(changed.data.result.events).not.toEqual(initial.data.result.events);
  await page.getByRole('button', { name: 'Step simulation', exact: true }).click();
  const stepped = await exportResult(page);
  expect(stepped.data.session.processed).toBe(1);
  expect(stepped.data.result.simulation.processedIds).toHaveLength(1);
  await page.getByRole('button', { name: 'Reset schedule', exact: true }).click();
  expect((await exportResult(page)).data).toEqual(initial.data);
  await page.getByLabel('JSON replay file', { exact: true }).setInputFiles(stepped.file);
  expect((await exportResult(page)).data).toEqual(stepped.data);
  await page.getByRole('button', { name: 'Ledger view', exact: true }).click();
  await expect(page.getByRole('columnheader', { name: 'Scheduled / UTC', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(errors).toEqual([]);
});
