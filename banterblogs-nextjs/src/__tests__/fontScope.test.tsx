import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Phase R5 (final perf re-judge, P1-A): Space Grotesk sets only the landing's
// display type (its h1 and the selection card's h2), yet the root layout
// preloaded it on every page: 22.6 KB of the 88 KB of fonts requested before
// first paint on the reading route, /work and /episodes. It stays in the root
// layout, so its @font-face stays in the one global sheet (loading it from the
// landing page gave the landing a second render-blocking sheet), but it is not
// preloaded: the landing fetches it once its heading is laid out, and no other
// page fetches it at all.

const SRC = path.join(process.cwd(), 'src');
const read = (file: string) => fs.readFileSync(path.join(SRC, file), 'utf8');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full);
    return /\.tsx$/.test(entry.name) ? [full] : [];
  });
}

describe('display font', () => {
  it('is declared by the root layout without a preload', () => {
    const call = /Space_Grotesk\(\{([^}]*)\}\)/.exec(read('app/layout.tsx'))?.[1] ?? '';

    expect(call).toMatch(/variable:\s*["']--font-display["']/);
    expect(call).toMatch(/preload:\s*false/);
  });

  it('keeps the other faces preloaded', () => {
    for (const face of ['Manrope', 'JetBrains_Mono']) {
      const call = new RegExp(`${face}\\(\\{([^}]*)\\}\\)`).exec(read('app/layout.tsx'))?.[1] ?? '';
      expect(call, face).not.toBe('');
      expect(call, face).not.toMatch(/preload:\s*false/);
    }
  });

  it('is set only inside the landing', () => {
    const users = sourceFiles(SRC)
      .filter((file) => /className=\{?["'`][^"'`]*\b(display|font-display)\b(?!-)/.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(SRC, file).split(path.sep).join('/'));

    // the landing's h1 uses it, so an empty list means the scan went blind
    expect(users).toContain('components/galactic/GalacticHero.tsx');
    for (const file of users) expect(file).toMatch(/^components\/galactic\//);
  });
});
