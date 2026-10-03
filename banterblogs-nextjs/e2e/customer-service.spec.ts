import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { collectErrors } from './consoleErrors';

async function exportEpisode(page: Page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export versioned JSON trace', exact: true }).click();
  const file = await (await pending).path();
  expect(file).toBeTruthy();
  return { file: file!, data: JSON.parse(await readFile(file!, 'utf8')) };
}

test('service environment rewards effects and replays independently of the score receipt', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/work/projects/customer-service');
  await page.getByRole('button', { name: 'Run script', exact: true }).click();
  const completed = await exportEpisode(page);
  expect(completed.data.reward.completed).toBe(true);
  expect(completed.data.final.replacements).toHaveLength(1);
  expect(completed.data.events.length).toBeGreaterThan(3);
  await page.getByRole('button', { name: 'Reset current episode', exact: true }).click();
  expect((await exportEpisode(page)).data.events).toHaveLength(0);
  await page.getByLabel('Trace file', { exact: true }).setInputFiles(completed.file);
  expect((await exportEpisode(page)).data).toEqual(completed.data);
  await page.getByRole('combobox', { name: 'Scripted control', exact: true }).selectOption({ label: 'Claim without effect' });
  await page.getByRole('button', { name: 'Run script', exact: true }).click();
  const unsupported = (await exportEpisode(page)).data;
  expect(unsupported.reward.completed).toBe(false);
  expect(unsupported.final.replacements).toHaveLength(0);
  await page.getByRole('combobox', { name: 'Case', exact: true }).selectOption('duplicate');
  await page.getByRole('button', { name: 'New episode', exact: true }).click();
  await page.getByRole('combobox', { name: 'Scripted control', exact: true }).selectOption({ label: 'Verified remedy' });
  await page.getByRole('button', { name: 'Run script', exact: true }).click();
  expect((await exportEpisode(page)).data.reward.completed).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(errors).toEqual([]);
});
