'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Episode } from '@/lib/episodes';
import { EpisodeCard } from '@/components/EpisodeCard';

interface EpisodeSpotlightProps {
  episodes: Episode[];
}

export function EpisodeSpotlight({ episodes }: EpisodeSpotlightProps) {
  return (
    <section className="container py-20 md:py-28">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs uppercase tracking-[0.24em] text-primary/80">Latest field reports</p>
          <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">
            Every episode is an internal postmortem—just with better jokes.
          </h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            We do not sand off details. Each drop shows the commits, telemetry, and emotional damage required to get Chimera closer to a fully local assistant that behaves.
          </p>
        </div>
        <Link
          href="/episodes"
          className="inline-flex items-center gap-2 rounded-full border border-border/60 px-5 py-2 text-sm font-semibold text-foreground transition hover:border-primary/60 hover:text-primary"
        >
          Browse archive
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {episodes.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, amount: 0.2 }}
          className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3"
        >
          {episodes.slice(0, 6).map((episode, index) => (
            <EpisodeCard key={episode.slug} episode={episode} index={index} />
          ))}
        </motion.div>
      ) : (
        <div className="mt-10 text-center text-muted-foreground">
          <p>Episodes will be loaded dynamically</p>
        </div>
      )}
    </section>
  );
}