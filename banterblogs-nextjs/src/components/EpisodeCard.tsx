import Link from 'next/link';
import { ArrowRight, Clock, FileText, GitCommit, Tag } from 'lucide-react';
import type { EpisodePlatform, EpisodeSummary } from '@/lib/episodes';
import { formatNumber } from '@/lib/formatUtils';

// Pure CSS card: the previous version wrapped ~25 elements in framer-motion
// per card (including an infinitely repeating arrow animation and a
// document-level magnetic-cursor listener). On /episodes that meant 268
// concurrent infinite animations and 268 document mousemove handlers for
// effects CSS handles for free. All hover motion is transition-based and
// disabled under prefers-reduced-motion.

interface EpisodeCardProps {
  episode: EpisodeSummary;
}

function formatEpisodeNumber(value: number): string {
  if (value >= 100) {
    return value.toString().padStart(3, '0');
  }
  return value.toString().padStart(2, '0');
}

function resolvePlatform(
  episode: EpisodeSummary,
): { label: string; colorClass: 'accent' | 'primary'; key: EpisodePlatform } {
  const inferred = episode.platform ?? (episode.slug.startsWith('chimera-episode-') ? 'chimera' : 'banterpacks');

  switch (inferred) {
    case 'chimera':
      return { label: 'Chimera', colorClass: 'accent', key: 'chimera' };
    case 'benchmark':
      return { label: 'Benchmarks', colorClass: 'primary', key: 'benchmark' };
    case 'banterpacks':
    default:
      return { label: 'Banterpacks', colorClass: 'primary', key: 'banterpacks' };
  }
}

// Pin timezone to UTC so server and client render the same date string
// regardless of the visitor's local timezone — without this an episode dated
// "2026-05-08" prints "May 8" on the server (UTC) and "May 7" on a client
// west of UTC, tripping React #418.
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function EpisodeCard({ episode }: EpisodeCardProps) {
  const displayId = episode.displayId ?? episode.id;
  const formattedEpisodeNumber = formatEpisodeNumber(displayId);
  const { label: platformLabel } = resolvePlatform(episode);
  const tags = episode.tags.slice(0, 3);

  return (
    <article className="group relative h-full overflow-hidden rounded-3xl border border-border/60 bg-card/60 backdrop-blur glass-ultra card-3d hover-lift">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Glow effect */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary/20 to-accent/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />

      <Link href={`/episodes/${episode.slug}`} className="relative z-10 flex h-full flex-col gap-6 p-6">
        <header className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-xs font-bold text-foreground transition-transform duration-500 group-hover:rotate-[360deg] motion-reduce:transition-none motion-reduce:group-hover:rotate-0">
              {formattedEpisodeNumber}
            </span>
            <span className="px-2 py-1 rounded-full border border-border/60 bg-muted/40 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {platformLabel}
            </span>
          </div>
          <time>{formatDate(episode.date)}</time>
        </header>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground transition-all duration-300 group-hover:text-primary group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0">
            {episode.title}
          </h2>
          <p className="text-sm text-muted-foreground">{episode.subtitle}</p>
          <p className="text-sm text-muted-foreground/80">{episode.preview}</p>
        </div>

        <div className="grid gap-3 rounded-2xl border border-border/40 bg-background/40 p-4 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 font-medium text-foreground/80">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              Files changed
            </span>
            <span>{episode.filesChanged}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 font-medium text-foreground/80">
              <GitCommit className="h-3.5 w-3.5" aria-hidden="true" />
              Lines added
            </span>
            <span>{formatNumber(episode.linesAdded)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 font-medium text-foreground/80">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              Read time
            </span>
            <span>{episode.readingTime} min</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 font-medium text-foreground/80">
              <span className="h-3.5 w-3.5 rounded-full bg-gradient-to-r from-primary to-accent" aria-hidden="true" />
              Chaos score
            </span>
            <span>{episode.complexity}/100</span>
          </div>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground transition-colors duration-200 group-hover:border-primary/30"
              >
                <Tag className="h-3 w-3" aria-hidden="true" />
                {tag}
              </span>
            ))}
            {episode.tags.length > tags.length && (
              <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                +{episode.tags.length - tags.length} more
              </span>
            )}
          </div>
        )}

        <footer className="mt-auto flex items-center justify-between text-sm font-semibold text-primary">
          <span className="inline-flex items-center gap-2">
            Read episode
            <ArrowRight
              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
              aria-hidden="true"
            />
          </span>
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {episode.commit ? `#${episode.commit.slice(0, 7)}` : 'untracked'}
          </span>
        </footer>
      </Link>

      {/* Hover effect overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/10 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent" />
      </div>
    </article>
  );
}
