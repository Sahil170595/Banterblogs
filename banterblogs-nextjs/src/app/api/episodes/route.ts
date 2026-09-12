import { NextResponse } from 'next/server';
import { getAllEpisodes, toEpisodeSummary } from '@/lib/episodes';

export const runtime = 'nodejs';
// Summary fields only — the full corpus with rendered HTML was a ~2.9MB
// uncached response, re-parsed per request. A build-time snapshot: the archive
// ships with the deployment. (Site search reads /search.json, not this route.)
export const dynamic = 'force-static';

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
