import { expect, test } from '@playwright/test';
import sharp from 'sharp';

// The landing poster is the real black hole, and on phones its lensed arc
// sits behind the hero copy. The copy's calls to action must stay readable
// over whatever the art puts behind them: this measures each link's colour
// against the rendered pixels under its text (text hidden), at both
// project viewports, on the poster (reduced motion).

const WCAG_AA_NORMAL_TEXT = 4.5;
// the ratio 95% of the pixels under the text reach; a lone star can dip below
const PERCENTILE = 0.05;
const CALLS_TO_ACTION = ['/reports', '/papers'];

type Rgb = [number, number, number];

const channel = (value: number) => {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]: Rgb) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const contrast = (a: Rgb, b: Rgb) => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
};

test('the hero calls to action keep 4.5:1 over the landing art', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-scene-poster] img')).toHaveJSProperty('complete', true);

  const links = await page.evaluate((hrefs) => {
    const hero = document.querySelector('section.group\\/hero')!;
    return hrefs.map((href) => {
      const link = hero.querySelector<HTMLAnchorElement>(`a[href="${href}"]`)!;
      const text = [...link.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
      const range = document.createRange();
      range.selectNodeContents(text ?? link);
      const { x, y, width, height } = range.getBoundingClientRect();
      const [r, g, b, alpha = 1] = (getComputedStyle(link).color.match(/[\d.]+/g) ?? []).map(Number);
      return { href, box: { x, y, width, height }, color: [r, g, b] as [number, number, number], alpha };
    });
  }, CALLS_TO_ACTION);

  await page.addStyleTag({ content: 'section.group\\/hero * { color: transparent !important; text-shadow: none !important; }' });
  for (const link of links) {
    const shot = await page.screenshot({ clip: link.box, animations: 'disabled' });
    const { data, info } = await sharp(shot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const ratios: number[] = [];
    for (let i = 0; i < info.width * info.height * 3; i += 3) {
      const background: Rgb = [data[i], data[i + 1], data[i + 2]];
      const text = link.color.map((c, k) => c * link.alpha + background[k] * (1 - link.alpha)) as Rgb;
      ratios.push(contrast(text, background));
    }
    ratios.sort((a, b) => a - b);
    const ratio = ratios[Math.floor(ratios.length * PERCENTILE)];
    expect(ratio, `${link.href} link contrast over the landing art`).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
  }
});
