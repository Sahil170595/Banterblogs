import { NextResponse } from 'next/server';
import { getAllEpisodes } from '@/lib/episodes';

const BASE = 'https://chimeraforge.vercel.app';

export async function GET() {
  try {
    const episodes = await getAllEpisodes();

    const items = episodes.slice(0, 20).map(episode =>
      `    <item>\n      <title><![CDATA[${episode.title}]]></title>\n      <description><![CDATA[${episode.preview}]]></description>\n      <link>${BASE}/episodes/${episode.slug}</link>\n      <guid isPermaLink="true">${BASE}/episodes/${episode.slug}</guid>\n      <pubDate>${new Date(episode.date).toUTCString()}</pubDate>\n      <category>Development</category>\n    </item>`
    );

    const rss = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<?xml-stylesheet type="text/xsl" href="/rss.xsl"?>',
      '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
      '  <channel>',
      '    <title>Chimeraforge - Building Chimera</title>',
      '    <description>Development log and research archive for the Chimera ecosystem — 200K+ LOC across real-time streaming AI, ML research, multi-agent orchestration, and mobile deployment.</description>',
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
