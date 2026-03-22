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
  let spotlightEpisodes: Episode[] = [];

  try {
    const episodes = await getAllEpisodes();
    stats = getEpisodeStats(episodes);
    latestEpisode = episodes.length > 0 ? episodes[episodes.length - 1] : undefined;
    spotlightEpisodes = episodes.slice(-6).reverse();
  } catch (error) {
    console.error('Error loading episodes for homepage:', error);
    // Fallback to static values if loading fails
    stats = {
      totalEpisodes: 266,
      totalFilesChanged: 18123,
      totalLinesAdded: 1915908,
      avgComplexity: 50,
      totalReadingTime: 1533
    };
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col">
        <Hero stats={stats} latestEpisode={latestEpisode} />
        <SystemsShowcase />
        <EpisodeSpotlight episodes={spotlightEpisodes} />
        <RoadmapRail />
      </div>
    </ErrorBoundary>
  );
}
