import { expect, test, type Page } from '@playwright/test';
import { LONG_REPORT, REPORT_BLOCKS, blockTop, clickInPlace, leaveToPapers, settled, topBlock } from './history';

// R6 bug 2. Back restored the scroll position as a number into a page
// rendered afresh with its off-screen blocks skipped at estimated heights,
// so other content sat there: the /reports archive 75px off, TR142 2,125px
// off (Chromium, 1440). The block that topped the view now goes back to its
// offset (components/motion/scrollAnchor.ts).

// the same content at the same place after Back
const PLACE_TOLERANCE_PX = 8;
// far enough down that the blocks above were skipped when the page opened
const ARCHIVE_DEPTH_PX = 6000;
const REPORT_DEPTH_PX = 12000;
const WHEEL_STEP_PX = 500;
const WHEEL_PAUSE_MS = 50;
const WHEEL_STEPS_MAX = 200;
const ARCHIVE_BLOCKS = '.archive-card-slot, main h2';

// scrolls as a reader does, so the blocks passed render on the way
async function wheelTo(page: Page, depth: number) {
  for (let step = 0; step < WHEEL_STEPS_MAX && (await page.evaluate(() => window.scrollY)) < depth; step++) {
    await page.mouse.wheel(0, WHEEL_STEP_PX);
    await page.waitForTimeout(WHEEL_PAUSE_MS);
  }
  await settled(() => page.evaluate(() => window.scrollY));
}

test.use({ reducedMotion: 'no-preference' });

test('Back puts the archive card that topped the view back where it was', async ({ page }) => {
  await page.goto('/reports', { waitUntil: 'networkidle' });
  await wheelTo(page, ARCHIVE_DEPTH_PX);
  const before = await topBlock(page, ARCHIVE_BLOCKS);
  const card = await page.evaluate(() => {
    const inView = [...document.querySelectorAll('main a[href^="/reports/"]')].find((link) => {
      const box = link.getBoundingClientRect();
      return box.top > 120 && box.bottom < window.innerHeight - 40;
    });
    return inView?.getAttribute('href') ?? null;
  });
  expect(card, 'a report card in view').not.toBeNull();
  await clickInPlace(page, page.locator(`main a[href="${card}"]`).first());
  await page.waitForURL(`**${card}`);
  await page.goBack();
  await page.waitForURL('**/reports');
  const after = await blockTop(page, ARCHIVE_BLOCKS, before.index);
  expect(Math.abs(after - before.top), `block ${before.index} from ${before.top} to ${after}`).toBeLessThanOrEqual(PLACE_TOLERANCE_PX);
});

test('Back puts the report block that topped the view back where it was', async ({ page, isMobile }) => {
  await page.goto(LONG_REPORT, { waitUntil: 'networkidle' });
  await wheelTo(page, REPORT_DEPTH_PX);
  const before = await topBlock(page, REPORT_BLOCKS);
  await leaveToPapers(page, isMobile);
  await page.goBack();
  await page.waitForURL(`**${LONG_REPORT}`);
  const after = await blockTop(page, REPORT_BLOCKS, before.index);
  expect(Math.abs(after - before.top), `block ${before.index} from ${before.top} to ${after}`).toBeLessThanOrEqual(PLACE_TOLERANCE_PX);
});
