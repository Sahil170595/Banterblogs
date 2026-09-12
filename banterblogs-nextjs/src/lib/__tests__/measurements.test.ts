import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { MEASUREMENTS } from '../constants';

// llms.txt and the share-image alt text cannot import constants.ts, and they
// are where count bumps went stale before. Every program-scale measurement
// figure they state must equal MEASUREMENTS.

const HAND_MAINTAINED = [
  path.join('public', 'llms.txt'),
  path.join('src', 'app', 'opengraph-image.alt.txt'),
  path.join('src', 'app', 'twitter-image.alt.txt'),
];

// Million-scale figures only, so a smaller per-report or per-package count
// ("~204,000 measurements") is not mistaken for the program total.
const FULL_FIGURE = /\b(\d{1,3}(?:,\d{3}){2}\+?)\s+(?:research\s+)?measurements/gi;
const SHORT_FIGURE = /\b(\d+\.\d+M\+?)\s+(?:research\s+)?measurements/gi;

describe('measurement figures on hand-maintained surfaces', () => {
  it.each(HAND_MAINTAINED)('%s states only the current figures', (file) => {
    const source = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
    const full = [...source.matchAll(FULL_FIGURE)].map((match) => match[1]);
    const short = [...source.matchAll(SHORT_FIGURE)].map((match) => match[1]);

    // a reworded surface must fail loudly rather than slip out of the guard
    expect(full.length + short.length, 'no measurement figure found').toBeGreaterThan(0);
    expect(full.filter((figure) => figure !== MEASUREMENTS.DISPLAY)).toEqual([]);
    expect(short.filter((figure) => figure !== MEASUREMENTS.SHORT)).toEqual([]);
  });
});
