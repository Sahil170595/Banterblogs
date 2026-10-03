import { expect, test } from '@playwright/test';
import { collectErrors } from './consoleErrors';

// The whiteboard page end to end: the convergence table is in the server
// HTML and switches to sequence order; the editor draws on a real canvas,
// keeps history, exports, imports, survives a reload and resets on a second
// press.

const PAGE = '/projects/product/collaborative-whiteboard';

test('the convergence table and its headline are in the server HTML, before any script runs', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(PAGE);
  await expect(page.getByText(/Of the eight ways their edits can be stored and delivered, six leave someone looking at a colour the database does not have/)).toBeVisible();
  await expect(page.getByRole('region', { name: 'Every order two concurrent edits can take' }).getByText(/not the database/)).toHaveCount(8);
  await context.close();
});

test('the table converges in sequence order; the editor keeps a real board', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(PAGE);
  const table = page.getByRole('region', { name: 'Every order two concurrent edits can take', exact: true });
  await page.getByRole('group', { name: 'Each client applies the echoes' }).getByText('In sequence order').click();
  await expect(table.getByText(/not the database/)).toHaveCount(0);

  const editor = page.getByRole('region', { name: 'Local whiteboard application', exact: true });
  await expect(editor.getByTestId('object-count')).toHaveText('10 objects');
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

  await editor.getByRole('button', { name: 'Select rectangle draft', exact: true }).click();
  await canvas.focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
  await expect(editor.getByTestId('log-count')).toHaveText('4 commands');
  await editor.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(editor.getByLabel('X position', { exact: true })).toHaveValue('93');

  await editor.getByRole('button', { name: 'Ellipse tool' }).click();
  await editor.getByRole('button', { name: 'Add object' }).click();
  await expect(editor.getByTestId('object-count')).toHaveText('11 objects');
  const pending = page.waitForEvent('download');
  await editor.getByRole('button', { name: 'Export JSON' }).click();
  const download = await pending;
  const chunks: Buffer[] = [];
  for await (const chunk of (await download.createReadStream())!) chunks.push(Buffer.from(chunk));
  const exported = Buffer.concat(chunks);
  await editor.getByRole('button', { name: 'Clear board' }).click();
  await expect(editor.getByTestId('object-count')).toHaveText('0 objects');
  await editor.getByLabel('Import trace file').setInputFiles({ name: 'trace.json', mimeType: 'application/json', buffer: exported });
  await expect(editor.getByTestId('object-count')).toHaveText('11 objects');
  await page.reload();
  await expect(editor.getByTestId('object-count')).toHaveText('11 objects');

  await editor.getByRole('button', { name: 'Reset board', exact: true }).click();
  await expect(editor.getByTestId('object-count')).toHaveText('11 objects');
  await editor.getByRole('button', { name: /Confirm reset/ }).click();
  await expect(editor.getByTestId('object-count')).toHaveText('10 objects');

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
