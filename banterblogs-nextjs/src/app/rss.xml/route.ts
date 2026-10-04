import { NextResponse } from 'next/server';
import { getAllEpisodes } from '@/lib/episodes';
import { MEASUREMENTS } from '@/lib/constants';
import { projectHref, readProjectCatalog } from '@/lib/projects/catalog';
import { loadReportData } from '@/lib/reports/loadPublishReady';
import { discoverReportsUnique } from '@/lib/reports/locator';
import { readReportMeta } from '@/lib/reports/meta';

// The site's feed: the newest of everything it publishes with a date, the
// research reports (each by the date its title block states), the project
// pages (by the day they went live) and the per-commit episodes archived in
// June. Built once at build time, like reports.json: every report is read
// for its date.
export const runtime = 'nodejs';
export const dynamic = 'force-static';

const BASE = 'https://chimeraforge.vercel.app';
/** how many of the newest items the feed carries */
export const FEED_ITEMS = 30;
// on the same day, a project before a report before an episode
const CATEGORY_ORDER = ['Project', 'Report', 'Episode'] as const;

type Category = (typeof CATEGORY_ORDER)[number];

interface FeedItem {
  title: string;
  description: string;
  url: string;
  /** yyyy-mm-dd, or any date Date.parse reads */
  date: string;
  category: Category;
}

async function reportItems(): Promise<FeedItem[]> {
  const items = await Promise.all(
    discoverReportsUnique().map(async ({ slug }): Promise<FeedItem | null> => {
      const meta = readReportMeta(slug);
      const data = await loadReportData(slug);
      // the date its title block states, or else the day it reached the site
      const date = data?.sections.find((section) => section.frontMatter?.date)?.frontMatter?.date ?? meta?.published;
      if (!meta?.title || !date) {
        console.warn(`[rss] report ${slug} has no date: give it a stated date or a REPORT_PUBLISHED entry`);
        return null;
      }
      return { title: meta.title, description: meta.description ?? '', url: `${BASE}/reports/${slug}`, date, category: 'Report' };
    }),
  );
  return items.filter((item): item is FeedItem => item !== null);
}

function projectItems(): FeedItem[] {
  return readProjectCatalog().map((project) => ({
    title: project.title,
    description: project.summary,
    url: `${BASE}${projectHref(project)}`,
    date: project.published,
    category: 'Project',
  }));
}

async function episodeItems(): Promise<FeedItem[]> {
  const episodes = await getAllEpisodes();
  // an undated episode's date is the time it was read, which would put it on top
  return episodes.filter((episode) => !episode.undated).map((episode) => ({
    title: episode.title,
    description: episode.preview,
    url: `${BASE}/episodes/${episode.slug}`,
    date: episode.date,
    category: 'Episode',
  }));
}

// CDATA cannot hold its own terminator; split one across two sections
const cdata = (text: string) => `<![CDATA[${text.replaceAll(']]>', ']]]]><![CDATA[>')}]]>`;

function newestFirst(a: FeedItem, b: FeedItem): number {
  return Date.parse(b.date) - Date.parse(a.date) || CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) || a.title.localeCompare(b.title);
}

/** every dated item the feed chooses from, newest first */
export async function feedPool(): Promise<FeedItem[]> {
  const [reports, episodes] = await Promise.all([reportItems(), episodeItems()]);
  return [...projectItems(), ...reports, ...episodes].filter((item) => !Number.isNaN(Date.parse(item.date))).sort(newestFirst);
}

export async function GET() {
  try {
    const items = (await feedPool())
      .slice(0, FEED_ITEMS)
      .map((item) =>
        [
          '    <item>',
          `      <title>${cdata(item.title)}</title>`,
          `      <description>${cdata(item.description)}</description>`,
          `      <link>${item.url}</link>`,
          `      <guid isPermaLink="true">${item.url}</guid>`,
          `      <pubDate>${new Date(item.date).toUTCString()}</pubDate>`,
          `      <category>${item.category}</category>`,
          '    </item>',
        ].join('\n'),
      );

    const rss = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<?xml-stylesheet type="text/xsl" href="/rss.xsl"?>',
      '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
      '  <channel>',
      '    <title>Chimeraforge</title>',
      `    <description>New research reports and project demos from the Chimera ecosystem, with the archived development log: constitutional AI enforcement, multi-model debate, cryptographic provenance, and ${MEASUREMENTS.SHORT} research measurements across inference, optimization, and safety.</description>`,
      `    <link>${BASE}</link>`,
      '    <language>en-us</language>',
      `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
      `    <atom:link href="${BASE}/rss.xml" rel="self" type="application/rss+xml"/>`,
      ...items,
      '  </channel>',
      '</rss>',
    ].join('\n');

    return new NextResponse(rss, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('RSS generation failed:', error);
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Error</title></channel></rss>', {
      status: 500,
      headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
    });
  }
}
