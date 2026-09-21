import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// The one accepted paper is a workshop paper, and it has now been presented.
// Every public surface says it was presented at the workshop; none says it was
// "accepted at" ICML, which reads as the main conference.

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const SURFACES = [
  path.join(ROOT, 'public', 'llms.txt'),
  path.join(SRC, 'app', 'papers', 'page.tsx'),
  path.join(SRC, 'app', 'work', 'page.tsx'),
  path.join(ROOT, 'README.md'),
  path.join(ROOT, '..', 'README.md'),
];

// "accepted" survives only as a dated fact ("accepted 2026-05-22"), never as
// the paper's status
const UNDATED_ACCEPTED = /\b[Aa]ccepted\b(?! \d{4}-\d{2}-\d{2})/g;
const CONTEXT_CHARS = 40;
// Uses of the word that are not about the paper, each pinned to its file and
// the exact phrase, so a new use anywhere else still fails.
const UNRELATED_USES: Record<string, string[]> = {
  [path.join('components', 'scenes', 'StreamingLadder.tsx')]: ['step accepted'],
};

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

function undatedAccepted(source: string): string[] {
  return [...source.matchAll(UNDATED_ACCEPTED)].map((m) =>
    source.slice(Math.max(0, (m.index ?? 0) - CONTEXT_CHARS), (m.index ?? 0) + CONTEXT_CHARS),
  );
}

describe('workshop paper framing', () => {
  it.each(SURFACES.map((file) => [path.relative(path.join(ROOT, '..'), file), file]))(
    '%s says the paper was presented at the workshop',
    (_label, file) => {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).not.toMatch(/accepted at (?:the |an )?ICML/i);
      expect(source).toMatch(/presented at (?:the |an )?ICML 2026 (?:Workshop on Hypothesis Testing|workshop)/);
      expect(undatedAccepted(source)).toEqual([]);
    },
  );

  it('never calls the paper accepted anywhere in the source tree', () => {
    const files = sourceFiles(SRC);
    // a moved tree must fail loudly rather than pass an empty scan
    expect(files).toContain(path.join(SRC, 'app', 'not-found.tsx'));
    expect(files).toContain(path.join(SRC, 'app', 'reports', 'page.tsx'));

    const offenders = files.flatMap((file) => {
      const exempt = UNRELATED_USES[path.relative(SRC, file)] ?? [];
      return undatedAccepted(fs.readFileSync(file, 'utf8'))
        .filter((context) => !exempt.some((phrase) => context.includes(phrase)))
        .map((context) => `${path.relative(SRC, file)}: …${context.replace(/\s+/g, ' ')}…`);
    });
    expect(offenders).toEqual([]);
  });

  it('keeps each exemption narrow: the phrase still exists and is the only use in its file', () => {
    for (const [file, phrases] of Object.entries(UNRELATED_USES)) {
      const uses = undatedAccepted(fs.readFileSync(path.join(SRC, file), 'utf8'));
      expect(uses.length, file).toBe(phrases.length);
      for (const phrase of phrases) expect(uses.some((context) => context.includes(phrase)), `${file}: ${phrase}`).toBe(true);
    }
  });
});
