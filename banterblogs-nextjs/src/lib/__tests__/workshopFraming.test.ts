import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// The one accepted paper is a workshop paper, and it has now been presented.
// Every public surface says it was presented at the workshop; none says it was
// "accepted at" ICML, which reads as the main conference.

const ROOT = process.cwd();
const SURFACES = [
  path.join(ROOT, 'public', 'llms.txt'),
  path.join(ROOT, 'src', 'app', 'papers', 'page.tsx'),
  path.join(ROOT, 'src', 'app', 'work', 'page.tsx'),
  path.join(ROOT, 'README.md'),
  path.join(ROOT, '..', 'README.md'),
];

describe('workshop paper framing', () => {
  it.each(SURFACES.map((file) => [path.relative(path.join(ROOT, '..'), file), file]))(
    '%s says the paper was presented at the workshop',
    (_label, file) => {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).not.toMatch(/accepted at (?:the |an )?ICML/i);
      expect(source).toMatch(/presented at (?:the |an )?ICML 2026 (?:Workshop on Hypothesis Testing|workshop)/);
    },
  );
});
