// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import { describe, expect, it } from 'vitest';
import tailwindConfig from '../../../tailwind.config';

// Design-token ratchet (Phase R3). Named type roles live in the Tailwind theme,
// and the off-scale patterns they replace are counted over src/ so a count can
// only go down: arbitrary sizes, tracking and shadows, the 16-24px radii, raw
// palette hues, transition-all, in-flow backdrop blur and the retired panel
// classes. The /show scenes and the galactic landing draw with their own
// values and are exempt, as the motion ratchet exempts them.

const SRC = path.join(process.cwd(), 'src');
const GLOBALS_CSS = path.join(SRC, 'app', 'globals.css');
const EXEMPT_DIRS = [path.join(SRC, 'components', 'scenes'), path.join(SRC, 'components', 'galactic')];
// the floating layers that may blur what is behind them
const BACKDROP_ALLOWED_FILES = new Set([
  path.join('components', 'Header.tsx'),
  path.join('components', 'SearchDialog.tsx'),
  path.join('components', 'AccessibilityPanel.tsx'),
]);
// the header's own glass layer in globals.css
const HEADER_RULES = /\.site-header[^{},]*\{[^}]*\}/g;

const HUES = 'red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone';
const PATTERNS = {
  arbitraryFontSize: /(?<![\w-])text-\[[\d.]+(?:px|rem)\]/g,
  arbitraryTracking: /(?<![\w-])tracking-\[[^\]\s]+\]/g,
  arbitraryShadow: /(?<![\w-])shadow-\[[^\]\s]+\]/g,
  largeRadius: /(?<![\w-])rounded-(?:[trbl]{1,2}-)?(?:2xl|3xl)(?![\w-])/g,
  paletteHue: new RegExp(`(?<![\\w-])(?:text|bg|border|from|via|to|ring|fill|stroke)-(?:${HUES})-\\d{2,3}(?![\\w-])`, 'g'),
  transitionAll: /(?<![\w-])transition-all(?![\w-])/g,
  backdrop: /backdrop-blur|backdrop-filter|backdropFilter/g,
  signalPanel: /(?<![\w-])signal-panel(?:-strong)?(?![\w-])/g,
  signalPill: /(?<![\w-])signal-pill(?![\w-])/g,
  signalDivider: /(?<![\w-])signal-divider(?![\w-])/g,
  glassUltra: /(?<![\w-])glass-ultra(?![\w-])/g,
  shellWallpaper: /\.chimera-shell::before/g,
} as const;
type Pattern = keyof typeof PATTERNS;

// Counts on main at de0922c (R1 + R2 merged), before R3.
const MAIN_COUNTS: Record<Pattern, number> = {
  arbitraryFontSize: 96,
  arbitraryTracking: 54,
  arbitraryShadow: 8,
  largeRadius: 14,
  paletteHue: 13,
  transitionAll: 0,
  backdrop: 10,
  signalPanel: 55,
  signalPill: 18,
  signalDivider: 2,
  glassUltra: 2,
  shellWallpaper: 1,
};

// The most each pattern may count. Lower a ceiling whenever a count drops;
// raising one is a regression.
const CEILINGS: Record<Pattern, number> = {
  arbitraryFontSize: 74,
  arbitraryTracking: 21,
  arbitraryShadow: 7,
  largeRadius: 2,
  paletteHue: 0,
  transitionAll: 0,
  backdrop: 0,
  signalPanel: 2,
  signalPill: 6,
  signalDivider: 0,
  glassUltra: 0,
  shellWallpaper: 0,
};

// Patterns whose every use sat on a page R3-B rebuilt, which R3-A left at
// main's count. R3-B emptied it: glass-ultra went with EpisodeCard and
// signal-divider with the old episode head. A new entry is a regression.
const LEFT_FOR_PAGE_WORK: Pattern[] = [];

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full);
    return /\.(tsx?|css)$/.test(entry.name) ? [full] : [];
  });
}

const isExempt = (file: string) => EXEMPT_DIRS.some((dir) => file.startsWith(dir + path.sep));

