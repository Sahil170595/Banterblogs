// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import { describe, expect, it } from 'vitest';
import tailwindConfig from '../../tailwind.config';
import readingConfig from '../../tailwind.reading.config';

// The reading pages' styles (perf re-judge P1-1): the typography plugin's
// .prose, the report page's .report-* rules and the markdown tables were
// ~22 KB of the one render-blocking stylesheet every page downloads before
// first paint. They live in app/reading.css, which only the reading routes
// import, built by its own Tailwind config that emits the typography
// components and nothing else.

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const read = (file: string) => fs.readFileSync(path.join(SRC, file), 'utf8');
const GLOBALS = read('app/globals.css');
const READING = read('app/reading.css');
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

const READING_ROUTES = ['app/reports/[id]/page.tsx', 'app/reports/compendium/page.tsx', 'app/episodes/[slug]/page.tsx'];
const READING_IMPORT = /^import ['"]@\/app\/reading\.css['"];?$/m;

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

async function build(config: typeof tailwindConfig, css: string, from: string) {
  return (await postcss([tailwindcss(config)]).process(css, { from })).css;
}

describe('reading stylesheet', () => {
  it('keeps the reading-page rules out of the global stylesheet', () => {
    const globals = stripComments(GLOBALS);
    expect(globals).not.toMatch(/\.report-(?:prose|crumbs|title|dek|meta|details|hero|toc|progress|pager|frame|layout)\b/);
    expect(globals).not.toMatch(/\.prose\b/);
    // the table's own rules; the site focus ring may still name it among the keyboard's scroll boxes
    expect(globals).not.toMatch(/(?:^|\})\s*\.table-scroll\b/);
    // the tokens every page uses stay global: text-prose and the header height
    expect(globals).toMatch(/--prose:\s*36 10% 86%;/);
    expect(globals).toMatch(/--site-header-height:\s*73px;/);
  });

  it('holds them in app/reading.css, built from its own Tailwind config', () => {
    const css = stripComments(READING);
    expect(READING).toMatch(/^@config "\.\.\/\.\.\/tailwind\.reading\.config\.ts";/m);
    expect(css).toMatch(/@tailwind components;/);
    expect(css).not.toMatch(/@tailwind (?:base|utilities);/);
    for (const selector of ['.report-prose', '.report-title', '.report-hero', '.report-toc', '.report-progress', '.table-scroll']) {
      expect(css, selector).toContain(`${selector} `);
    }
  });

  it('is imported by the three reading routes and nowhere else', () => {
    for (const route of READING_ROUTES) expect(read(route), route).toMatch(READING_IMPORT);
    const importers = sourceFiles(SRC)
      .filter((file) => READING_IMPORT.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(SRC, file).split(path.sep).join('/'))
      .sort();
    expect(importers).toEqual([...READING_ROUTES].sort());
  });

  // Tailwind 3 keeps the last `@config` path on its PostCSS plugin: with only
  // reading.css naming one, a build that processed it first compiled
  // globals.css against the reading config ("rounded-3xl does not exist").
  // Each sheet names its own config, so the order cannot matter.
  it('compiles both sheets with one plugin instance in either order, each against its own config', async () => {
    expect(GLOBALS).toMatch(/^@config "\.\.\/\.\.\/tailwind\.config\.ts";/m);
    const plugin = tailwindcss();
    const compile = async (file: 'globals' | 'reading') =>
      (await postcss([plugin]).process(file === 'globals' ? GLOBALS : READING, { from: path.join(SRC, 'app', `${file}.css`) })).css;
    for (const order of [['reading', 'globals'], ['globals', 'reading']] as const) {
      const [first, second] = [await compile(order[0]), await compile(order[1])];
      const [globals, reading] = order[0] === 'globals' ? [first, second] : [second, first];
      expect(globals, order.join(' then ')).toMatch(/\.signal-panel \{/);
      expect(globals, order.join(' then ')).not.toMatch(/\.prose\b/);
      expect(reading, order.join(' then ')).toMatch(/\.prose \{/);
    }
  });

  it('builds the typography components only into the reading sheet', async () => {
    expect(tailwindConfig.plugins?.length).toBeGreaterThan(0);
    const globalsBuilt = await build(
      { ...tailwindConfig, content: [{ raw: '<div class="report-prose prose prose-invert">', extension: 'html' }] },
      '@tailwind components; @tailwind utilities;',
      path.join(SRC, 'app', 'globals.css'),
    );
    expect(globalsBuilt).not.toMatch(/\.prose\b/);

    const readingBuilt = await build(readingConfig, '@tailwind components;', path.join(SRC, 'app', 'reading.css'));
    expect(readingBuilt).toMatch(/\.prose \{/);
    expect(readingBuilt).toMatch(/\.prose-invert \{/);
    // nothing but the typography components: no container, no utilities, no preflight
    expect(readingBuilt).not.toMatch(/\.container\b|\*, ::before, ::after|\.flex \{/);
  });
});
