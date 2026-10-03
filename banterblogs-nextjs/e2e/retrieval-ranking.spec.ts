import { expect, test } from '@playwright/test';

// Coordinator runs against the serialized external-browser QA server.
test('retrieval, rejection, export/replay, reset, and responsive layout', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/work/projects/retrieval-ranking');
  await expect(page.getByRole('heading', { name: 'Retrieval Ranking Workbench' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Term evidence' })).toBeVisible();

  await page.getByLabel('Query', { exact: true }).fill('quasar');
  await page.getByRole('button', { name: 'Run retrieval' }).click();
  await expect(page.getByText('No lexical matches', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reset experiment' }).click();
  const settings = page.getByRole('button', { name: 'Ranking and filters' });
  if (await settings.isVisible()) {
    await expect(settings).toHaveAttribute('aria-expanded', 'false');
    await settings.click();
  }
  await page.getByLabel('Required tokens', { exact: true }).fill('quasar');
  await page.getByRole('button', { name: 'Run retrieval' }).click();
  await expect(page.getByText('All retrieved documents rejected', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: /Rejected/ }).click();
  await expect(page.getByText('Missing: quasar', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Reset experiment' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export run' }).click();
  expect((await download).suggestedFilename()).toBe('retrieval-ranking-v1.json');
  const exported = await page.getByLabel('Replay JSON').inputValue();
  expect(JSON.parse(exported).algorithm).toBe('lexical-rrf-v1');
  await page.getByLabel('Query', { exact: true }).fill('quasar');
  await page.getByRole('button', { name: 'Run retrieval' }).click();
  await page.getByRole('button', { name: 'Replay run' }).click();
  await expect(page.getByLabel('Query', { exact: true })).toHaveValue('search latency');
  const forged = JSON.parse(exported); forged.result.rows[0].score = 999;
  await page.getByLabel('Replay JSON').fill(JSON.stringify(forged));
  await page.getByRole('button', { name: 'Replay run' }).click();
  await expect(page.locator('#demo').getByRole('alert').filter({ hasText: 'recomputed' })).toBeVisible();

  await page.getByRole('button', { name: 'Reset experiment' }).click();
  await page.getByRole('tab', { name: 'Attempts' }).click();
  await expect(page.getByRole('table', { name: 'Filter attempts' })).toBeVisible();
  await page.getByRole('tab', { name: 'Results' }).click();
  const bars = page.locator('[role="img"][aria-label^="Ranking score"]');
  expect(await bars.count()).toBeGreaterThan(0);
  const width = await bars.first().evaluate((el) => el.getBoundingClientRect().width);
  expect(width).toBeGreaterThan(20);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('output', 'playwright', 'retrieval-ranking.png'), fullPage: true });
});
