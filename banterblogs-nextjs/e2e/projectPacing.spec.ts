import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { collectErrors } from './consoleErrors';

// The send pacing page end to end: the run's finding and the flagged sends
// are in the server HTML, seeds step, a sweep row charts its setup, and an
// export replays.

const PAGE = '/projects/systems/send-pacing';
const UNDER_THE_HOOD = 'Change the campaign, read every message’s timing, export a replay';

test('the run’s finding and the flagged sends are in the server HTML, before any script runs', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(PAGE);
  await expect(
    page.getByText(
      'In this run of 12 messages, two go out before they could have been typed, and three land on the campaign’s final instant, 11:00.',
    ),
  ).toBeVisible();
  await page.getByText(UNDER_THE_HOOD, { exact: true }).click();
  await expect(page.getByRole('region', { name: 'Message ledger' }).getByText('sent before it could be typed')).toHaveCount(2);
  // the 16:00 setup's zero at the campaign end, with where its pile went
  await expect(page.getByText(/^0\.0, but [\d.]+ a run pile at 17:00, when business hours close$/)).toBeVisible();
  await expect(page.getByText('Status: documented, not fixed.')).toBeAttached();
  await context.close();
});

test('seeds step, a sweep row charts its setup, an export replays', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(PAGE);
  const seed = page.getByLabel('Seed', { exact: true });
  await expect(seed).toHaveValue('7');
  await page.getByRole('button', { name: 'Next seed', exact: true }).click();
  await expect(seed).toHaveValue('8');
  await page.getByText(UNDER_THE_HOOD, { exact: true }).click();
  await expect(page.getByRole('region', { name: 'Message ledger' }).getByText('sent before it could be typed')).toHaveCount(2);

  await page.getByRole('button', { name: '12 over 2 hours from 16:00', exact: true }).click();
  await expect(page.getByText(/16:00 to 18:00 UTC/)).toBeInViewport();

  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export the replay', exact: true }).click();
  const file = await (await pending).path();
  const exported = JSON.parse(await readFile(file!, 'utf8'));
  expect(exported.replay).toMatchObject({ seed: 8, startHour: 16 });
  await page.getByRole('button', { name: 'Reset to the source replay', exact: true }).click();
  await expect(seed).toHaveValue('7');
  await page.getByLabel('Replay file', { exact: true }).setInputFiles(file!);
  await expect(seed).toHaveValue('8');
  await expect(page.getByText(/16:00 to 18:00 UTC/)).toBeVisible();

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

// live QA: an invalid seed sat in the box with no word, and Next seed wrapped alone on a phone
test('a seed out of range is answered, and the seed controls keep to one line', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(PAGE);
  const seed = page.getByLabel('Seed', { exact: true });
  await seed.fill('99999999999');
  await expect(page.getByText(/Seed must be a whole number from 0 to 4,294,967,295/)).toBeVisible();
  await seed.press('Enter');
  await expect(seed).toHaveValue('7');
  await expect(page.getByText(/kept seed 7/)).toBeVisible();
  // both read in one frame, so a scroll between two reads cannot fake a wrap
  const [previous, next] = await page.evaluate(() =>
    ['Previous seed', 'Next seed'].map((name) => document.querySelector(`button[aria-label="${name}"]`)!.getBoundingClientRect().top),
  );
  expect(Math.abs(previous - next)).toBeLessThan(2);
});

// a phone shows each setup as a card: the counts that carry the finding are
// on screen, not scrolled out of a wide table
test('on a phone the sweep’s findings sit inside the screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(PAGE);
  const cells = page.locator('[data-label="Runs with a message sent before it was typed"]');
  await expect(cells.first()).toBeVisible();
  for (const box of await cells.evaluateAll((all) => all.map((cell) => cell.getBoundingClientRect().toJSON()))) {
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(390);
  }
});
