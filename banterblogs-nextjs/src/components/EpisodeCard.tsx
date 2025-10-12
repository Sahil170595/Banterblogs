'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Clock, FileText, GitCommit, Tag } from 'lucide-react';
import type { Episode, EpisodePlatform } from '@/lib/episodes';
import { formatNumber } from '@/lib/formatUtils';
import { useMagneticCursor } from '@/hooks/useMagneticCursor';

interface EpisodeCardProps {
  episode: Episode;
  index?: number;
}

function formatEpisodeNumber(value: number): string {
  if (value >= 100) {
    return value.toString().padStart(3, '0');
  }
  return value.toString().padStart(2, '0');
}

function resolvePlatform(
  episode: Episode,
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

export function EpisodeCard({ episode, index = 0 }: EpisodeCardProps) {
  const displayId = episode.displayId ?? episode.id;
  const formattedEpisodeNumber = formatEpisodeNumber(displayId);
  const { label: platformLabel, colorClass } = resolvePlatform(episode);
  const tags = episode.tags.slice(0, 3);
  const magneticRef = useMagneticCursor({ strength: 0.08, radius: 40 });

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  return (
    <motion.article
      ref={magneticRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      whileHover={{ 
        y: -8, 
        scale: 1.02,
        rotateY: 3,
        rotateX: 1
      }}
      className="group relative h-full overflow-hidden rounded-3xl border border-border/60 bg-card/60 backdrop-blur glass-ultra card-3d hover-lift"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary/20 to-accent/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />

      <Link href={`/episodes/${episode.slug}`} className="relative z-10 flex h-full flex-col gap-6 p-6">
        <header className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-muted-foreground">
          <motion.div 
            className="flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
          >
            <motion.span
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary"
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.6 }}
            >
              {formattedEpisodeNumber}
            </motion.span>
            <motion.span
              className={`px-2 py-1 rounded-full text-[10px] font-medium ${
                colorClass === 'accent'
                  ? 'bg-accent/10 text-accent'
                  : 'bg-primary/10 text-primary'
              }`}
              whileHover={{ scale: 1.05 }}
            >
              {platformLabel}
            </motion.span>
          </motion.div>
          <motion.time
            whileHover={{ scale: 1.05 }}
          >
            {formatDate(episode.date)}
          </motion.time>
        </header>

        <div className="space-y-3">
          <motion.h3
            className="text-xl font-semibold text-foreground transition group-hover:text-primary"
            whileHover={{ x: 5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {episode.title}
          </motion.h3>
          <motion.p
            className="text-sm text-muted-foreground"
            whileHover={{ x: 5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {episode.subtitle}
          </motion.p>
          <motion.p
            className="text-sm text-muted-foreground/80"
            whileHover={{ x: 5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {episode.preview}
          </motion.p>
        </div>

        <motion.div
          className="grid gap-3 rounded-2xl border border-border/40 bg-background/40 p-4 text-xs text-muted-foreground"
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <motion.div
            className="flex items-center justify-between"
            whileHover={{ x: 5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <span className="inline-flex items-center gap-2 font-medium text-foreground/80">
              <FileText className="h-3.5 w-3.5" />
              Files changed
            </span>
            <motion.span
              whileHover={{ scale: 1.1 }}
            >
              {episode.filesChanged}
            </motion.span>
          </motion.div>
          
          <motion.div
            className="flex items-center justify-between"
            whileHover={{ x: 5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <span className="inline-flex items-center gap-2 font-medium text-foreground/80">
              <GitCommit className="h-3.5 w-3.5" />
              Lines added
            </span>
            <motion.span
              whileHover={{ scale: 1.1 }}
            >
              {formatNumber(episode.linesAdded)}
            </motion.span>
          </motion.div>
          
          <motion.div
            className="flex items-center justify-between"
            whileHover={{ x: 5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <span className="inline-flex items-center gap-2 font-medium text-foreground/80">
              <Clock className="h-3.5 w-3.5" />
              Read time
            </span>
            <motion.span
              whileHover={{ scale: 1.1 }}
            >
              {episode.readingTime} min
            </motion.span>
          </motion.div>
          
          <motion.div
            className="flex items-center justify-between"
            whileHover={{ x: 5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <span className="inline-flex items-center gap-2 font-medium text-foreground/80">
              <div className="h-3.5 w-3.5 rounded-full bg-gradient-to-r from-primary to-accent" />
              Chaos score
            </span>
            <motion.span
              whileHover={{ scale: 1.1 }}
            >
              {episode.complexity}/100
            </motion.span>
          </motion.div>
        </motion.div>

        {tags.length > 0 && (
          <motion.div
            className="flex flex-wrap gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {tags.map((tag, tagIndex) => (
              <motion.span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-primary"
                whileHover={{ 
                  scale: 1.05, 
                  backgroundColor: 'hsl(var(--primary) / 0.2)' 
                }}
                transition={{
                  delay: tagIndex * 0.05,
                  type: 'spring',
                  stiffness: 400,
                  damping: 30,
                }}
              >
                <Tag className="h-3 w-3" />
                {tag}
              </motion.span>
            ))}
            {episode.tags.length > tags.length && (
              <motion.span
                className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground"
                whileHover={{ scale: 1.05 }}
              >
                +{episode.tags.length - tags.length} more
              </motion.span>
            )}
          </motion.div>
        )}

        <footer className="mt-auto flex items-center justify-between text-sm font-semibold text-primary">
          <motion.span
            className="inline-flex items-center gap-2"
            whileHover={{ x: 5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            Read episode
            <motion.div
              animate={{ x: [0, 3, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ArrowRight className="h-4 w-4" />
            </motion.div>
          </motion.span>
          <motion.span
            className="text-xs uppercase tracking-[0.2em] text-muted-foreground"
            whileHover={{ scale: 1.05 }}
          >
            {episode.commit ? `#${episode.commit.slice(0, 7)}` : 'untracked'}
          </motion.span>
        </footer>
      </Link>

      {/* Enhanced hover effect overlay */}
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/10 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent" />
      </motion.div>
    </motion.article>
  );
}

