import { expect, test } from '@playwright/test';

// Final WIG re-judge P1-C: a focus scroll parks its target in the bottom
// band the reveal observer leaves out, so focus sat on a /work row still held
// at opacity 0. Focus inside held content shows it at rest at once.

// A row is held once the page has hydrated and the observer has measured what
// sits below the fold (components/motion/revealObserver.ts), which is after
// the network goes quiet: read too early, the page holds nothing yet.
const REVEALS_ARMED_TIMEOUT_MS = 15_000;

test.use({ reducedMotion: 'no-preference' });

test('focus inside a held reveal shows it at rest', async ({ page }) => {
  await page.goto('/work', { waitUntil: 'networkidle' });
  // the last held row with something focusable in it, once the page holds any
  const armed = await page
    .waitForFunction(
      () => {
        const held = [...document.querySelectorAll('[data-reveal="pending"]')].reverse().find((el) => el.querySelector('a[href], summary'));
        held?.setAttribute('data-test-held', '');
        return held !== undefined;
      },
      undefined,
      { timeout: REVEALS_ARMED_TIMEOUT_MS },
    )
    .then(
      () => true,
      () => false,
    );
  expect(armed, 'the page holds a row with something focusable in it').toBe(true);
  const held = page.locator('[data-test-held]');
  // focus without scrolling: the observer never sees it enter
  await held.locator('a[href], summary').first().evaluate((el: HTMLElement) => el.focus({ preventScroll: true }));
  await expect(held).toHaveCSS('opacity', '1');
  await expect(held).toHaveCSS('transform', 'none');
});
