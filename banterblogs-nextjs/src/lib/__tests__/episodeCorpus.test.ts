// @vitest-environment node
import fs from 'fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAllEpisodes } from '../episodes';

// Static generation renders ~270 pages that each need the whole episode
// archive. React's cache() memoizes within one render only, so every page
// re-read and re-rendered all 268 episodes (~4.5 s each, the bulk of CI's
// build). The archive is parsed once per process.

// the first read parses and renders all 268 episodes
const FIRST_READ_TIMEOUT_MS = 60_000;

afterEach(() => vi.restoreAllMocks());

describe('episode archive', () => {
  it('is read once per process and shared by every later caller', { timeout: FIRST_READ_TIMEOUT_MS }, async () => {
    const first = await getAllEpisodes();
    const reads = vi.spyOn(fs, 'readFileSync');
    const [second, third] = await Promise.all([getAllEpisodes(), getAllEpisodes()]);
    expect(second).toBe(first);
    expect(third).toBe(first);
    expect(reads).not.toHaveBeenCalled();
    expect(first.length).toBeGreaterThan(0);
  });
});
