import { expect, type Locator, type Page } from '@playwright/test';

// Helpers for the Back and Forward checks (fragmentBack.spec.ts,
// backPlace.spec.ts): reading a page once it is still, clicking where things
// are, and naming the block at the top of the view so it can be found again.

export const LONG_REPORT = '/reports/technical-report-142';
// html { scroll-padding-top: 5.5rem } in globals.css: where a jump puts its heading
export const SCROLL_PADDING_PX = 88;
export const REPORT_BLOCKS = '.report-prose > *';
// a smooth jump down a 75,000px report runs well under this
const SETTLE_TIMEOUT_MS = 10_000;
/**
 * How long the page a traversal reaches may take to render. A restore is a
 * contract on that commit, whenever it lands (RouteArrival.tsx), and in the
 * CI image with two workers a 75,000px report took longer than Playwright's
 * default expect timeout to come up.
 */
export const COMMIT_TIMEOUT_MS = 20_000;
const POLL_MS = 100;
// polls in a row with nothing moving
const STILL_POLLS = 5;
// a held reveal rises --motion-reveal (16px) from --scale-reveal over
// --duration-reveal; on a slow machine the rise can outlast a settle
const REVEAL_REST_TIMEOUT_MS = 5000;

/** a value read from the page once it has stopped changing */
export async function settled(read: () => Promise<number>): Promise<number> {
  let last = Number.NaN;
  let still = 0;
  let waited = 0;
  for (; waited < SETTLE_TIMEOUT_MS && still < STILL_POLLS; waited += POLL_MS) {
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    const next = await read();
    still = next === last ? still + 1 : 0;
    last = next;
  }
  if (still < STILL_POLLS) console.warn(`still moving after ${waited}ms, last ${last}`);
  return last;
}

/** the page a navigation reached is the one on screen */
export async function showsPage(page: Page, heading: string) {
  await expect(page.locator('main h1')).toHaveText(heading, { timeout: COMMIT_TIMEOUT_MS });
}

/** the jump has been taken: the entry it made is the current one */
export async function jumped(page: Page, href: string) {
  await page.waitForFunction((hash) => location.hash === hash, href, { timeout: COMMIT_TIMEOUT_MS });
}

/**
 * Waits for the reveals in view to be at rest. Content held back by one
 * (revealObserver.ts) is drawn --motion-reveal below where it is laid out
 * until the observer marks it shown, which read a block 21px low on a slow
 * machine. Where the content comes to rest is what these checks are about,
 * so they measure once the rise is over; what is still held below the fold
 * is left alone, as the reader would leave it.
 */
async function revealsAtRest(page: Page) {
  try {
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('[data-reveal="pending"]')].every((held) => {
          const box = held.getBoundingClientRect();
          return box.bottom <= 0 || box.top >= window.innerHeight;
        }),
      undefined,
      { timeout: REVEAL_REST_TIMEOUT_MS },
    );
  } catch {
    // measuring anyway: the assertion reports where the block actually is
    console.warn(`a reveal in view was still rising after ${REVEAL_REST_TIMEOUT_MS}ms`);
  }
}

export const headingTop = async (page: Page, id: string) => {
  await revealsAtRest(page);
  return settled(() => page.evaluate((target) => document.getElementById(target)?.getBoundingClientRect().top ?? Number.NaN, id));
};

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

/** where that block sits once the page is still and its reveals are at rest */
export const blockTop = async (page: Page, selector: string, index: number) => {
  await revealsAtRest(page);
  return settled(() =>
    page.evaluate(
      ([blocks, n]) => document.querySelectorAll(blocks)[n]?.getBoundingClientRect().top ?? Number.NaN,
      [selector, index] as const,
    ),
  );
};
