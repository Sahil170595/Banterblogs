import { notFound, redirect } from 'next/navigation';
export const runtime = 'nodejs';
import { getAllEpisodes } from '@/lib/episodes';
import { EpisodeNavigation } from '@/components/EpisodeNavigation';
import { EpisodeStats } from '@/components/EpisodeStats';
import { TableOfContents } from '@/components/TableOfContents';
import { ReadingExperience } from '@/components/ReadingExperience';
import { ContentEnhancer, ContentStats } from '@/components/ContentEnhancer';
import { PerformanceMonitor } from '@/components/PerformanceMonitor';
import { TouchInteraction, DeviceDetector, MobileNavigation } from '@/components/MobileOptimization';
import { SocialShare, BookmarkManager, EngagementStats } from '@/components/SocialFeatures';
import { ContentRecommendations, ReadingPath, TrendingEpisodes } from '@/components/ContentRecommendations';
import { ReadingTracker, EngagementHeatmap } from '@/components/ReadingAnalytics';

export default async function EpisodePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const slugParam = decodeURIComponent(slug).toLowerCase();
  const allEpisodes = await getAllEpisodes();

  const episodeBySlug = allEpisodes.find((ep) => ep.slug.toLowerCase() === slugParam);

  let episode = episodeBySlug;

  if (!episode) {
    const banterMatch = slugParam.match(/^episode-(\d+)$/) ?? slugParam.match(/^(\d+)$/);
    if (banterMatch) {
      const displayId = parseInt(banterMatch[1], 10);
      episode = allEpisodes.find((ep) => ep.platform !== 'chimera' && ep.displayId === displayId);
    }
  }

  if (!episode) {
    const chimeraMatch = slugParam.match(/^chimera(?:-episode)?-(\d+)$/);
    if (chimeraMatch) {
      const displayId = parseInt(chimeraMatch[1], 10);
      episode = allEpisodes.find((ep) => ep.platform === 'chimera' && ep.displayId === displayId);
    }
  }

  if (!episode) {
    notFound();
  }

  const canonicalSlug = episode.slug.toLowerCase();
  if (slugParam !== canonicalSlug) {
    redirect(`/episodes/${episode.slug}`);
  }

  const currentIndex = allEpisodes.findIndex((ep) => ep.id === episode?.id);
  const prevEpisode = currentIndex > 0 ? allEpisodes[currentIndex - 1] : null;
  const nextEpisode = currentIndex >= 0 && currentIndex < allEpisodes.length - 1 ? allEpisodes[currentIndex + 1] : null;

  const displayId = episode.displayId ?? episode.id;
  const platformLabel = episode.platform === 'chimera' ? 'Chimera' : episode.platform === 'benchmark' ? 'Benchmarks' : 'Banterpacks';

  return (
    <TouchInteraction>
      <PerformanceMonitor />
      <DeviceDetector />
      <EngagementHeatmap />

      <ReadingExperience
        episode={{
          id: episode.id,
          title: episode.title,
          readingTime: episode.readingTime,
          date: episode.date,
        }}
      />

      <ReadingTracker episode={episode} />
      <TableOfContents content={episode.content} />

      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2">
        <SocialShare episode={episode} />
        <BookmarkManager />
      </div>

      <MobileNavigation prevEpisode={prevEpisode} nextEpisode={nextEpisode} />

      <div className="container py-16">
        <div className="max-w-5xl mx-auto">
          <div className="signal-panel-strong mb-10 p-8 md:p-10">
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="signal-pill">Episode {displayId}</span>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {platformLabel}
              </span>
              <span>
                {new Date(episode.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>

            <h1 className="mt-5 text-4xl md:text-5xl font-bold tracking-tight">{episode.title}</h1>
            <p className="mt-4 text-lg text-muted-foreground">{episode.subtitle}</p>

            <div className="signal-divider my-6" />

            <EpisodeStats episode={episode} />
          </div>

          <div className="signal-panel mb-10 p-6">
            <ContentStats content={episode.content} />
          </div>

          <div
            className="signal-panel p-8 prose prose-lg prose-zinc prose-invert max-w-none
            prose-headings:font-bold prose-headings:text-foreground
            prose-h1:text-4xl prose-h1:mb-8 prose-h1:mt-12
            prose-h2:text-3xl prose-h2:mb-6 prose-h2:mt-10
            prose-h3:text-2xl prose-h3:mb-4 prose-h3:mt-8
            prose-h4:text-xl prose-h4:mb-3 prose-h4:mt-6
            prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-6
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-strong:text-foreground prose-strong:font-semibold
            prose-code:text-sm prose-code:bg-muted prose-code:px-2 prose-code:py-1 prose-code:rounded
            prose-pre:bg-muted prose-pre:border prose-pre:border-border
            prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:pl-6 prose-blockquote:py-4 prose-blockquote:rounded-r-lg
            prose-ul:list-disc prose-ol:list-decimal
            prose-li:text-muted-foreground prose-li:mb-2
            prose-img:rounded-xl prose-img:shadow-lg prose-img:border prose-img:border-border
            prose-table:border prose-table:border-border prose-table:rounded-lg
            prose-th:bg-muted prose-th:font-semibold prose-th:text-foreground
            prose-td:border prose-td:border-border prose-td:text-muted-foreground"
          >
            <ContentEnhancer content={episode.content} />
          </div>

          <EpisodeNavigation prevEpisode={prevEpisode} nextEpisode={nextEpisode} />

          <div className="mt-16 space-y-8">
            <ContentRecommendations currentEpisode={episode} allEpisodes={allEpisodes} />
            <ReadingPath episodes={allEpisodes} />
            <TrendingEpisodes episodes={allEpisodes} />
          </div>

          <div className="mt-16">
            <EngagementStats />
          </div>
        </div>
      </div>
    </TouchInteraction>
  );
}
