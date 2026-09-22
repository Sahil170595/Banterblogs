import { Reveal } from '@/components/motion/Reveal';
import { ListRow } from '@/components/ui/ListRow';
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

interface ContentRecommendationsProps {
  current: EpisodeSummary;
  recommendations: EpisodeSummary[];
  className?: string;
}

/** The picks as ListRows under a section heading, each with why it was picked. */
export function ContentRecommendations({ current, recommendations, className }: ContentRecommendationsProps) {
  if (recommendations.length === 0) return null;

  return (
    <section aria-labelledby="recommended-heading" className={className}>
      <h2 id="recommended-heading" className="text-heading-24 text-foreground">
        Recommended Episodes
      </h2>
      <p className="mt-2 text-copy-16 text-muted-foreground">Based on your current reading, you might enjoy these episodes</p>
      <ul className="mt-6">
        {recommendations.map((episode) => (
          <Reveal as="li" key={episode.id}>
            <ListRow
              href={`/episodes/${episode.slug}`}
              index={`#${episode.displayId ?? episode.id}`}
              title={episode.title}
              description={episode.preview}
              meta={[
                recommendationReason(current, episode),
                `${episode.readingTime} min`,
                `${episode.tags.length} tags`,
                `${episode.complexity} complexity`,
              ].join(' · ')}
            />
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
