import { expect, test, type Page } from '@playwright/test';
import sharp from 'sharp';

// The landing poster is the real black hole, and on phones its lensed arc
// sits behind the hero copy. The copy's calls to action must stay readable
// over whatever the art puts behind them: this measures each link's colour
// against the rendered pixels under its text (text hidden), at both
// project viewports, on the poster (reduced motion).
//
// Final WIG re-judge P1-D: on landscape phones and short windows the poster,
// laid out by height, put the disk behind the whole block (body copy 1.4:1,
// "Papers" 2.4:1). Those viewports measure every line of the copy.

const WCAG_AA_NORMAL_TEXT = 4.5;
const WCAG_AA_LARGE_TEXT = 3;
// WCAG large text: 24px, or 18.66px at bold
const LARGE_TEXT_PX = 24;
const LARGE_BOLD_TEXT_PX = 18.66;
const BOLD_WEIGHT = 700;
// the ratio 95% of the pixels under the text reach; a lone star can dip below
const PERCENTILE = 0.05;
const CALLS_TO_ACTION = ['/reports', '/papers'];
const SHORT_VIEWPORTS = [
  { name: 'landscape phone 844x390', viewport: { width: 844, height: 390 }, touch: true },
  { name: 'landscape phone 667x375', viewport: { width: 667, height: 375 }, touch: true },
  { name: 'short window 1024x640', viewport: { width: 1024, height: 640 }, touch: false },
];

type Rgb = [number, number, number];
type Run = { label: string; box: { x: number; y: number; width: number; height: number }; color: Rgb; alpha: number; need: number };

const channel = (value: number) => {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]: Rgb) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const contrast = (a: Rgb, b: Rgb) => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
};

async function openPoster(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-scene-poster] img')).toHaveJSProperty('complete', true);
}

// each run's colour against the pixels under it, the text hidden
async function measure(page: Page, runs: Run[]) {
  await page.addStyleTag({ content: 'section.group\\/hero * { color: transparent !important; text-shadow: none !important; }' });
  const results: Array<{ label: string; ratio: number; need: number }> = [];
  for (const run of runs) {
    const shot = await page.screenshot({ clip: run.box, animations: 'disabled' });
    const { data, info } = await sharp(shot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const ratios: number[] = [];
    for (let i = 0; i < info.width * info.height * 3; i += 3) {
      const background: Rgb = [data[i], data[i + 1], data[i + 2]];
      const text = run.color.map((c, k) => c * run.alpha + background[k] * (1 - run.alpha)) as Rgb;
      ratios.push(contrast(text, background));
    }
    ratios.sort((a, b) => a - b);
    results.push({ label: run.label, ratio: ratios[Math.floor(ratios.length * PERCENTILE)], need: run.need });
  }
  return results;
}

test('the hero calls to action keep 4.5:1 over the landing art', async ({ page }) => {
  await openPoster(page);
  const runs = await page.evaluate(
    ({ hrefs, need }) => {
      const hero = document.querySelector('section.group\\/hero')!;
      return hrefs.map((href) => {
        const link = hero.querySelector<HTMLAnchorElement>(`a[href="${href}"]`)!;
        const text = [...link.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
        const range = document.createRange();
        range.selectNodeContents(text ?? link);
        const { x, y, width, height } = range.getBoundingClientRect();
        const [r, g, b, alpha = 1] = (getComputedStyle(link).color.match(/[\d.]+/g) ?? []).map(Number);
        return { label: href, box: { x, y, width, height }, color: [r, g, b] as [number, number, number], alpha, need };
      });
    },
    { hrefs: CALLS_TO_ACTION, need: WCAG_AA_NORMAL_TEXT },
  );
  for (const result of await measure(page, runs)) {
    expect(result.ratio, `${result.label} link contrast over the landing art`).toBeGreaterThanOrEqual(result.need);
  }
});

for (const { name, viewport, touch } of SHORT_VIEWPORTS) {
  test.describe(name, () => {
    test.use({ viewport, isMobile: touch, hasTouch: touch });

    test('every line of the hero copy keeps AA over the landing art', async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'the viewport is set here: one run is enough');
      await openPoster(page);
      const runs = await page.evaluate(
        ({ normal, large, largePx, largeBoldPx, bold }) => {
          const copy = document.querySelector('section.group\\/hero h1')!.parentElement!;
          const out: Run[] = [];
          const walker = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const label = node.textContent?.trim();
            const parent = node.parentElement;
            if (!label || !parent || parent.closest('[aria-hidden="true"], .sr-only')) continue;
            const range = document.createRange();
            range.selectNodeContents(node);
            // one box per line the run wraps onto
            for (const { x, y, width, height } of range.getClientRects()) {
              if (width < 1 || height < 1) continue;
              const style = getComputedStyle(parent);
              const [r, g, b, alpha = 1] = (style.color.match(/[\d.]+/g) ?? []).map(Number);
              const size = parseFloat(style.fontSize);
              const isLarge = size >= largePx || (size >= largeBoldPx && Number(style.fontWeight) >= bold);
              out.push({ label, box: { x, y, width, height }, color: [r, g, b], alpha, need: isLarge ? large : normal });
            }
          }
          return out;
        },
        { normal: WCAG_AA_NORMAL_TEXT, large: WCAG_AA_LARGE_TEXT, largePx: LARGE_TEXT_PX, largeBoldPx: LARGE_BOLD_TEXT_PX, bold: BOLD_WEIGHT },
      );
      expect(runs.length).toBeGreaterThan(4);
      const failures = (await measure(page, runs))
        .filter((result) => result.ratio < result.need)
        .map((result) => `"${result.label}" ${result.ratio.toFixed(2)}:1 < ${result.need}`);
      expect(failures).toEqual([]);
    });
  });
}
