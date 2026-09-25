// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Three standing rules for everything the site publishes about the papers.
// Double-blind: no venue, track or submission id of a paper under review (the
// résumés name them for reviewers; the site never does). Withdrawn claims: a
// claim the owner's latest CV retracted or rescoped does not come back on a
// report sync or a copy edit. Decided papers: a paper whose decision has
// landed is never described as under review again.

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const MANUAL_SURFACES = [path.join(ROOT, 'public', 'llms.txt'), path.join(ROOT, 'README.md'), path.join(ROOT, '..', 'README.md')];

// a general list of conferences, not the venues of any particular paper;
// workshops are caught by shape, so no workshop is ever named here
const VENUES: RegExp[] = [
  /\bNeurIPS\b/i,
  /\bICLR\b/i,
  /openreview/i,
  /\bTMLR\b/i,
  /\bAAAI\b/,
  /\bEMNLP\b/i,
  /\bACL\b/,
  /\bCOLM\b/,
  /\bWorkshop on (?!Hypothesis Testing\b)/,
  /\b[A-Z][A-Za-z]+ Workshop\b/,
  /\bmain[- ]track\b/i,
  /\bsubmission (?:#|id\b)/i,
];

// ICML is named only for the presented workshop paper and the public
// reproducibility challenge; every other mention is an offender
const ICML = /icml/gi;
const ICML_ALLOWED: RegExp[] = [
  /ICML 2026 Workshop on Hypothesis Testing/g,
  /ICML 2026 workshop\b/g,
  /workshop paper presented at ICML 2026/g,
  /not the ICML 2026 main conference/g,
  /ICML 2026 Agent Reproducibility Challenge/g,
  /icml2026-paper-reproductions/g,
];
const CONTEXT_CHARS = 40;

const WITHDRAWN = [
  // the speculative-decoding preprint's expansion and equivalence claims
  '60,849',
  '25/27 per-task',
  '25 of 27 per-task',
  'speculative-decoding null result',
  // the CV cites that preprint by its scope; nothing public calls it a null
  'Speculative decoding null',
  'speculative decoding null',
  'clean null',
  // a deepfake speedup over endpoints that were not like for like
  '80–400×',
  '80-400x',
  // a causal reading of a descriptive two-model share
  'Quantization drives 57%',
];

// The three named papers that were under review were decided on 2026-09-24.
// Only the withheld workshop submissions are still out, so no surface may
// carry a named paper's review status again without a new decision.
const DECIDED_STATUS = ['Top ML venue (under review)', 'target: top ML venue', 'under blind review at top ML venues'];

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

const surfaces = () => [...sourceFiles(SRC), ...MANUAL_SURFACES];
const label = (file: string) => path.relative(path.join(ROOT, '..'), file);

function unallowedIcml(source: string): string[] {
  const covered = ICML_ALLOWED.flatMap((allowed) => [...source.matchAll(allowed)].map((m) => [m.index ?? 0, (m.index ?? 0) + m[0].length]));
  return [...source.matchAll(ICML)]
    .filter((m) => !covered.some(([start, end]) => (m.index ?? 0) >= start && (m.index ?? 0) < end))
    .map((m) => source.slice(Math.max(0, (m.index ?? 0) - CONTEXT_CHARS), (m.index ?? 0) + CONTEXT_CHARS).replace(/\s+/g, ' '));
}

describe('public claims about the papers', () => {
  it('scans the source tree and the hand-maintained surfaces', () => {
    const files = surfaces();
    // a moved tree must fail loudly rather than pass an empty scan
    for (const known of [path.join(SRC, 'lib', 'work.ts'), path.join(SRC, 'app', 'papers', 'page.tsx'), ...MANUAL_SURFACES]) {
      expect(files).toContain(known);
      expect(fs.existsSync(known), known).toBe(true);
    }
  });

  it('names no venue, track or submission id of a paper under review', () => {
    for (const named of ['the Workshop on Example Topics', 'the Example Workshop', 'a main-track paper']) {
      expect(VENUES.some((venue) => venue.test(named)), named).toBe(true);
    }
    for (const allowed of ['the ICML 2026 Workshop on Hypothesis Testing', 'three ML workshops', 'Plus 5 workshop submissions']) {
      expect(VENUES.some((venue) => venue.test(allowed)), allowed).toBe(false);
    }
    const offenders = surfaces().flatMap((file) => {
      const source = fs.readFileSync(file, 'utf8');
      return VENUES.filter((venue) => venue.test(source)).map((venue) => `${label(file)}: ${venue}`);
    });
    expect(offenders).toEqual([]);
  });

  it('names ICML only for the presented workshop paper and the public reproducibility challenge', () => {
    expect(unallowedIcml('presented at the ICML 2026 main track')).toHaveLength(1);
    expect(unallowedIcml('presented at the ICML 2026 Workshop on Hypothesis Testing')).toEqual([]);
    const offenders = surfaces().flatMap((file) => unallowedIcml(fs.readFileSync(file, 'utf8')).map((context) => `${label(file)}: …${context}…`));
    expect(offenders).toEqual([]);
  });

  it('describes no decided paper as still under review', () => {
    const offenders = surfaces().flatMap((file) => {
      const source = fs.readFileSync(file, 'utf8');
      return DECIDED_STATUS.filter((claim) => source.includes(claim)).map((claim) => `${label(file)}: ${claim}`);
    });
    expect(offenders).toEqual([]);
  });

  it('carries none of the claims the owner withdrew', () => {
    const offenders = surfaces().flatMap((file) => {
      const source = fs.readFileSync(file, 'utf8');
      return WITHDRAWN.filter((claim) => source.includes(claim)).map((claim) => `${label(file)}: ${claim}`);
    });
    expect(offenders).toEqual([]);
  });
});
