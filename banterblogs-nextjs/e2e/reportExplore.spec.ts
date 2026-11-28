import { expect, test, type Page } from '@playwright/test';
import { collectErrors } from './consoleErrors';

// The report figures a reader redraws (components/reports/ReportExplore.tsx):
// TR140 by shot count, TR134 by the format FP16 is compared with. Against a
// production build at both project viewports: the control is in place from
// the first paint and nothing shifts, on load or on a choice; the keyboard
// path works and the live region says what is shown; marks move only while
// motion is allowed; without script the page is the report's figure alone;
// and only these pages load the control's code.

const EXPLORABLES = [
  { path: '/reports/technical-report-140', legend: 'Shot count', initial: 'N=128', previous: 'N=64', other: 'N=16' },
  { path: '/reports/technical-report-134', legend: 'Compare FP16 with', initial: 'GPTQ', previous: 'AWQ', other: 'Q4_K_M' },
] as const;
// a report page whose figure offers no choices
const PLAIN_REPORT = '/reports/technical-report-108';
// long enough for a choice's marks to finish moving (--duration-base is 250ms)
const SETTLE_MS = 800;

// every layout shift from the first byte, whether or not input preceded it
function watchShifts() {
  const shifts: number[] = [];
  (window as unknown as { __shifts: number[] }).__shifts = shifts;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) shifts.push((entry as PerformanceEntry & { value: number }).value);
  }).observe({ type: 'layout-shift', buffered: true });
}
const shifts = (page: Page) => page.evaluate(() => (window as unknown as { __shifts: number[] }).__shifts.slice());
const header = (page: Page) => page.locator('.report-figure .report-hero svg text[text-anchor="end"]').first();
const control = (page: Page, legend: string) => page.getByRole('group', { name: legend });

for (const report of EXPLORABLES) {
  test.describe(report.path, () => {
    test('opens on the report figure with its control in place, and nothing shifts on load or on a choice', async ({ page }) => {
      const errors = collectErrors(page);
      await page.addInitScript(watchShifts);
      await page.goto(report.path, { waitUntil: 'networkidle' });

      await expect(control(page, report.legend)).toBeVisible();
      await expect(page.getByRole('radio', { name: report.initial, exact: true })).toBeChecked();
      await expect(header(page)).toContainText(report.initial);

      await page.getByRole('radio', { name: report.other, exact: true }).check();
      await expect(header(page)).toContainText(report.other);
      await page.waitForTimeout(SETTLE_MS);
      expect(await shifts(page)).toEqual([]);

      const { scrollWidth, innerWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
      expect(scrollWidth).toBe(innerWidth);
      expect(errors).toEqual([]);
    });

    test('works from the keyboard: Tab enters on the choice, an arrow key moves it, the live region says what is shown', async ({ page }) => {
      await page.goto(report.path, { waitUntil: 'networkidle' });
      const live = page.locator('.report-figure [aria-live="polite"]');
      await expect(live).toBeVisible();
      await expect(live).toHaveText(new RegExp(`^Showing .*${report.initial}: .+\\.$`));

      // the disclosure just above the figure, then one Tab
      await page.locator('details.report-details > summary').focus();
      await page.keyboard.press('Tab');
      await expect(page.getByRole('radio', { name: report.initial, exact: true })).toBeFocused();
      await page.keyboard.press('ArrowLeft');

      const previous = page.getByRole('radio', { name: report.previous, exact: true });
      await expect(previous).toBeChecked();
      await expect(previous).toBeFocused();
      await expect(header(page)).toContainText(report.previous);
      await expect(live).toHaveText(new RegExp(`^Showing .*${report.previous}: .+\\.$`));
    });

    test('moves the marks to a new choice only while motion is allowed', async ({ page }) => {
      const running = async () => {
        await page.waitForTimeout(SETTLE_MS);
        await page.getByRole('radio', { name: report.other, exact: true }).check();
        return page.evaluate(() => document.getAnimations().filter((animation) => (animation.effect as KeyframeEffect | null)?.target?.closest('.report-hero')).length);
      };
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.goto(report.path, { waitUntil: 'networkidle' });
      expect(await running()).toBeGreaterThan(0);

      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(report.path, { waitUntil: 'networkidle' });
      expect(await running()).toBe(0);
    });
  });
}

test.describe('without script', () => {
  test.use({ javaScriptEnabled: false });

  for (const report of EXPLORABLES) {
    test(`${report.path} shows the report figure alone, with no control`, async ({ page }) => {
      await page.goto(report.path);
      await expect(page.locator('fieldset.report-explore')).toBeHidden();
      await expect(page.locator('.report-explore-now')).toBeHidden();
      await expect(page.locator('.report-figure .report-hero svg')).toBeVisible();
      await expect(header(page)).toContainText(report.initial);
    });
  }
});

test('loads the control only on the report pages that draw one', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'what loads does not depend on the viewport');
  const scriptsOf = async (path: string) => {
    const urls = new Set<string>();
    const record = (response: { url(): string; request(): { resourceType(): string } }) => {
      if (response.request().resourceType() === 'script') urls.add(new URL(response.url()).pathname);
    };
    page.on('response', record);
    await page.goto(path, { waitUntil: 'networkidle' });
    page.off('response', record);
    return urls;
  };
  const plain = await scriptsOf(PLAIN_REPORT);
  for (const report of EXPLORABLES) {
    const own = [...(await scriptsOf(report.path))].filter((url) => !plain.has(url));
    // one chunk of its own, and it is the control's
    expect(own, report.path).toHaveLength(1);
    const source = await (await page.request.get(own[0])).text();
    expect(source, own[0]).toContain('report-explore');
  }
});
