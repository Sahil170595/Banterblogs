import { Hero } from '@/components/Hero';
import { EpisodeSpotlight } from '@/components/EpisodeSpotlight';
import { SystemsShowcase } from '@/components/SystemsShowcase';
import { RoadmapRail } from '@/components/RoadmapRail';
import { getAllEpisodes, getEpisodeStats, type Episode } from '@/lib/episodes';
import ErrorBoundary from '@/components/ErrorBoundary';

export default async function HomePage() {
  let stats = {
    totalEpisodes: 0,
    totalFilesChanged: 0,
    totalLinesAdded: 0,
    avgComplexity: 0,
    totalReadingTime: 0
  };
  
  let latestEpisode: Episode | undefined = undefined;

  try {
    const episodes = await getAllEpisodes();
    stats = getEpisodeStats(episodes);
    latestEpisode = episodes.length > 0 ? episodes[episodes.length - 1] : undefined;
  } catch (error) {
    console.error('Error loading episodes for homepage:', error);
    // Fallback to static values if loading fails
    stats = {
      totalEpisodes: 87,
      totalFilesChanged: 2500,
      totalLinesAdded: 125000,
      avgComplexity: 75,
      totalReadingTime: 14400
    };
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col">
        <Hero stats={stats} latestEpisode={latestEpisode} />
        <SystemsShowcase />
        <EpisodeSpotlight episodes={[]} />
        <RoadmapRail />
      </div>
    </ErrorBoundary>
  );
}