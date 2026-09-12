import Link from 'next/link';
import { ArrowRight, BookOpen, Clock, Eye, Sparkles, Star, Tag, TrendingUp, Zap } from 'lucide-react';
import type { EpisodeSummary } from '@/lib/episodes';

// Server component: the episode page scores the archive here and renders only
// the picks, so the page payload no longer carries every episode summary for
// a three-item panel.

// Scoring: shared tags dominate, then platform, then recency, then complexity.
const SHARED_TAG_POINTS = 40;
const SAME_PLATFORM_POINTS = 30;
const RECENT_WINDOW_DAYS = 30;
const RECENT_POINTS = 20;
const NEARBY_WINDOW_DAYS = 90;
const NEARBY_POINTS = 10;
const SIMILAR_COMPLEXITY_BAND = 5;
const SIMILAR_COMPLEXITY_POINTS = 10;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const RECOMMENDATION_COUNT = 3;
// shared tags quoted in the reason line under each pick
const REASON_TAG_LIMIT = 2;

type Scored = Pick<EpisodeSummary, 'id' | 'tags' | 'platform' | 'date' | 'complexity'>;

export function recommendEpisodes<T extends Scored>(
  current: Scored,
  archive: readonly T[],
  count: number = RECOMMENDATION_COUNT,
): T[] {
  const currentTime = new Date(current.date).getTime();
  return archive
    .filter((episode) => episode.id !== current.id)
    .map((episode) => {
      let score = episode.tags.filter((tag) => current.tags.includes(tag)).length * SHARED_TAG_POINTS;
      if (episode.platform === current.platform) score += SAME_PLATFORM_POINTS;
      const daysApart = Math.abs(currentTime - new Date(episode.date).getTime()) / MS_PER_DAY;
      if (daysApart < RECENT_WINDOW_DAYS) score += RECENT_POINTS;
      else if (daysApart < NEARBY_WINDOW_DAYS) score += NEARBY_POINTS;
      if (Math.abs(episode.complexity - current.complexity) < SIMILAR_COMPLEXITY_BAND) {
        score += SIMILAR_COMPLEXITY_POINTS;
      }
      return { episode, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(({ episode }) => episode);
}

function recommendationReason(current: Scored, episode: EpisodeSummary): string {
  const shared = episode.tags.filter((tag) => current.tags.includes(tag));
  if (shared.length > 0) return `Similar topics: ${shared.slice(0, REASON_TAG_LIMIT).join(', ')}`;
  if (episode.platform === current.platform) return `Same platform: ${episode.platform}`;
  return 'Nearby in the archive';
}

function rankIcon(index: number) {
  switch (index) {
    case 0:
      return <Star className="h-4 w-4 text-primary" />;
    case 1:
      return <TrendingUp className="h-4 w-4 text-primary/80" />;
    case 2:
      return <Zap className="h-4 w-4 text-primary/70" />;
    default:
      return <BookOpen className="h-4 w-4 text-muted-foreground" />;
  }
}

interface ContentRecommendationsProps {
  current: EpisodeSummary;
  recommendations: EpisodeSummary[];
  className?: string;
}

export function ContentRecommendations({ current, recommendations, className = '' }: ContentRecommendationsProps) {
  if (recommendations.length === 0) return null;

  return (
    <div className={`content-recommendations ${className}`}>
      <div className="signal-panel p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Recommended Episodes</h3>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Based on your current reading, you might enjoy these episodes
        </p>

        <div className="space-y-3">
          {recommendations.map((episode, index) => (
            <div key={episode.id} className="group">
              <Link
                href={`/episodes/${episode.slug}`}
                className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/30 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
              >
                <div className="flex-shrink-0">{rankIcon(index)}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                      {episode.title}
                    </h4>
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      #{episode.displayId ?? episode.id}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground mb-1 line-clamp-2">{episode.preview}</p>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {episode.readingTime} min
                    </div>
                    <div className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {episode.tags.length} tags
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {episode.complexity} complexity
                    </div>
                  </div>
                </div>

                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
              </Link>

              <div className="ml-7 mt-1">
                <p className="text-xs text-primary/70">{recommendationReason(current, episode)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
