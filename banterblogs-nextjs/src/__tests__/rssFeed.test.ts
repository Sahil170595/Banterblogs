// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { FEED_ITEMS, feedPool, GET } from '@/app/rss.xml/route';
import { discoverReportsUnique } from '@/lib/reports/locator';

// The feed carried only the per-commit episodes, archived in June, so a
// subscriber saw nothing of the reports and projects published since. It now
// merges every dated thing the site publishes, newest first.

interface Item {
  title: string;
  link: string;
  date: number;
  category: string;
}

async function feedItems(): Promise<Item[]> {
  const xml = await (await GET()).text();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, body]) => ({
    title: /<title><!\[CDATA\[(.*?)\]\]><\/title>/.exec(body)?.[1] ?? '',
    link: /<link>(.*?)<\/link>/.exec(body)?.[1] ?? '',
    date: Date.parse(/<pubDate>(.*?)<\/pubDate>/.exec(body)?.[1] ?? ''),
    category: /<category>(.*?)<\/category>/.exec(body)?.[1] ?? '',
  }));
}

describe('rss feed', () => {
  it('carries projects and reports, newest first, every item dated and linked', async () => {
    const items = await feedItems();
    expect(items.length).toBe(FEED_ITEMS);
    expect(items.some((item) => item.link.includes('/projects/'))).toBe(true);
    expect(items.some((item) => item.link.includes('/reports/'))).toBe(true);
    for (const item of items) {
      expect(item.title, item.link).not.toBe('');
      expect(item.link).toMatch(/^https:\/\/chimeraforge\.vercel\.app\//);
      expect(Number.isNaN(item.date), item.link).toBe(false);
      expect(['Project', 'Report', 'Episode']).toContain(item.category);
    }
    expect(items.map((item) => item.date)).toEqual([...items].map((item) => item.date).sort((a, b) => b - a));
  }, 120_000);

  // an undated episode was dated by the build clock and led the feed; the
  // newest reports state no date in their title block and were missing
  it('dates every report and never an item after the build', async () => {
    const pool = await feedPool();
    const reports = new Set(pool.filter((item) => item.category === 'Report').map((item) => item.url.split('/reports/')[1]));
    for (const { slug } of discoverReportsUnique()) expect(reports.has(slug), slug).toBe(true);
    const now = Date.now();
    for (const item of pool) expect(Date.parse(item.date), item.url).toBeLessThanOrEqual(now);
  }, 120_000);
});
