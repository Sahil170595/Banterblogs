import { expect, test, type Page } from '@playwright/test';
import { LONG_REPORT, REPORT_BLOCKS, SCROLL_PADDING_PX, blockTop, clickInPlace, headingTop, leaveToPapers, settled, topBlock } from './history';

// R6 bug 1. A contents link is a #fragment navigation, and the browser makes
// its history entry without state. The App Router ignores a popstate without
// state, so Back from /papers changed the URL to TR142#references and left
// /papers on screen (components/motion/fragmentHistory.ts).

const LANDING_TOLERANCE_PX = 4;
// the same content at the same place after Back or Forward
const PLACE_TOLERANCE_PX = 8;

const contentsSelector = (isMobile: boolean) =>
  isMobile ? 'details.report-toc-mobile' : 'nav[aria-label="Table of contents"]';

// Brings a contents link into view, as a reader does. A phone's contents sit
// above the body. The desktop contents stick beside it once the page has
// moved a little, and scroll inside their own box; a page scroll makes them
// follow the section being read (ReportTocSpy), so the box scrolls last.
async function reach(page: Page, isMobile: boolean, href: string) {
  const contents = page.locator(contentsSelector(isMobile));
  if (isMobile && !(await contents.evaluate((details: HTMLDetailsElement) => details.open))) {
    await contents.locator('summary').click();
  }
  const link = contents.locator(`a[href="${href}"]`);
  await link.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await settled(() => page.evaluate(() => window.scrollY));
  if (!isMobile) {
    await link.evaluate((el) => {
      const scroller = el.closest('[data-toc-scroller]');
      if (!scroller) throw new Error('the desktop contents have no scroll box');
      const offset = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
      scroller.scrollTo({ top: scroller.scrollTop + offset - scroller.clientHeight / 2, behavior: 'instant' });
    });
    await expect(link).toBeInViewport();
  }
  return link;
}

// Follows a contents link. Returns the block that topped the view as it was
// followed: where Back to the entry it leaves returns.
async function jump(page: Page, isMobile: boolean, href: string) {
  const link = await reach(page, isMobile, href);
  const left = await topBlock(page, REPORT_BLOCKS);
  await clickInPlace(page, link);
  return left;
}

test.describe('contents links', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('Back from another page returns to the report at the section jumped to; Back and Forward step through the jumps', async ({
    page,
    isMobile,
  }) => {
    await page.goto(LONG_REPORT, { waitUntil: 'networkidle' });
    const title = (await page.locator('main h1').textContent()) ?? '';
    const hrefs = await page
      .locator(`${contentsSelector(isMobile)} a[href^="#"]`)
      .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
    const middle = hrefs[Math.floor(hrefs.length / 2)];

    await jump(page, isMobile, middle);
    const middleTop = await headingTop(page, decodeURIComponent(middle.slice(1)));
    expect(Math.abs(middleTop - SCROLL_PADDING_PX), `${middle} landed at ${middleTop}`).toBeLessThanOrEqual(LANDING_TOLERANCE_PX);
    const atMiddle = await jump(page, isMobile, '#references');
    const referencesTop = await headingTop(page, 'references');
    expect(Math.abs(referencesTop - SCROLL_PADDING_PX), `#references landed at ${referencesTop}`).toBeLessThanOrEqual(LANDING_TOLERANCE_PX);

    await leaveToPapers(page, isMobile);
    await page.goBack();
    await expect(page.locator('main h1')).toHaveText(title);
    expect(new URL(page.url()).hash).toBe('#references');
    const backTop = await headingTop(page, 'references');
    expect(Math.abs(backTop - referencesTop), `#references after Back at ${backTop}`).toBeLessThanOrEqual(PLACE_TOLERANCE_PX);

    // the section read before the last jump, as the reader left it
    await page.goBack();
    expect(new URL(page.url()).hash).toBe(middle);
    await expect(page.locator('main h1')).toHaveText(title);
    const previousTop = await blockTop(page, REPORT_BLOCKS, atMiddle.index);
    expect(Math.abs(previousTop - atMiddle.top), `block ${atMiddle.index} after a second Back at ${previousTop}, was ${atMiddle.top}`).toBeLessThanOrEqual(
      PLACE_TOLERANCE_PX,
    );

    await page.goForward();
    expect(new URL(page.url()).hash).toBe('#references');
    const forwardTop = await headingTop(page, 'references');
    expect(Math.abs(forwardTop - referencesTop), `#references after Forward at ${forwardTop}`).toBeLessThanOrEqual(PLACE_TOLERANCE_PX);
  });
});

test.describe('a contents link followed from the keyboard', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('lands like a click, in an entry the router can return to', async ({ page, isMobile }) => {
    await page.goto(LONG_REPORT, { waitUntil: 'networkidle' });
    const link = await reach(page, isMobile, '#references');
    await link.focus();
    await page.keyboard.press('Enter');
    const top = await headingTop(page, 'references');
    expect(Math.abs(top - SCROLL_PADDING_PX), `#references landed at ${top}`).toBeLessThanOrEqual(LANDING_TOLERANCE_PX);
    expect(new URL(page.url()).hash).toBe('#references');
    // the router's own mark on an entry it restores (Next's app-router __NA)
    await expect.poll(() => page.evaluate(() => Boolean(history.state?.__NA))).toBe(true);
  });
});

test.describe('contents links under reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('land their heading under the header', async ({ page, isMobile }) => {
    await page.goto(LONG_REPORT, { waitUntil: 'networkidle' });
    await jump(page, isMobile, '#references');
    const top = await headingTop(page, 'references');
    expect(Math.abs(top - SCROLL_PADDING_PX), `#references landed at ${top}`).toBeLessThanOrEqual(LANDING_TOLERANCE_PX);
  });
});
