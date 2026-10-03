import { expect, test } from '@playwright/test';
import { collectErrors } from './consoleErrors';

// The projects hub: its collection tabs are links with their own URLs, but
// the hub around them stays put, as the archive's phase tabs do; a card
// opens its project's canonical page.

test('a collection tab changes the URL and the grid, not the page', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/projects');
  const tabs = page.getByRole('navigation', { name: 'Project collections' });
  await expect(tabs.getByRole('link', { name: /^All/ })).toHaveAttribute('aria-current', 'page');

  // the heading element survives the switch: the layout is not remounted
  await page.locator('h1').evaluate((h1) => ((h1 as HTMLElement & { __kept?: boolean }).__kept = true));
  await tabs.getByRole('link', { name: /^Reinforcement learning/ }).click();
  await expect(page).toHaveURL(/\/projects\/reinforcement-learning$/);
  await expect(tabs.getByRole('link', { name: /^Reinforcement learning/ })).toHaveAttribute('aria-current', 'page');
  expect(await page.locator('h1').evaluate((h1) => (h1 as HTMLElement & { __kept?: boolean }).__kept)).toBe(true);
  await expect(page.getByRole('region', { name: 'Reinforcement learning' })).toBeVisible();

  await page.getByRole('link', { name: /Flight Routing Lab/ }).click();
  await expect(page).toHaveURL(/\/projects\/reinforcement-learning\/flight-routing$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Flight Routing Lab' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('an empty collection has no page', async ({ page }) => {
  const response = await page.goto('/projects/not-a-collection');
  expect(response?.status()).toBe(404);
});
