import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import nextConfig from '../../next.config';

// The project catalog and the report locator walk folders by name, which
// Turbopack cannot trace, so their joins are marked turbopackIgnore and
// next.config declares the files instead. A route that reaches either reader
// without a matching include would build fine and then fail when rendered on
// demand, so every such route must be covered.

const SRC = path.resolve(__dirname, '..');
const APP = path.join(SRC, 'app');
const READERS = {
  'project.json': path.join(SRC, 'lib', 'projects', 'catalog.ts'),
  'PublishReady/reports': [path.join(SRC, 'lib', 'reports', 'locator.ts'), path.join(SRC, 'lib', 'reports', 'meta.ts')],
};
const ENTRY_FILES = ['page.tsx', 'route.ts'];
const SEGMENT_WRAPPERS = ['layout.tsx', 'template.tsx'];
const EXTENSIONS = ['.ts', '.tsx', '/index.ts', '/index.tsx'];
const IMPORT = /(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g;

// the matcher and options collect-build-traces.js applies to include keys
type Matcher = (glob: string, options: { dot: boolean; contains: boolean }) => (input: string) => boolean;
const picomatch = createRequire(import.meta.url)('next/dist/compiled/picomatch') as Matcher;

function resolveImport(from: string, specifier: string): string | null {
  const base = specifier.startsWith('@/')
    ? path.join(SRC, specifier.slice(2))
    : specifier.startsWith('.')
      ? path.resolve(path.dirname(from), specifier)
      : null;
  if (!base) return null;
  if (existsSync(base) && /\.(ts|tsx)$/.test(base)) return base;
  for (const ext of EXTENSIONS) if (existsSync(base + ext)) return base + ext;
  return null;
}

const closureCache = new Map<string, Set<string>>();
function importClosure(file: string, seen = new Set<string>()): Set<string> {
  if (seen.has(file)) return seen;
  seen.add(file);
  for (const [, specifier] of readFileSync(file, 'utf8').matchAll(IMPORT)) {
    const target = resolveImport(file, specifier);
    if (target) importClosure(target, seen);
  }
  return seen;
}

function closureOf(file: string): Set<string> {
  if (!closureCache.has(file)) closureCache.set(file, importClosure(file));
  return closureCache.get(file)!;
}

function entries(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : entries(full);
    return ENTRY_FILES.includes(entry.name) ? [full] : [];
  });
}

// a page also renders every layout above it
function rootsOf(entry: string): string[] {
  const roots = [entry];
  for (let dir = path.dirname(entry); dir.startsWith(APP); dir = path.dirname(dir)) {
    for (const wrapper of SEGMENT_WRAPPERS) if (existsSync(path.join(dir, wrapper))) roots.push(path.join(dir, wrapper));
  }
  return roots;
}

// the entry name the build matches against, e.g. /tools/[slug]/page
const entryName = (file: string) => '/' + path.relative(APP, file).replace(/\\/g, '/').replace(/\.tsx?$/, '');

function includesFor(route: string): string[] {
  const includes = nextConfig.outputFileTracingIncludes ?? {};
  return Object.entries(includes).flatMap(([glob, files]) => (picomatch(glob, { dot: true, contains: true })(route) ? files : []));
}

describe('file tracing for the folder-walking readers', () => {
  const routes = entries(APP).map((file) => {
    const reached = new Set(rootsOf(file).flatMap((root) => [...closureOf(root)]));
    const needs = Object.entries(READERS)
      .filter(([, readers]) => [readers].flat().some((reader) => reached.has(reader)))
      .map(([marker]) => marker);
    return { route: entryName(file), needs };
  });

  it('finds the routes that reach a reader', () => {
    const needing = routes.filter((r) => r.needs.length).map((r) => r.route);
    for (const route of ['/sitemap.xml/route', '/reports/[id]/page', '/projects/(browse)/page', '/work/page']) {
      expect(needing, route).toContain(route);
    }
  });

  it('declares the files each such route reads', () => {
    for (const { route, needs } of routes) {
      const includes = includesFor(route);
      for (const marker of needs) expect(includes.some((glob) => glob.includes(marker)), `${route} → ${marker}`).toBe(true);
    }
  });

  it('keeps the data off routes that never reach a reader', () => {
    for (const { route, needs } of routes) {
      if (!needs.length) expect(includesFor(route), route).toEqual([]);
    }
  });
});
