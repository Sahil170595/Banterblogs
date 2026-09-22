import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Report reading type (Phase R2, B10): prose at 17-18px on 1.55-1.6 leading in
// a prose colour of at least 12:1, a 62-68ch measure, h2 at 22-28px and
// 560-600 weight on -0.02em, h3 at 18-20px and 600, links that change only
// their underline colour, and no more than seven font sizes on the page with
// the header and footer. The rules live in one delimited report-page block of
// globals.css.

const GLOBALS_CSS = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8');
const START = GLOBALS_CSS.indexOf('/* report page');
const END = GLOBALS_CSS.indexOf('/* end report page */');
const BLOCK = START >= 0 && END > START ? GLOBALS_CSS.slice(START, END).replace(/\/\*[\s\S]*?\*\//g, '') : '';

const ROOT_PX = 16;
const MIN_CONTRAST = 12;
// Manrope's running text averages this much of an em a character (measured on
// TR138 at 18px: 8.06px); its zero, the CSS ch, is 0.61em, so a ch measure
// would overstate the line by a third
const MANROPE_AVG_CHAR_EM = 0.448;
const CHARS_PER_LINE = { min: 65, max: 80 };
const MAX_SIZES_ON_PAGE = 7;
// the text sizes the header and footer already put on every interior page
// (Phase R3: Header.tsx wordmark and nav 12px, search 14 on desktop and 16 in
// the phone menu, menu links 12 and 14; Footer.tsx wordmark and headings 12,
// links 14)
const CHROME_SIZES_PX = { phone: [12, 14, 16], desktop: [12, 14] };
const DESKTOP_QUERY = '@media (min-width: 768px)';

// top-level blocks with their bodies, braces balanced
function blocks(css: string): Array<{ prelude: string; body: string }> {
  const out: Array<{ prelude: string; body: string }> = [];
  let start = 0;
  let depth = 0;
  let open = -1;
  for (let i = 0; i < css.length; i++) {
    if (css[i] === '{') {
      if (depth === 0) open = i;
      depth++;
    } else if (css[i] === '}' && --depth === 0) {
      out.push({ prelude: css.slice(start, open).trim(), body: css.slice(open + 1, i) });
      start = i + 1;
    }
  }
  return out;
}
const rulesIn = (body: string) =>
  [...body.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, declarations]) => ({ selector: selector.trim(), declarations }));
const TOP = blocks(BLOCK);
const baseRules = TOP.filter((b) => !b.prelude.startsWith('@')).map((b) => ({ selector: b.prelude, declarations: b.body }));
const desktopRules = TOP.filter((b) => b.prelude === DESKTOP_QUERY).flatMap((b) => rulesIn(b.body));
const declarationsOf = (rules: typeof baseRules, selector: string) =>
  rules
    .filter((rule) => rule.selector.split(',').map((s) => s.trim()).includes(selector))
    .map((rule) => rule.declarations)
    .join(';');
const value = (declarations: string, property: string) => new RegExp(`(?:^|[;\\s])${property}:\\s*([^;]+)`).exec(declarations)?.[1].trim();
const px = (size: string) => (size.endsWith('rem') ? parseFloat(size) * ROOT_PX : size.endsWith('px') ? parseFloat(size) : NaN);

// WCAG 2 relative luminance of an `H S% L%` token
function luminance(hsl: string): number {
  const [h, s, l] = hsl.split(/\s+/).map((part) => parseFloat(part));
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(8) + 0.0722 * channel(4);
}
const token = (css: string, name: string) => new RegExp(`--${name}:\\s*([\\d.]+ [\\d.]+% [\\d.]+%)`).exec(css)?.[1];

