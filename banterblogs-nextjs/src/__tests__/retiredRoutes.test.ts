import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import nextConfig from '../../next.config';

// /home was the scrollable overview that predates the galactic landing. Two
// front doors split the site's first impression, so the path now redirects to
// the landing and nothing links to it.

const SRC = path.resolve(__dirname, '..');
const LLMS_TXT = path.resolve(__dirname, '..', '..', 'public', 'llms.txt');
// '/home', "/home/…", `${BASE}/home` — but not '/homepage' or a '/home' prefix of another word
const HOME_LINK = /(['"`]|\})\/home(?![\w-])/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

describe('retired /home overview', () => {
  it('redirects permanently to the landing', async () => {
    const redirects = await nextConfig.redirects?.();
    expect(redirects).toContainEqual({ source: '/home', destination: '/', permanent: true });
  });

  it('has no page left behind', () => {
    expect(existsSync(path.join(SRC, 'app', 'home'))).toBe(false);
  });

  it('is not linked from the site, the sitemap or llms.txt', () => {
    const linking = sourceFiles(SRC).filter((file) => HOME_LINK.test(readFileSync(file, 'utf8')));
    expect(linking).toEqual([]);
    expect(readFileSync(LLMS_TXT, 'utf8')).not.toMatch(/vercel\.app\/home\b|at \/home\b/);
  });
});