/** occurrences of each pattern in one file, as the ratchet counts them */
export function countPatterns(file: string, source: string): Record<Pattern, number> {
  const relative = path.relative(SRC, file);
  const css = file.endsWith('.css');
  const text = css ? source.replace(/\/\*[\s\S]*?\*\//g, '') : source;
  const counts = {} as Record<Pattern, number>;
  for (const [name, pattern] of Object.entries(PATTERNS) as [Pattern, RegExp][]) {
    let scanned = text;
    if (name === 'backdrop') {
      if (BACKDROP_ALLOWED_FILES.has(relative)) scanned = '';
      else if (css) scanned = text.replace(HEADER_RULES, '');
    }
    counts[name] = (scanned.match(pattern) ?? []).length;
  }
  return counts;
}

function countTree(): Record<Pattern, number> {
  const totals = Object.fromEntries(Object.keys(PATTERNS).map((name) => [name, 0])) as Record<Pattern, number>;
  for (const file of sourceFiles(SRC).filter((f) => !isExempt(f))) {
    const counts = countPatterns(file, fs.readFileSync(file, 'utf8'));
    for (const name of Object.keys(totals) as Pattern[]) totals[name] += counts[name];
  }
  return totals;
}

describe('type roles', () => {
  const fontSize = tailwindConfig.theme?.extend?.fontSize as Record<string, [string, Record<string, string>]>;
  const css = fs.readFileSync(GLOBALS_CSS, 'utf8');
  const rem = (value: string) => parseFloat(value) * 16;

  it.each([
    // role, size px, line height, tracking, weight
    ['heading-32', 32, '1.2', '-0.02em', '600'],
    ['heading-24', 24, '1.3333', '-0.02em', '600'],
    ['heading-20', 20, '1.375', '-0.015em', '600'],
    ['copy-18', 18, '1.6', undefined, undefined],
    ['copy-17', 17, '1.6', undefined, undefined],
    ['copy-16', 16, '1.625', undefined, undefined],
    ['copy-14', 14, '1.6', undefined, undefined],
    ['label-13', 13, '1.25rem', undefined, undefined],
    ['label-12-mono', 12, '1rem', '0.06em', '500'],
  ])('names %s at %ipx', (role, px, lineHeight, tracking, weight) => {
    const [size, options] = fontSize[role];
    expect(rem(size)).toBe(px);
    expect(options.lineHeight).toBe(lineHeight);
    expect(options.letterSpacing).toBe(tracking);
    expect(options.fontWeight).toBe(weight);
  });

  it('steps the page title from 28px on phones through 36px to 48px on desktop, at -0.025em and 600', () => {
    const [size, options] = fontSize['heading-48'];
    expect(size).toBe('var(--type-heading-48)');
    expect(options).toEqual({ lineHeight: 'var(--leading-heading-48)', letterSpacing: '-0.025em', fontWeight: '600' });
    const at = (query: string | null) => {
      const scope = query ? new RegExp(`@media \\(min-width: ${query}\\) \\{\\s*:root \\{([^}]*)\\}`).exec(css)?.[1] : /:root \{([^}]*--type-heading-48[^}]*)\}/.exec(css)?.[1];
      return rem(/--type-heading-48:\s*([\d.]+rem)/.exec(scope ?? '')?.[1] ?? 'NaN');
    };
    expect([at(null), at('640px'), at('768px')]).toEqual([28, 36, 48]);
  });

  it('extends the default scale rather than replacing it, so pages outside R3 keep rendering', () => {
    expect(tailwindConfig.theme?.fontSize).toBeUndefined();
  });

  it('builds the label roles whole: 13 with tabular figures, 12 in uppercase mono', async () => {
    const { css: built } = await postcss([
      tailwindcss({ ...tailwindConfig, content: [{ raw: '<p class="text-label-13 text-label-12-mono">', extension: 'html' }] }),
    ]).process('@tailwind utilities;', { from: undefined });
    const rules = (selector: string) =>
      [...built.matchAll(new RegExp(`\\.${selector}\\s*\\{([^}]*)\\}`, 'g'))].map((m) => m[1]).join(';');
    expect(rules('text-label-13')).toMatch(/font-variant-numeric:\s*tabular-nums/);
    expect(rules('text-label-12-mono')).toMatch(/text-transform:\s*uppercase/);
    expect(rules('text-label-12-mono')).toMatch(/font-family:\s*var\(--font-mono\)/);
    expect(rules('text-label-12-mono')).toMatch(/letter-spacing:\s*0\.06em/);
  });
});

