import { getAllEpisodes, getEpisodeStats } from '@/lib/episodes';
import { Hero } from '@/components/Hero';
import { OnboardingWrapper } from '@/components/OnboardingWrapper';
import { MetricTicker } from '@/components/MetricTicker';
import { SystemsShowcase } from '@/components/SystemsShowcase';
import { EpisodeSpotlight } from '@/components/EpisodeSpotlight';
import { RoadmapRail } from '@/components/RoadmapRail';

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const episodes = await getAllEpisodes();
  const stats = getEpisodeStats(episodes);
  const sortedByNewest = [...episodes].sort((a, b) => b.id - a.id);
  const latestEpisode = sortedByNewest[0];

  return (
    <div className="flex flex-col">
      <OnboardingWrapper />
      <Hero stats={stats} latestEpisode={latestEpisode} />
      <MetricTicker
        totalEpisodes={stats.totalEpisodes}
        totalLines={stats.totalLinesAdded}
        avgComplexity={stats.avgComplexity}
        latestEpisode={latestEpisode}
      />
      <SystemsShowcase />
      <EpisodeSpotlight episodes={sortedByNewest} />
      <RoadmapRail />
    </div>
  );
}