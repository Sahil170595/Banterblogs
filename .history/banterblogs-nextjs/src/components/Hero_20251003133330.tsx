'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { StatsCard } from './StatsCard';

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
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(139,92,246,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(236,72,153,0.1),transparent_50%)]" />
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
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-6">
              <span className="gradient-text">Banterblogs</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-2 max-w-4xl mx-auto">
              Automated documentation of the enterprise <strong>Banter Platform</strong>: complete gaming content ecosystem.
            </p>
            <p className="text-base text-muted-foreground mb-8 max-w-4xl mx-auto">
              <strong>Banterpacks</strong>: Gaming platform with overlay, registry service, React Studio, and Google-tier observability.
              <br />
              <strong>Banterhearts</strong> (Chimera Heart): Production ML infrastructure with RLHF training, GPU optimization, and multi-service architecture.
              <br />
              <strong>Intelligence Pipeline</strong>: AI-driven management layer providing predictive analytics, auto-optimization, and self-healing.
              <br />
              <strong>Banterblogs</strong>: Automation engine converting real commits, metrics, and decisions into narrated technical stories.
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
              href="/platform#overview"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-8 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all duration-200 hover:scale-105"
            >
              Explore the Platform Overview
            </Link>
            <Link
              href="/episodes?filter=latest"
              className="inline-flex items-center justify-center rounded-lg border border-border px-8 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:scale-105"
            >
              Read the Latest Episode
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
