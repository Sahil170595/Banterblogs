import { expect, test } from '@playwright/test';
import { collectErrors } from './consoleErrors';

// The whiteboard page end to end: the convergence table is in the server
// HTML and switches to sequence order; on a phone its rows stack so the
// outcomes stay in view; the editor draws on a real canvas, keeps history,
// exports, imports, survives a reload and resets on a second press.

const PAGE = '/projects/product/collaborative-whiteboard';
// the opening board (lib/projects/collaborative-whiteboard/fixtures.ts)
const OPENING = '8 objects';
const ONE_MORE = '9 objects';

test('the convergence table and its headline are in the server HTML, before any script runs', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(PAGE);
  await expect(page.getByText(/each screen can receive the echoes in either order: eight possible orderings in all/)).toBeVisible();
  await expect(page.getByText(/Each row is one possible ordering/)).toBeVisible();
  await expect(page.getByRole('region', { name: 'Every order two concurrent edits can take' }).getByText(/not the database/)).toHaveCount(8);
  await context.close();
});

test('on a phone each timing stacks, so both screens’ outcomes are in view', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'the phone layout');
  await page.goto(PAGE);
  const row = page.getByRole('region', { name: 'Every order two concurrent edits can take' }).getByRole('row').nth(1);
  const width = page.viewportSize()!.width;
  for (const column of ['Database', 'A shows', 'B shows']) {
    const box = (await row.locator(`[data-label="${column}"]`).boundingBox())!;
    expect(box.x, column).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, column).toBeLessThanOrEqual(width);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('the table converges in sequence order; the editor keeps a real board', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(PAGE);
  const table = page.getByRole('region', { name: 'Every order two concurrent edits can take', exact: true });
  await page.getByRole('group', { name: 'Each client applies the server’s echoes' }).getByText('In sequence order').click();
  await expect(table.getByText(/not the database/)).toHaveCount(0);

  const editor = page.getByRole('region', { name: 'Try the editor', exact: true });
  await expect(editor.getByText(/no second person or server here/)).toBeVisible();
  await expect(editor.getByTestId('object-count')).toHaveText(OPENING);
  const canvas = editor.getByLabel('Editable whiteboard');
  expect(
    await canvas.evaluate((element) => {
      const surface = element as HTMLCanvasElement;
      const pixels = surface.getContext('2d')!.getImageData(0, 0, surface.width, surface.height).data;
      const colors = new Set<string>();
      for (let i = 0; i < pixels.length; i += 64) colors.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`);
      return colors.size;
    }),
  ).toBeGreaterThan(5);

  await editor.getByRole('button', { name: 'Select Rectangle (draft)', exact: true }).click();
  await canvas.focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
  await expect(editor.getByTestId('log-count')).toHaveText('4 commands');
  await editor.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(editor.getByLabel('X position', { exact: true })).toHaveValue('93');

  await editor.getByRole('button', { name: 'Ellipse tool' }).click();
  await editor.getByRole('button', { name: 'Add object' }).click();
  await expect(editor.getByTestId('object-count')).toHaveText(ONE_MORE);
  await editor.getByText('Under the hood: operation log, export and import').click();
  const pending = page.waitForEvent('download');
  await editor.getByRole('button', { name: 'Export JSON' }).click();
  const download = await pending;
  const chunks: Buffer[] = [];
  for await (const chunk of (await download.createReadStream())!) chunks.push(Buffer.from(chunk));
  const exported = Buffer.concat(chunks);
  await editor.getByRole('button', { name: 'Clear board' }).click();
  await expect(editor.getByTestId('object-count')).toHaveText('0 objects');
  await editor.getByLabel('Import trace file').setInputFiles({ name: 'trace.json', mimeType: 'application/json', buffer: exported });
  await expect(editor.getByTestId('object-count')).toHaveText(ONE_MORE);
  await page.reload();
  await expect(editor.getByTestId('object-count')).toHaveText(ONE_MORE);

  await editor.getByRole('button', { name: 'Reset board', exact: true }).click();
  await expect(editor.getByTestId('object-count')).toHaveText(ONE_MORE);
  await editor.getByRole('button', { name: /Confirm reset/ }).click();
  await expect(editor.getByTestId('object-count')).toHaveText(OPENING);

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
