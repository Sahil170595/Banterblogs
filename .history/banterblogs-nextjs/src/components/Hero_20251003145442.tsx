'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { StatsCard } from './StatsCard';
import { formatNumber, formatReadingTime } from '@/lib/formatUtils';

interface HeroProps {
  stats: {
    totalEpisodes: number;
    totalFilesChanged: number;
    totalLinesAdded: number;
    avgComplexity: number;
    totalReadingTime: number;
  };
}

export function Hero({ stats }: HeroProps) {
  const formatReadingTime = (minutes: number) => {
    if (minutes <= 0) return '0m';
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours === 0) {
      return `${minutes}m`;
    }
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/20 noise-overlay">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(139,92,246,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(236,72,153,0.1),transparent_50%)]" />
        {/* Glow orbs */}
        <div className="glow-orb glow-blue w-80 h-80 -top-10 -left-20" />
        <div className="glow-orb glow-purple w-72 h-72 top-10 right-0" />
        <div className="glow-orb glow-pink w-64 h-64 bottom-0 left-1/2 -translate-x-1/2" />
      </div>

      <div className="container relative py-24 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent mb-6">
              <span className="text-2xl">🤖</span>
            </div>
            <h1 className="display text-4xl font-bold leading-tight tracking-tight sm:text-6xl mb-6 glow-orb">
              <span className="gradient-text">Banterblogs</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Watch the <strong className="text-accent">real-time creation</strong> of the first fully local & private AI assistant — from chaos to clarity, every commit tells our story.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-12"
          >
            <StatsCard
              label="Episodes"
              value={stats.totalEpisodes}
              icon="📚"
              delay={0.3}
            />
            <StatsCard
              label="Files Changed"
              value={stats.totalFilesChanged.toLocaleString()}
              icon="📁"
              delay={0.4}
            />
            <StatsCard
              label="Lines Added"
              value={stats.totalLinesAdded.toLocaleString()}
              icon="📝"
              delay={0.5}
            />
            <StatsCard
              label="Reading Time"
              value={formatReadingTime(stats.totalReadingTime)}
              icon="⏱️"
              delay={0.6}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              href="/about"
              className="inline-flex items-center justify-center cta-gradient px-8 py-3"
            >
              Watch the Development Story
            </Link>
            <Link
              href="/episodes?filter=latest"
              className="inline-flex items-center justify-center cta-outline px-8 py-3"
            >
              Read the Latest Episode
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
