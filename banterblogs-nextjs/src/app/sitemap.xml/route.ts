import { NextResponse } from 'next/server';
import { getAllEpisodes } from '@/lib/episodes';
import { discoverReports } from '@/lib/reports/locator';

const BASE = 'https://banterblogs.vercel.app';

function urlEntry(loc: string, lastmod: string, changefreq: string, priority: number) {
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

export async function GET() {
  try {
    const episodes = await getAllEpisodes();
    const now = new Date().toISOString();

    const reportSlugs = new Set<string>();
    for (const entry of discoverReports()) {
      reportSlugs.add(entry.slug);
    }

    const urls: string[] = [
      urlEntry(BASE, now, 'daily', 1.0),
      urlEntry(`${BASE}/about`, now, 'monthly', 0.8),
      urlEntry(`${BASE}/episodes`, now, 'daily', 0.9),
      urlEntry(`${BASE}/reports`, now, 'weekly', 0.9),
      urlEntry(`${BASE}/reports/compendium`, now, 'monthly', 0.85),
      urlEntry(`${BASE}/platform`, now, 'weekly', 0.8),
      urlEntry(`${BASE}/tags`, now, 'weekly', 0.7),
      urlEntry(`${BASE}/roadmap`, now, 'monthly', 0.7),
    ];

    for (const slug of reportSlugs) {
      urls.push(urlEntry(`${BASE}/reports/${slug}`, now, 'monthly', 0.7));
    }

    for (const episode of episodes) {
      urls.push(urlEntry(`${BASE}/episodes/${episode.slug}`, new Date(episode.date).toISOString(), 'weekly', 0.6));
    }

    const tags = new Set(episodes.flatMap(e => e.tags));
    for (const tag of tags) {
      urls.push(urlEntry(`${BASE}/tags/${encodeURIComponent(tag)}`, now, 'weekly', 0.5));
    }

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Sitemap generation failed:', error);
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>', {
      status: 500,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }
}
