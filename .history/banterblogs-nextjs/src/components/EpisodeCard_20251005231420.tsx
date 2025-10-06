'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Clock, FileText, GitCommit, Tag } from 'lucide-react';
import type { Episode } from '@/lib/episodes';
import { formatNumber } from '@/lib/formatUtils';

interface EpisodeCardProps {
  episode: Episode;
  index?: number;
}

export function EpisodeCard({ episode, index = 0 }: EpisodeCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const tags = episode.tags.slice(0, 3);
  
  // Determine platform based on slug
  const isChimera = episode.slug.startsWith('chimera-episode-');
  const platform = isChimera ? 'Chimera' : 'Banterpacks';
  const platformColor = isChimera ? 'accent' : 'primary';

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group relative h-full overflow-hidden rounded-3xl border border-border/60 bg-card/60 backdrop-blur transition hover:-translate-y-1 hover:border-primary/60"
    >
      <Link href={`/episodes/${episode.slug}`} className="flex h-full flex-col gap-6 p-6">
        <header className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-muted-foreground">
          <span>Episode {episode.id.toString().padStart(2, '0')}</span>
          <time>{formatDate(episode.date)}</time>
        </header>

        <div className="space-y-3">
          <h3 className="text-xl font-semibold text-foreground transition group-hover:text-primary">
            {episode.title}
          </h3>
          <p className="text-sm text-muted-foreground">{episode.subtitle}</p>
          <p className="text-sm text-muted-foreground/80">{episode.preview}</p>
        </div>

        <div className="grid gap-3 rounded-2xl border border-border/40 bg-background/40 p-4 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 font-medium text-foreground/80">
              <FileText className="h-3.5 w-3.5" />
              Files changed
            </span>
            <span>{episode.filesChanged}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 font-medium text-foreground/80">
              <GitCommit className="h-3.5 w-3.5" />
              Lines added
            </span>
            <span>{formatNumber(episode.linesAdded)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 font-medium text-foreground/80">
              <Clock className="h-3.5 w-3.5" />
              Read time
            </span>
            <span>{episode.readingTime} min</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 font-medium text-foreground/80">
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
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-primary"
              >
                <Tag className="h-3 w-3" />
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
            <ArrowRight className="h-4 w-4" />
          </span>
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {episode.commit ? `#${episode.commit.slice(0, 7)}` : 'untracked'}
          </span>
        </footer>
      </Link>

      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/10 to-transparent" />
      </div>
    </motion.article>
  );
}
