import { NextResponse } from 'next/server';
import { getAllEpisodes } from '@/lib/episodes';

export async function GET() {
  try {
    const episodes = await getAllEpisodes();
    return NextResponse.json(episodes);
  } catch (error) {
    console.error('Error fetching episodes:', error);
    return NextResponse.json({ error: 'Failed to fetch episodes' }, { status: 500 });
  }
}
