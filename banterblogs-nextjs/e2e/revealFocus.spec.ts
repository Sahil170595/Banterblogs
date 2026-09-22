import { expect, test } from '@playwright/test';

// Final WIG re-judge P1-C: a focus scroll parks its target in the bottom
// band the reveal observer leaves out, so focus sat on a /work row still held
// at opacity 0. Focus inside held content shows it at rest at once.

test.use({ reducedMotion: 'no-preference' });

test('focus inside a held reveal shows it at rest', async ({ page }) => {
  await page.goto('/work', { waitUntil: 'networkidle' });
  // the last held row with something focusable in it
  const found = await page.evaluate(() => {
    const held = [...document.querySelectorAll('[data-reveal="pending"]')].reverse().find((el) => el.querySelector('a[href], summary'));
    held?.setAttribute('data-test-held', '');
    return held !== undefined;
  });
  expect(found).toBe(true);
  const held = page.locator('[data-test-held]');
  // focus without scrolling: the observer never sees it enter
  await held.locator('a[href], summary').first().evaluate((el: HTMLElement) => el.focus({ preventScroll: true }));
  await expect(held).toHaveCSS('opacity', '1');
  await expect(held).toHaveCSS('transform', 'none');
});
