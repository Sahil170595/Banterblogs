import { expect, test } from '@playwright/test';
import { collectErrors } from './consoleErrors';

// Route checks for every page the redesign touches, plus a miss, at both
// project viewports (playwright.config.ts). Width, console and heading run
// on every CI build; the fold screenshot runs only with VISUAL_SCREENSHOTS=on,
// because its baselines must be rendered by the CI container image.

const ROUTES = [
  '/',
  '/reports',
  '/reports/technical-report-138',
  '/papers',
  '/work',
  '/about',
  '/platform',
  '/tools',
  '/tools/chimeraforge',
  '/show',
  '/episodes',
] as const;
const MISSING_ROUTE = '/this-route-does-not-exist';
const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;

// WCAG 1.4.10 reflow: 320 CSS px (1280 at 400% zoom) with no sideways
// scroll. Width and console only, on the phone project; no screenshots.
const REFLOW_WIDTH = 320;
const REFLOW_HEIGHT = 640;
const REFLOW_ROUTES = [
  ...ROUTES,
  '/banterpacks',
  '/chimera',
  '/show/streaming-ladder',
  '/show/bft-consensus',
  '/show/cognitive-agents',
  '/show/provenance-chain',
  '/show/zk-alignment-proof',
] as const;

const SCREENSHOTS_ON = process.env.VISUAL_SCREENSHOTS === 'on';
// share of pixels a fold may differ by before the screenshot fails
const MAX_DIFF_PIXEL_RATIO = 0.01;

function snapshotName(route: string): string {
  return route === '/' ? 'landing.png' : `${route.slice(1).replace(/\//g, '--')}.png`;
}

for (const route of [...ROUTES, MISSING_ROUTE]) {
  test.describe(route, () => {
    test('fits the viewport, logs no errors and has a heading', async ({ page }) => {
      const errors = collectErrors(page, route === MISSING_ROUTE ? MISSING_ROUTE : undefined);
      const response = await page.goto(route, { waitUntil: 'networkidle' });
      expect(response?.status()).toBe(route === MISSING_ROUTE ? HTTP_NOT_FOUND : HTTP_OK);

      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      // a phone that shrinks an overflowing page to fit would widen innerWidth too
      expect(innerWidth).toBe(page.viewportSize()?.width);
      expect(scrollWidth).toBe(innerWidth);

      await expect(page.locator('h1').first()).toBeAttached();
      expect(errors).toEqual([]);
    });

    test('matches its fold', { tag: '@screenshot' }, async ({ page }) => {
      test.skip(!SCREENSHOTS_ON, 'screenshot baselines come from the CI image; see e2e/README.md');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(route, { waitUntil: 'networkidle' });
      await expect(page).toHaveScreenshot(snapshotName(route), {
        animations: 'disabled',
        mask: [page.locator('canvas')],
        maxDiffPixelRatio: MAX_DIFF_PIXEL_RATIO,
      });
    });
  });
}

for (const route of REFLOW_ROUTES) {
  test.describe(`${route} at ${REFLOW_WIDTH}px`, () => {
    test('reflows without a sideways scroll and logs no errors', async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'phone', 'one narrow run, on the touch project');
      const errors = collectErrors(page);
      await page.setViewportSize({ width: REFLOW_WIDTH, height: REFLOW_HEIGHT });
      await page.goto(route, { waitUntil: 'networkidle' });
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBe(REFLOW_WIDTH);
      expect(errors).toEqual([]);
    });
  });
}
