'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, Package, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import type { Episode } from '@/lib/episodes';
import { formatNumber } from '@/lib/formatUtils';

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

function CopyButton() {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText('pip install chimeraforge');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="text-muted-foreground hover:text-primary transition-colors" aria-label="Copy install command">
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export function Hero({ stats, latestEpisode }: HeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-border/50">
      {/* Background — single subtle radial, no particles */}
      <div className="absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.12),transparent_55%)]" />

      <div className="container relative py-20 md:py-28">
        <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_420px]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="space-y-10"
          >
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-primary font-semibold">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                In Beta
              </span>

              <h1 className="display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
                A personal AI platform that runs on{' '}
                <span className="gradient-text">your hardware</span>
              </h1>

              <p className="max-w-2xl text-lg sm:text-xl text-muted-foreground leading-relaxed">
                Multi-modal assistant with smart home, calendar, memory, and proactive intelligence
                — powered by constitutional AI governance and local inference. No cloud dependency.
              </p>
            </div>

            {/* Install command */}
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-2.5 font-mono text-sm backdrop-blur">
                <Package className="h-4 w-4 text-primary shrink-0" />
                <span className="text-muted-foreground">$</span>
                <code className="text-foreground">pip install chimeraforge</code>
                <CopyButton />
              </div>
              <Link
                href="https://pypi.org/project/chimeraforge/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                v0.2.1 on PyPI
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
              <Link
                href="/episodes"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-accent px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-semibold text-primary-foreground shadow-xl shadow-primary/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-primary/30"
              >
                See the build log
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
              <Link
                href="/reports"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border/60 px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-semibold text-foreground transition-all duration-200 hover:border-primary/50 hover:text-primary"
              >
                Read the research
                <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
            </div>

            {/* Compact stats — product-relevant, not code metrics */}
            <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted-foreground">
              <div>
                <span className="text-lg font-bold text-foreground">{stats.totalEpisodes}</span>{' '}
                episodes shipped
              </div>
              <div>
                <span className="text-lg font-bold text-foreground">30+</span>{' '}
                services
              </div>
              <div>
                <span className="text-lg font-bold text-foreground">126K+</span>{' '}
                research measurements
              </div>
              <div>
                <span className="text-lg font-bold text-foreground">4</span>{' '}
                languages
              </div>
            </div>
          </motion.div>

          {/* Latest episode sidebar — proof of active development */}
          <motion.aside
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="relative w-full"
          >
            <div className="rounded-2xl border border-border/60 bg-card/70 p-6 sm:p-8 shadow-2xl shadow-primary/5 backdrop-blur">
              <div className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Latest Drop
              </div>

              {latestEpisode ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground/80">
                      Episode {latestEpisode.id}
                    </p>
                    <h2 className="text-2xl font-semibold leading-tight text-foreground">
                      {latestEpisode.title}
                    </h2>
                    <p className="text-sm text-muted-foreground">{latestEpisode.subtitle}</p>
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
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/50 bg-primary/10 px-4 py-2.5 text-xs sm:text-sm font-semibold text-primary transition-all duration-200 hover:bg-primary/15 hover:border-primary/60"
                  >
                    Read Episode {latestEpisode.id}
                    <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-4 text-sm text-muted-foreground">
                  <p>No episodes yet.</p>
                  <Link
                    href="/episodes"
                    className="inline-flex items-center gap-2 rounded-xl border border-border/60 px-6 py-3 text-sm font-semibold text-foreground transition hover:border-primary/50 hover:text-primary"
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
