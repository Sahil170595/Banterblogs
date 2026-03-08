import { NextResponse } from 'next/server';
import { getAllEpisodes } from '@/lib/episodes';
import { discoverReports } from '@/lib/reports/locator';

export async function GET() {
  try {
    const episodes = await getAllEpisodes();

    const reportSlugs = new Set<string>();
    for (const entry of discoverReports()) {
      reportSlugs.add(entry.slug);
    }

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://banterblogs.vercel.app</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://banterblogs.vercel.app/about</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://banterblogs.vercel.app/episodes</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://banterblogs.vercel.app/reports</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://banterblogs.vercel.app/reports/compendium</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.85</priority>
  </url>
  <url>
    <loc>https://banterblogs.vercel.app/platform</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://banterblogs.vercel.app/tags</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://banterblogs.vercel.app/roadmap</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  ${Array.from(reportSlugs).map(slug => `
  <url>
    <loc>https://banterblogs.vercel.app/reports/${slug}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`).join('')}
  ${episodes.map(episode => `
  <url>
    <loc>https://banterblogs.vercel.app/episodes/${episode.slug}</loc>
    <lastmod>${new Date(episode.date).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`).join('')}
  ${Array.from(new Set(episodes.flatMap(e => e.tags))).map(tag => `
  <url>
    <loc>https://banterblogs.vercel.app/tags/${encodeURIComponent(tag)}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`).join('')}
</urlset>`;

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Sitemap generation failed:', error);
    return new NextResponse('Sitemap temporarily unavailable', {
      status: 500
    });
  }
}
