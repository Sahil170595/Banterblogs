import { NextResponse } from 'next/server';
import { getAllEpisodes, toEpisodeSummary } from '@/lib/episodes';

export const runtime = 'nodejs';
// Search (the only consumer) needs summary fields only — the full corpus with
// rendered HTML was a ~2.9MB uncached response, re-parsed per request. Serve a
// build-time snapshot with the same ISR window as the episode pages.
export const dynamic = 'force-static';
export const revalidate = 900;

export async function GET() {
  try {
    const episodes = await getAllEpisodes();
    return NextResponse.json(episodes.map(toEpisodeSummary), {
      headers: {
        'Cache-Control': 'public, max-age=900, s-maxage=900, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Error fetching episodes:', error);
    return NextResponse.json({ error: 'Failed to fetch episodes' }, { status: 500 });
  }
}