// The ratchet is only as good as its detectors: prove each fires, and fires
// only where it should.
describe('token ratchet detectors', () => {
  const plain = path.join(SRC, 'components', 'Plain.tsx');
  const header = path.join(SRC, 'components', 'Header.tsx');
  const count = (file: string, source: string, name: Pattern) => countPatterns(file, source)[name];

  it('counts arbitrary sizes, tracking and shadows, with or without a variant', () => {
    expect(count(plain, '<p className="text-[11px] md:text-[0.9375rem] text-sm" />', 'arbitraryFontSize')).toBe(2);
    expect(count(plain, '<p className="tracking-[0.2em] tracking-tight" />', 'arbitraryTracking')).toBe(1);
    expect(count(plain, '<p className="shadow-[0_0_12px_red] hover:shadow-[inset_0_1px_0_red] shadow-lg" />', 'arbitraryShadow')).toBe(2);
  });

  it('counts the 16 and 24px radii and raw palette hues, not the tokens', () => {
    expect(count(plain, '<p className="rounded-2xl rounded-t-3xl rounded-xl" />', 'largeRadius')).toBe(2);
    expect(count(plain, '<p className="text-green-400 bg-slate-900/50 text-status-green text-primary" />', 'paletteHue')).toBe(2);
    expect(count(plain, '<p className="transition-all transition-colors" />', 'transitionAll')).toBe(1);
  });

  it('counts backdrop blur outside the floating layers, and the header glass is not counted', () => {
    expect(count(plain, '<div className="backdrop-blur-md" />', 'backdrop')).toBe(1);
    expect(count(header, '<div className="backdrop-blur" />', 'backdrop')).toBe(0);
    const css = '.site-header::before { backdrop-filter: blur(16px); } .panel { backdrop-filter: blur(4px); }';
    expect(count(GLOBALS_CSS, css, 'backdrop')).toBe(1);
  });

  it('counts the retired panel classes and the wallpaper grid, and nothing that merely shares a prefix', () => {
    expect(count(plain, '<div className="signal-panel signal-panel-strong signal-panelx" />', 'signalPanel')).toBe(2);
    expect(count(plain, '<span className="signal-pill" />', 'signalPill')).toBe(1);
    expect(count(GLOBALS_CSS, '.chimera-shell::before { content: ""; } /* .chimera-shell::before */', 'shellWallpaper')).toBe(1);
  });
});

describe('token ratchet', () => {
  it('scans the whole tree outside the scenes and the landing', () => {
    const files = sourceFiles(SRC);
    for (const known of ['app/globals.css', 'app/papers/page.tsx', 'components/Header.tsx', 'components/Footer.tsx']) {
      expect(files).toContain(path.join(SRC, known));
    }
    expect(files.filter(isExempt).length).toBeGreaterThan(0);
  });

  it('never lets a count rise above its ceiling', () => {
    const counts = countTree();
    const over = (Object.keys(CEILINGS) as Pattern[]).filter((name) => counts[name] > CEILINGS[name]).map((name) => `${name}: ${counts[name]} > ${CEILINGS[name]}`);
    expect(over).toEqual([]);
  });

  it('never sets a ceiling above main', () => {
    for (const name of Object.keys(MAIN_COUNTS) as Pattern[]) expect(CEILINGS[name], name).toBeLessThanOrEqual(MAIN_COUNTS[name]);
  });

  it('holds every ceiling below main, except where main already had none or only page work can lower it', () => {
    for (const name of Object.keys(MAIN_COUNTS) as Pattern[]) {
      if (MAIN_COUNTS[name] === 0 || LEFT_FOR_PAGE_WORK.includes(name)) continue;
      expect(CEILINGS[name], name).toBeLessThan(MAIN_COUNTS[name]);
    }
    // and each listed exception really is still at main, so the list cannot go stale
    for (const name of LEFT_FOR_PAGE_WORK) expect(CEILINGS[name], name).toBe(MAIN_COUNTS[name]);
  });

  it('keeps each ceiling at the current count, so a drop is locked in', () => {
    const counts = countTree();
    expect(CEILINGS).toEqual(counts);
  });
});
