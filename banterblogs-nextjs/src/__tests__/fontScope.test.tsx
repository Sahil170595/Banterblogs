import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import tailwindConfig from '../../tailwind.config';

// Phase R7 (landing type): the landing's heading was the one thing set in
// Space Grotesk, a third face fetched late by the landing alone, which
// swapped under its LCP heading on a slow link. The heading now takes the
// site's title face (text-display-32), so the site loads two faces: Manrope
// for words and JetBrains Mono for labels.

const SRC = path.join(process.cwd(), 'src');
const read = (file: string) => fs.readFileSync(path.join(SRC, file), 'utf8');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full);
    return /\.tsx$/.test(entry.name) ? [full] : [];
  });
}

describe('site faces', () => {
  const layout = read('app/layout.tsx');

  it('are Manrope and JetBrains Mono, both declared by the root layout and preloaded', () => {
    const imported = /import \{([^}]*)\} from ["']next\/font\/google["']/.exec(layout)?.[1] ?? '';
    expect(imported.split(',').map((name) => name.trim()).filter(Boolean).sort()).toEqual(['JetBrains_Mono', 'Manrope']);
    for (const face of ['Manrope', 'JetBrains_Mono']) {
      const call = new RegExp(`${face}\\(\\{([^}]*)\\}\\)`).exec(layout)?.[1] ?? '';
      expect(call, face).not.toBe('');
      expect(call, face).not.toMatch(/preload:\s*false/);
    }
  });

  it('leave no display face behind: no font variable, family token or utility', () => {
    expect(layout).not.toMatch(/Space_Grotesk|--font-display/);
    expect(Object.keys(tailwindConfig.theme?.extend?.fontFamily ?? {})).not.toContain('display');
    const css = read('app/globals.css').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).not.toMatch(/--font-display|(^|[\s,}])\.display\s*[{,]/m);

    // the class, not the display-72/display-32 type roles
    const users = sourceFiles(SRC)
      .filter((file) => /className=\{?["'`][^"'`]*\b(display|font-display)\b(?!-)/.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(SRC, file).split(path.sep).join('/'));
    expect(users).toEqual([]);
    // the scan can see: the /show title and the landing heading use the roles
    expect(sourceFiles(SRC).map((file) => path.relative(SRC, file).split(path.sep).join('/'))).toEqual(
      expect.arrayContaining(['app/show/page.tsx', 'components/galactic/GalacticHero.tsx']),
    );
  });
});
