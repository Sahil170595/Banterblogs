import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { EpisodePlatform, EpisodeSummary } from '@/lib/episodes';
import { formatNumber } from '@/lib/formatUtils';

// The archived episodes' index entry: the /show row (a hairline layer, the
// title and arrow turning ember under the pointer, no lift on a dense list)
// with the number and date in a mono rail. Plain markup, no client code, so
// an index of 268 stays light; every figure the old card printed is on one
// meta line.

/** tags listed on a row; the rest are counted */
export const ROW_TAG_LIMIT = 3;
/** a commit is shown by its short hash */
const SHORT_HASH_LENGTH = 7;
/** episode numbers pad to two digits, three from 100 */
const THREE_DIGIT_FROM = 100;

const PLATFORM_LABEL: Record<EpisodePlatform, string> = {
  chimera: 'Chimera',
  benchmark: 'Benchmarks',
  banterpacks: 'Banterpacks',
  unknown: 'Banterpacks',
};

export function episodeNumber(value: number): string {
  return value.toString().padStart(value >= THREE_DIGIT_FROM ? 3 : 2, '0');
}

export function platformLabel(episode: Pick<EpisodeSummary, 'platform' | 'slug'>): string {
  const platform = episode.platform ?? (episode.slug.startsWith('chimera-episode-') ? 'chimera' : 'banterpacks');
  return PLATFORM_LABEL[platform];
}

// Pinned to UTC so the server and every visitor print the same day (a date of
// 2026-05-08 read "May 7" west of UTC and tripped React #418).
const EPISODE_DATE = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });

export function EpisodeRow({ episode }: { episode: EpisodeSummary }) {
  const tags = episode.tags.slice(0, ROW_TAG_LIMIT);
  const more = episode.tags.length - tags.length;
  const facts = [
    platformLabel(episode),
    `${episode.filesChanged} files changed`,
    `${formatNumber(episode.linesAdded)} lines added`,
    `${episode.readingTime} min read`,
    `chaos score ${episode.complexity}/100`,
  ];
  return (
    <article>
      <Link href={`/episodes/${episode.slug}`} className="list-row episode-row group">
        {/* mono only where it carries meaning: the number here, the commit hash below */}
        <div className="episode-row-rail">
          <span className="font-mono text-label-13 text-muted-foreground transition-colors duration-fast ease-standard group-hover:text-primary">
            {episodeNumber(episode.displayId ?? episode.id)}
          </span>
          <time dateTime={episode.date} className="text-label-13 text-muted-foreground/80">
            {EPISODE_DATE.format(new Date(episode.date))}
          </time>
        </div>
        <div className="episode-row-body min-w-0">
          <h2 className="text-heading-20 text-foreground transition-colors duration-fast ease-standard group-hover:text-primary">{episode.title}</h2>
          {episode.subtitle && <p className="mt-1 text-copy-14 text-prose">{episode.subtitle}</p>}
          {episode.preview && <p className="mt-2 line-clamp-2 max-w-3xl text-copy-14 text-muted-foreground">{episode.preview}</p>}
          <p className="mt-3 text-label-13 text-muted-foreground/80">
            {facts.join(' · ')} ·{' '}
            {episode.commit ? <span className="font-mono">#{episode.commit.slice(0, SHORT_HASH_LENGTH)}</span> : 'untracked'}
          </p>
          {/* the tags as one quiet line, not a wall of pills */}
          {tags.length > 0 && (
            <p className="mt-1 text-label-13 text-muted-foreground/70">
              {tags.join(', ')}
              {more > 0 && ` +${more} more`}
            </p>
          )}
        </div>
        <ArrowRight aria-hidden="true" className="row-arrow episode-row-arrow h-5 w-5 text-muted-foreground" />
      </Link>
    </article>
  );
}