describe('report reading type', () => {
  it('lives in one delimited block of globals.css', () => {
    expect(BLOCK).not.toBe('');
  });

  it('sets prose in its own colour token at 12:1 or better on the page background', () => {
    const prose = token(BLOCK, 'prose');
    const background = token(GLOBALS_CSS, 'background');
    expect(prose).toBeDefined();
    const ratio = (luminance(prose!) + 0.05) / (luminance(background!) + 0.05);
    expect(ratio).toBeGreaterThanOrEqual(MIN_CONTRAST);
    // the muted grey it replaces measured 8.87:1
    const muted = (luminance(token(GLOBALS_CSS, 'muted-foreground')!) + 0.05) / (luminance(background!) + 0.05);
    expect(ratio).toBeGreaterThan(muted);
    expect(value(declarationsOf(baseRules, '.report-prose'), 'color')).toBe('hsl(var(--prose))');
  });

  it('sets prose at 17-18px on 1.55-1.6 leading in a measure of 65-80 characters a line', () => {
    const prose = declarationsOf(baseRules, '.report-prose');
    const size = px(value(prose, 'font-size')!);
    expect(size).toBeGreaterThanOrEqual(17);
    expect(size).toBeLessThanOrEqual(18);
    expect(Number(value(prose, 'line-height'))).toBeGreaterThanOrEqual(1.55);
    expect(Number(value(prose, 'line-height'))).toBeLessThanOrEqual(1.6);
    // the spec's 62-68ch sets 84-93 Manrope characters; the line limit is the one kept
    const measure = value(prose, 'max-width')!;
    expect(measure).toMatch(/rem$/);
    const charsPerLine = px(measure) / (size * MANROPE_AVG_CHAR_EM);
    expect(charsPerLine).toBeGreaterThanOrEqual(CHARS_PER_LINE.min);
    expect(charsPerLine).toBeLessThanOrEqual(CHARS_PER_LINE.max);
  });

  it('sets h2 at 22-28px, 560-600 weight, -0.02em; h3 at 18-20px and 600', () => {
    const h2 = declarationsOf(baseRules, '.report-prose h2');
    expect(px(value(h2, 'font-size')!)).toBeGreaterThanOrEqual(22);
    expect(px(value(h2, 'font-size')!)).toBeLessThanOrEqual(28);
    expect(Number(value(h2, 'font-weight'))).toBeGreaterThanOrEqual(560);
    expect(Number(value(h2, 'font-weight'))).toBeLessThanOrEqual(600);
    expect(value(h2, 'letter-spacing')).toBe('-0.02em');
    const h3 = declarationsOf(baseRules, '.report-prose h3');
    expect(px(value(h3, 'font-size')!)).toBeGreaterThanOrEqual(18);
    expect(px(value(h3, 'font-size')!)).toBeLessThanOrEqual(20);
    expect(value(h3, 'font-weight')).toBe('600');
  });

  it('sets table cells in the prose colour and keeps numeric columns tabular and right-aligned', () => {
    expect(value(declarationsOf(baseRules, '.report-prose td'), 'color')).toBe('hsl(var(--prose))');
    // Phase 0's rules, outside this block
    expect(GLOBALS_CSS).toMatch(/\.table-scroll :is\(th, td\) \{\s*font-variant-numeric: tabular-nums;/);
    expect(GLOBALS_CSS).toMatch(/\.table-scroll \.num \{\s*text-align: right;/);
  });

  it('turns a link underline ember on hover and changes nothing else: colour only, no motion', () => {
    const link = declarationsOf(baseRules, '.report-prose a');
    const hover = declarationsOf(baseRules, '.report-prose a:hover');
    expect(value(link, 'text-decoration-line')).toBe('underline');
    expect(value(hover, 'text-decoration-color')).toBe('hsl(var(--primary))');
    expect(hover.split(';').map((d) => d.split(':')[0].trim()).filter(Boolean)).toEqual(['text-decoration-color']);
    expect(value(link, 'transition')).toMatch(/^text-decoration-color var\(--duration-fast\) var\(--ease-standard\)$/);
  });

  it('keeps the whole page to seven font sizes or fewer, header and footer included', () => {
    // every size in the block is a fixed rem or px value (no em compounding) or inherits
    const declared = [...BLOCK.matchAll(/font-size:\s*([^;}]+)/g)].map((m) => m[1].trim());
    expect(declared.length).toBeGreaterThan(0);
    for (const size of declared) expect(size === 'inherit' || !Number.isNaN(px(size)), size).toBe(true);

    const sizesFor = (rules: typeof baseRules) =>
      new Map(rules.flatMap((rule) => {
        const size = value(rule.declarations, 'font-size');
        return size && size !== 'inherit' ? rule.selector.split(',').map((s): [string, number] => [s.trim(), px(size)]) : [];
      }));
    const phone = sizesFor(baseRules);
    const desktop = new Map([...phone, ...sizesFor(desktopRules)]);
    const phoneSizes = new Set([...CHROME_SIZES_PX.phone, ...phone.values()]);
    const desktopSizes = new Set([...CHROME_SIZES_PX.desktop, ...desktop.values()]);
    expect([...phoneSizes].sort((a, b) => a - b).length, [...phoneSizes].join(',')).toBeLessThanOrEqual(MAX_SIZES_ON_PAGE);
    expect([...desktopSizes].sort((a, b) => a - b).length, [...desktopSizes].join(',')).toBeLessThanOrEqual(MAX_SIZES_ON_PAGE);
  });

  it('keeps each breadcrumb separator with the crumb before it, so a wrapped crumb never opens on a slash', () => {
    expect(value(declarationsOf(baseRules, '.report-crumbs li:not(:last-child)::after'), 'content')).toBe('"/"');
    expect(BLOCK).not.toMatch(/\.report-crumbs li \+ li::before/);
  });

  it('sets the title at 40-48px, 600 weight and about -0.03em on desktop', () => {
    const title = declarationsOf(desktopRules, '.report-title');
    const base = declarationsOf(baseRules, '.report-title');
    expect(px(value(title, 'font-size')!)).toBeGreaterThanOrEqual(40);
    expect(px(value(title, 'font-size')!)).toBeLessThanOrEqual(48);
    expect(value(base, 'font-weight')).toBe('600');
    expect(value(base, 'letter-spacing')).toBe('-0.03em');
  });
});

// Phase R4 (re-judge 3 P0-1, perf re-judge P1-3): opening TR138 spent about
// 200ms styling and laying out its whole 60,000px body inside the view
// transition (CDP trace, local production build), before a frame could move.
// Blocks off screen now skip style, layout and paint until they near the
// viewport, and remember their size once drawn. content-visibility contains
// layout and paint, so it goes only on blocks whose margins collapse with
// their siblings, not their children, and that paint inside their own box.
describe('report body rendering', () => {
  const SKIPPED_BLOCKS = ['.report-prose > p', '.report-prose > pre', '.report-prose > .table-scroll'];
  const printRules = TOP.filter((b) => b.prelude === '@media print').flatMap((b) => rulesIn(b.body));

  it.each(SKIPPED_BLOCKS)('skips %s off screen, and keeps its drawn size once rendered', (selector) => {
    const declarations = declarationsOf(baseRules, selector);
    expect(value(declarations, 'content-visibility')).toBe('auto');
    // a height estimate only: the column sets the width
    expect(value(declarations, 'contain-intrinsic-block-size')).toMatch(/^auto var\(--prose-estimate-[\w-]+\)$/);
  });

  it('skips nothing else: lists, quotes, headings and figures would change under layout containment', () => {
    const skipping = baseRules.filter((rule) => /content-visibility:\s*auto/.test(rule.declarations));
    expect(skipping.flatMap((rule) => rule.selector.split(',').map((s) => s.trim())).sort()).toEqual([...SKIPPED_BLOCKS].sort());
  });

  it('renders every block for print', () => {
    expect(value(declarationsOf(printRules, '.report-prose > *'), 'content-visibility')).toBe('visible');
  });
});
