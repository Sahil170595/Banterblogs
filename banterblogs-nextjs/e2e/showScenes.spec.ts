import { expect, test } from '@playwright/test';

// The five /show scenes, whole. routes.spec.ts shoots each route's fold, and a
// scene's fold is only its hero: the walkthrough, its visuals and the
// narration all sit below it. Under reduced motion the narration shows whole
// and nothing autoplays, so the full page is one stable frame, the first beat.

const SCENES = ['streaming-ladder', 'bft-consensus', 'cognitive-agents', 'provenance-chain', 'zk-alignment-proof'] as const;

const SCREENSHOTS_ON = process.env.VISUAL_SCREENSHOTS === 'on';
// share of pixels a page may differ by before the screenshot fails
const MAX_DIFF_PIXEL_RATIO = 0.01;
// the global sheet (fonts merged in, as routes.spec.ts holds every other page
// to) and the scenes' own (src/app/show/scenes.css)
const SCENE_SHEETS = 2;

for (const slug of SCENES) {
  test(`/show/${slug} blocks its first paint on the global sheet and the scene sheet`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'the sheets do not depend on the viewport');
    await page.goto(`/show/${slug}`, { waitUntil: 'domcontentloaded' });
    const sheets = await page.evaluate(() => new Set([...document.querySelectorAll('link[rel="stylesheet"]')].map((link) => link.getAttribute('href'))).size);
    expect(sheets).toBe(SCENE_SHEETS);
  });


  test(`/show/${slug} matches its full page`, { tag: '@screenshot' }, async ({ page }) => {
    test.skip(!SCREENSHOTS_ON, 'screenshot baselines come from the CI image; see e2e/README.md');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/show/${slug}`, { waitUntil: 'networkidle' });
    await expect(page).toHaveScreenshot(`show--${slug}--page.png`, {
      fullPage: true,
      animations: 'disabled',
      mask: [page.locator('canvas')],
      maxDiffPixelRatio: MAX_DIFF_PIXEL_RATIO,
    });
  });
}
