import { expect, test, type Page } from '@playwright/test';

// Final WIG re-judge P1-A and P1-B. Reading pages and the archive skip
// off-screen blocks (content-visibility: auto), and a position computed
// through their estimated heights was wrong: with motion allowed, a contents
// link stopped hundreds to thousands of px from its heading, and focus moved
// into the archive ended off screen. A page view that needs exact positions
// now renders every block first (components/motion/contentVisibility.ts).

const LONG_REPORT = '/reports/technical-report-142';
// html { scroll-padding-top: 5.5rem } in globals.css: where a jump puts its heading
const SCROLL_PADDING_PX = 88;
const LANDING_TOLERANCE_PX = 2;
// a smooth jump down a 75,000px report runs well under this
const SETTLE_TIMEOUT_MS = 6000;
const POLL_MS = 100;
// polls in a row with nothing moving
const STILL_POLLS = 5;
const ROUNDING_PX = 1;
// archive cards far enough down that every card above them was skipped
const DEEP_CARDS = [40, 60];

test.use({ reducedMotion: 'no-preference' });

// the element's top once the page has stopped moving
async function settledTop(page: Page, id: string): Promise<number> {
  let last = Number.NaN;
  let still = 0;
  for (let waited = 0; waited < SETTLE_TIMEOUT_MS && still < STILL_POLLS; waited += POLL_MS) {
    await page.waitForTimeout(POLL_MS);
    const top = await page.evaluate((target) => document.getElementById(target)?.getBoundingClientRect().top ?? Number.NaN, id);
    still = top === last ? still + 1 : 0;
    last = top;
  }
  return last;
}

async function contentsLinks(page: Page, isMobile: boolean): Promise<string[]> {
  const selector = isMobile ? 'details.report-toc-mobile a[href^="#"]' : 'nav[aria-label="Table of contents"] a[href^="#"]';
  const hrefs = await page.locator(selector).evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
  // one from the middle and the last three: the farther the jump, the more it passes
  return [hrefs[Math.floor(hrefs.length / 2)], ...hrefs.slice(-3)];
}

test('a contents link lands its heading under the header, motion allowed', async ({ page, isMobile }) => {
  await page.goto(LONG_REPORT, { waitUntil: 'networkidle' });
  for (const href of await contentsLinks(page, isMobile)) {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    if (isMobile) {
      const contents = page.locator('details.report-toc-mobile');
      if (!(await contents.evaluate((details: HTMLDetailsElement) => details.open))) await contents.locator('summary').click();
      await contents.locator(`a[href="${href}"]`).click();
    } else {
      await page.locator(`nav[aria-label="Table of contents"] a[href="${href}"]`).click();
    }
    const top = await settledTop(page, decodeURIComponent(href.slice(1)));
    expect(Math.abs(top - SCROLL_PADDING_PX), `${href} landed at ${top}`).toBeLessThanOrEqual(LANDING_TOLERANCE_PX);
  }
});

test('a load at a deep #fragment lands on it', async ({ page }) => {
  await page.goto(`${LONG_REPORT}#references`, { waitUntil: 'networkidle' });
  const top = await settledTop(page, 'references');
  expect(Math.abs(top - SCROLL_PADDING_PX), `#references landed at ${top}`).toBeLessThanOrEqual(LANDING_TOLERANCE_PX);
});

test('focus moved deep into the archive stays on screen', async ({ page }) => {
  await page.goto('/reports', { waitUntil: 'networkidle' });
  for (const index of DEEP_CARDS) {
    await page.evaluate((n) => document.querySelectorAll<HTMLElement>('main [role="tabpanel"] a[href^="/reports/"]')[n]?.focus(), index);
    let box = { top: Number.NaN, bottom: Number.NaN };
    let still = 0;
    for (let waited = 0; waited < SETTLE_TIMEOUT_MS && still < STILL_POLLS; waited += POLL_MS) {
      await page.waitForTimeout(POLL_MS);
      const next = await page.evaluate(() => {
        const rect = document.activeElement!.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom };
      });
      still = next.top === box.top && next.bottom === box.bottom ? still + 1 : 0;
      box = next;
    }
    const height = page.viewportSize()!.height;
    expect(box.top, `card ${index} top`).toBeGreaterThanOrEqual(-ROUNDING_PX);
    expect(box.bottom, `card ${index} bottom`).toBeLessThanOrEqual(height + ROUNDING_PX);
  }
});
