import { expect, test } from '@playwright/test';
import { readProjectCatalog } from '../src/lib/projectCatalog';
import { collectErrors } from './consoleErrors';

const projects = readProjectCatalog();

test('project collection exposes canonical routes and shareable role filters', async ({ page }) => {
  await page.goto('/work/projects');
  await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible();
  for (const project of projects) {
    await expect(page.locator(`a[href="/work/projects/${project.slug}"]`)).toBeVisible();
  }
  await page.getByRole('combobox', { name: 'Role', exact: true }).selectOption('research-engineer');
  await expect(page).toHaveURL(/role=research-engineer/);
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Role', exact: true })).toHaveValue('research-engineer');
  await page.getByLabel('Search projects').fill('no-project-has-this-name');
  await expect(page.getByText('No projects match this selection.')).toBeVisible();
  await page.getByRole('button', { name: 'Reset project filters' }).click();
  await expect(page.getByText(`${projects.length} of ${projects.length} projects`, { exact: true })).toBeVisible();
});

for (const project of projects) {
  test(`${project.slug}: route, evidence sections, and responsive bounds`, async ({ page }) => {
    const errors = collectErrors(page);
    const response = await page.goto(`/work/projects/${project.slug}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    for (const section of ['demo', 'findings', 'method', 'reproduce']) {
      await expect(page.locator(`#${section}`)).toHaveCount(1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    expect(errors).toEqual([]);
  });
}
