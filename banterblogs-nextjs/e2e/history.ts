import { expect, type Locator, type Page } from '@playwright/test';

// Helpers for the Back and Forward checks (fragmentBack.spec.ts,
// backPlace.spec.ts): reading a page once it is still, clicking where things
// are, and naming the block at the top of the view so it can be found again.

export const LONG_REPORT = '/reports/technical-report-142';
// html { scroll-padding-top: 5.5rem } in globals.css: where a jump puts its heading
export const SCROLL_PADDING_PX = 88;
export const REPORT_BLOCKS = '.report-prose > *';
// a smooth jump down a 75,000px report runs well under this
const SETTLE_TIMEOUT_MS = 6000;
const POLL_MS = 100;
// polls in a row with nothing moving
const STILL_POLLS = 5;

/** a value read from the page once it has stopped changing */
export async function settled(read: () => Promise<number>): Promise<number> {
  let last = Number.NaN;
  let still = 0;
  for (let waited = 0; waited < SETTLE_TIMEOUT_MS && still < STILL_POLLS; waited += POLL_MS) {
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    const next = await read();
    still = next === last ? still + 1 : 0;
    last = next;
  }
  return last;
}

export const headingTop = (page: Page, id: string) =>
  settled(() => page.evaluate((target) => document.getElementById(target)?.getBoundingClientRect().top ?? Number.NaN, id));

/**
 * A reader clicks what is on screen. locator.click() first scrolls a sticky
 * header link "into view", which moved TR142 458px before the click.
 */
export async function clickInPlace(page: Page, target: Locator) {
  const box = await target.boundingBox();
  if (!box) throw new Error('nothing to click');
  await page.mouse.click(box.x + box.width / 2, box.y + Math.min(box.height / 2, 20));
}

/** leaves for /papers through the header (a phone opens its menu first) */
export async function leaveToPapers(page: Page, isMobile: boolean) {
  if (isMobile) {
    await clickInPlace(page, page.locator('button[aria-controls="mobile-nav"]'));
    const link = page.locator('#mobile-nav a[href="/papers"]').first();
    await expect(link).toBeVisible();
    await clickInPlace(page, link);
  } else {
    await clickInPlace(page, page.locator('header nav a[href="/papers"]').first());
  }
  await page.waitForURL('**/papers');
  await expect(page.locator('main h1')).toHaveText(/papers/i);
}

/** the first block still showing under the header, by its index among `selector` */
export const topBlock = (page: Page, selector: string) =>
  page.evaluate(
    ([blocks, line]) => {
      const all = [...document.querySelectorAll(blocks)];
      const index = all.findIndex((el) => el.getBoundingClientRect().bottom > line);
      return { index, top: all[index].getBoundingClientRect().top };
    },
    [selector, SCROLL_PADDING_PX] as const,
  );

/** where that block sits once the page is still */
export const blockTop = (page: Page, selector: string, index: number) =>
  settled(() =>
    page.evaluate(
      ([blocks, n]) => document.querySelectorAll(blocks)[n]?.getBoundingClientRect().top ?? Number.NaN,
      [selector, index] as const,
    ),
  );
