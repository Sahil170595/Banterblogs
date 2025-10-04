import { NextResponse } from 'next/server';
import { getAllEpisodes } from '@/lib/episodes';

export async function GET() {
  try {
    const episodes = await getAllEpisodes();
    
    const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Banterblogs - Building Jarvis</title>
    <description>A polished chaos log documenting how the Banterpacks overlay evolves into Jarvis—a fully local, privacy-first assistant.</description>
    <link>https://banterblogs.vercel.app</link>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="https://banterblogs.vercel.app/rss.xml" rel="self" type="application/rss+xml"/>
    
    ${episodes.slice(0, 20).map(episode => `
    <item>
      <title><![CDATA[${episode.title}]]></title>
      <description><![CDATA[${episode.preview}]]></description>
      <link>https://banterblogs.vercel.app/episodes/${episode.slug}</link>
      <guid>https://banterblogs.vercel.app/episodes/${episode.slug}</guid>
      <pubDate>${new Date(episode.date).toUTCString()}</pubDate>
      <category>Development</category>
    </item>`).join('')}
  </channel>
</rss>`;

    return new NextResponse(rss, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('RSS generation failed:', error);
    return new NextResponse('RSS feed temporarily unavailable', { 
      status: 500 
    });
  }
}
