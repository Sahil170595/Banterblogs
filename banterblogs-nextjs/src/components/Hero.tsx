'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, Package, Copy, Check, FileText } from 'lucide-react';
import { useState } from 'react';
import { MEASUREMENTS, REPORTS } from '@/lib/constants';

interface LatestReport {
  slug: string;
  title: string;
  description: string;
}

interface HeroProps {
  latestReport?: LatestReport;
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

export function Hero({ latestReport }: HeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-border/50">
      {/* Background — single subtle radial, no particles */}
      <div className="absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.12),transparent_55%)]" />

      <div className="container relative py-20 md:py-28">
        <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_420px]">
          {/* initial={false} avoids the SSR-vs-client style-attribute
              mismatch that fired React #418 in prod. Trade: no entry fade. */}
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="space-y-10"
          >
            <div className="space-y-6">
              <div className="flex flex-wrap items-start gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  In Beta
                </span>
                <div className="flex flex-col items-start gap-1.5">
                  <Link
                    href="/papers"
                    className="group inline-flex items-center gap-2 rounded-full border border-primary/50 bg-primary/10 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-primary font-semibold transition-colors hover:bg-primary/20 hover:border-primary/70"
                  >
                    <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
                    Accepted · ICML 2026 Workshop
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    href="https://arxiv.org/abs/2605.27763"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/arx ml-4 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-mono text-muted-foreground/70 transition-colors hover:text-primary"
                  >
                    arXiv:2605.27763
                    <ArrowRight className="h-2.5 w-2.5 transition-transform group-hover/arx:translate-x-0.5" />
                  </Link>
                </div>
              </div>

              <h1 className="display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
                Constitutional AI that proves its reasoning
              </h1>

              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
                An AI enforcement architecture with embedding-based safety routing, multi-model
                debate, cryptographic provenance chains, and zero-knowledge proofs — built in
                Python and Rust across 9 repositories.
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
                v0.5.0 on PyPI
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
              <Link
                href="/reports"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-semibold text-primary-foreground shadow-xl shadow-primary/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-2xl hover:shadow-primary/30"
              >
                Read the research
                <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
              <Link
                href="/episodes"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border/60 px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-semibold text-foreground transition-all duration-200 hover:border-primary/50 hover:text-primary"
              >
                See the build log
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
              <Link
                href="/papers"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border/60 px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-semibold text-foreground transition-all duration-200 hover:border-primary/50 hover:text-primary"
              >
                See the papers
                <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
            </div>

            {/* Compact stats — product-relevant, not code metrics */}
            <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted-foreground">
              <div>
                <span className="text-lg font-bold text-foreground">{REPORTS.DISPLAY}</span>{' '}
                technical reports
              </div>
              <div>
                <span className="text-lg font-bold text-foreground">89</span>{' '}
                patches shipped
              </div>
              <div>
                <span className="text-lg font-bold text-foreground">{MEASUREMENTS.SHORT}</span>{' '}
                research measurements
              </div>
              <div>
                <span className="text-lg font-bold text-foreground">5</span>{' '}
                languages
              </div>
            </div>
          </motion.div>

          {/* Latest episode sidebar — proof of active development */}
          <motion.aside
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="relative w-full"
          >
            <div className="rounded-2xl border border-border/60 bg-card/70 p-6 sm:p-8 shadow-2xl shadow-primary/5 backdrop-blur">
              <div className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Latest Research
              </div>

              {latestReport ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground/80">
                      Technical Report
                    </p>
                    <h2 className="text-2xl font-semibold leading-tight text-foreground">
                      {latestReport.title}
                    </h2>
                    {latestReport.description && (
                      <p className="text-sm text-muted-foreground line-clamp-4">{latestReport.description}</p>
                    )}
                  </div>

                  <Link
                    href={`/reports/${latestReport.slug}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border/60 bg-card/40 px-4 py-2.5 text-xs sm:text-sm font-semibold text-foreground transition-all duration-200 hover:border-primary/50 hover:text-primary"
                  >
                    Read the report
                    <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-4 text-sm text-muted-foreground">
                  <p>Research loading.</p>
                  <Link
                    href="/reports"
                    className="inline-flex items-center gap-2 rounded-xl border border-border/60 px-6 py-3 text-sm font-semibold text-foreground transition hover:border-primary/50 hover:text-primary"
                  >
                    Browse the archive
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
