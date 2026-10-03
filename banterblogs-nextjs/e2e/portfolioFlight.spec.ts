import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { collectErrors } from './consoleErrors';

async function exportedTrace(page: Page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON trace', exact: true }).click();
  const download = await pending;
  const file = await download.path();
  expect(file).toBeTruthy();
  return JSON.parse(await readFile(file!, 'utf8'));
}

test('flight decisions execute, rewind, reset and export real state', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/work/projects/flight-routing');
  await page.getByLabel('Disruption profile', { exact: true }).selectOption('clear');
  await page.getByRole('button', { name: 'Apply scenario', exact: true }).click();
  await page.getByRole('radio', { name: 'Select F3 to JFK', exact: true }).check();
  await page.getByRole('button', { name: 'Step selected flight', exact: true }).click();
  const first = await exportedTrace(page);
  expect(first.version).toBe('flight-routing.trace.v1');
  expect(first.episode.reason).toBe('arrived');
  expect(first.episode.legs).toHaveLength(1);
  expect(first.episode.reward.total).toBeCloseTo(0.95);
  await page.getByRole('button', { name: 'Rewind one decision', exact: true }).click();
  expect((await exportedTrace(page)).episode.legs).toHaveLength(0);
  await page.getByRole('radio', { name: 'Select F3 to JFK', exact: true }).check();
  await page.getByRole('button', { name: 'Step selected flight', exact: true }).click();
  expect((await exportedTrace(page)).episode).toEqual(first.episode);
  await page.getByRole('button', { name: 'Reset scenario', exact: true }).click();
  expect((await exportedTrace(page)).episode.legs).toHaveLength(0);
  await page.getByRole('button', { name: 'Run policy', exact: true }).click();
  expect((await exportedTrace(page)).episode.reason).toBe('arrived');
  await page.getByRole('button', { name: 'Compare policies', exact: true }).click();
  await expect(page.getByText('No policy evaluation run for this configuration.')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(errors).toEqual([]);
});
