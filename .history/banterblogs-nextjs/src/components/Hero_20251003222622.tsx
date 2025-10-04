'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Bot, Zap, Shield, Target } from 'lucide-react';
import type { Episode } from '@/lib/episodes';
import { StatsCard } from '@/components/StatsCard';
import { formatNumber, formatReadingTime } from '@/lib/formatUtils';

interface HeroStats {
  totalEpisodes: number;
  totalFilesChanged: number;
  totalLinesAdded: number;
  avgComplexity: number;
  totalReadingTime: number;
}

interface HeroProps {
  stats: HeroStats;
  latestEpisode?: Episode;
}

export function Hero({ stats, latestEpisode }: HeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-border/50 bg-gradient-to-b from-background via-background/90 to-background/40">
      <div className="absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.18),transparent_55%),radial-gradient(circle_at_80%_10%,rgba(167,139,250,0.2),transparent_55%)]" />

      <div className="container relative py-20 md:py-28">
        <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_420px]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-10"
          >
            <div className="space-y-6">
              <span className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-[12px] uppercase tracking-[0.2em] text-primary font-semibold">
                <Bot className="w-3 h-3 mr-2" />
                Building Jarvis: Fully Local AI Evolution
              </span>
              <h1 className="display text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight tracking-tight">
                The World&apos;s First{" "}
                <span className="gradient-text">
                  Fully Autonomous{" "}
                </span>
                Personal AI Platform
              </h1>
              <p className="max-w-2xl text-lg sm:text-xl text-muted-foreground leading-relaxed">
                Starting with <strong className="text-accent">real-time streaming overlay</strong>, evolving into a <strong className="text-primary">complete personal AI ecosystem</strong>. 
                Every commit, every optimization, every breakthrough—witness the birth of privacy-first artificial intelligence.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
              <Link
                href="/roadmap"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-blue-600 px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-semibold text-white shadow-xl shadow-primary/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-primary/40 active:scale-95"
              >
                View Jarvis Roadmap
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
              <Link
                href="/episodes?filter=latest"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-semibold text-primary transition-all duration-200 hover:border-primary/50 hover:bg-primary/10 active:scale-95"
              >
                Latest Development Log
                <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
              <StatsCard label="Development Episodes" value={stats.totalEpisodes} icon={<Bot className="h-4 w-4" />} />
              <StatsCard label="Platform Core Lines" value={formatNumber(stats.totalLinesAdded)} icon={<Zap className="h-4 w-4" />} />
              <StatsCard label="System Complexity" value={`${stats.avgComplexity}/100`} icon={<Target className="h-4 w-4" />} />
              <StatsCard label="Documentation Hours" value={formatReadingTime(stats.totalReadingTime)} icon={<Shield className="h-4 w-4" />} />
            </div>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative w-full"
          >
            <div className="rounded-2xl sm:rounded-3xl border border-border/60 bg-card/70 p-6 sm:p-8 shadow-2xl shadow-primary/10 backdrop-blur">
              <div className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                Latest Drop
              </div>

              {latestEpisode ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground/80">Episode {latestEpisode.id}</p>
                    <h2 className="text-2xl font-semibold leading-tight text-foreground">
                      {latestEpisode.title}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {latestEpisode.subtitle}
                    </p>
                  </div>

                  <div className="grid gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground/80">Files changed</span>
                      <span>{latestEpisode.filesChanged}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground/80">Lines added</span>
                      <span>{formatNumber(latestEpisode.linesAdded)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground/80">Complexity</span>
                      <span>{latestEpisode.complexity}/100</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground/80">Read time</span>
                      <span>{latestEpisode.readingTime} min</span>
                    </div>
                  </div>

                  <Link
                    href={`/episodes/${latestEpisode.slug}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl sm:rounded-2xl border border-primary/50 bg-primary/10 px-4 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm font-semibold text-primary transition-all duration-200 hover:bg-primary/15 hover:border-primary/60 active:scale-95"
                  >
                    Dive into Episode {latestEpisode.id}
                    <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-4 text-sm text-muted-foreground">
                  <p>No episodes yet. Jarvis is booting up.</p>
                  <Link
                    href="/episodes"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border/60 px-6 py-3 text-sm font-semibold text-foreground transition hover:border-primary/50 hover:text-primary"
                  >
                    View archive
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          </motion.aside>
        </div>
      </div>
    </section>
  );
}