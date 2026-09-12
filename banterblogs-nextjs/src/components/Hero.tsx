import Link from 'next/link';
import { ArrowRight, Zap, Package, FileText } from 'lucide-react';
import { CopyButton } from '@/components/CopyButton';
import { MEASUREMENTS, REPORTS } from '@/lib/constants';
import { TOOLS } from '@/lib/tools';

interface LatestReport {
  slug: string;
  title: string;
  description: string;
}

interface HeroProps {
  latestReport?: LatestReport;
}

// Static: hover changes colour only; the primary and secondary buttons answer
// a press with a 2% scale on the motion tokens (skipped under reduced motion).
const PRESS =
  'transition-[color,background-color,border-color,transform] duration-fast ease-standard motion-safe:active:scale-[0.98]';
const SECONDARY_CTA = `inline-flex items-center justify-center gap-2 rounded-full border border-border/60 px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-semibold text-foreground hover:border-primary/50 hover:text-primary ${PRESS}`;

export function Hero({ latestReport }: HeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-border/50">
      {/* Background — single subtle radial, no particles */}
      <div className="absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.12),transparent_55%)]" />

      <div className="container relative py-20 md:py-28">
        <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-10">
            <div className="space-y-6">
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex flex-col items-start gap-1.5">
                  <Link
                    href="/papers"
                    className="inline-flex items-center gap-2 rounded-full border border-primary/50 bg-primary/10 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-primary font-semibold transition-colors duration-fast ease-standard hover:bg-primary/20 hover:border-primary/70"
                  >
                    <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
                    Accepted · ICML 2026 Workshop
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                  <Link
                    href="https://arxiv.org/abs/2605.27763"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-4 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-mono text-muted-foreground/70 transition-colors duration-fast ease-standard hover:text-primary"
                  >
                    arXiv:2605.27763
                    <ArrowRight className="h-2.5 w-2.5" />
                  </Link>
                </div>
              </div>

              <h1 className="display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
                Constitutional AI with signed, replayable decision traces
              </h1>

              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
                An AI enforcement architecture with embedding-based safety routing, multi-model
                debate, cryptographic provenance chains, and zero-knowledge proofs — built in
                Python and Rust across 9 repositories.
              </p>
            </div>

            {/* Install commands — the shipped CLIs, rendered from lib/tools.ts so
                versions here can never drift from PyPI (they once sat 7 releases behind) */}
            <div className="flex flex-col gap-2.5">
              {TOOLS.map((tool) => (
                <div key={tool.slug} className="flex items-center gap-3">
                  <div className="inline-flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-2.5 font-mono text-sm backdrop-blur">
                    <Package className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-muted-foreground">$</span>
                    <code className="text-foreground">{tool.install}</code>
                    <CopyButton text={tool.install} label={`${tool.name} install command`} />
                  </div>
                  <Link
                    href={`/tools/${tool.slug}`}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    v{tool.version}
                  </Link>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
              <Link
                href="/reports"
                className={`inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-semibold text-primary-foreground shadow-xl shadow-primary/20 hover:bg-primary/90 ${PRESS}`}
              >
                Read the research
                <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
              <Link href="/episodes" className={SECONDARY_CTA}>
                See the build log
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
              <Link href="/papers" className={SECONDARY_CTA}>
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
                <span className="text-lg font-bold text-foreground">{MEASUREMENTS.SHORT}</span>{' '}
                research measurements
              </div>
            </div>
          </div>

          {/* Latest report sidebar */}
          <aside className="relative w-full">
            <div className="rounded-2xl border border-border/60 bg-card/70 p-6 sm:p-8 shadow-2xl shadow-primary/5 backdrop-blur">
              <div className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
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
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border/60 bg-card/40 px-4 py-2.5 text-xs sm:text-sm font-semibold text-foreground hover:border-primary/50 hover:text-primary ${PRESS}`}
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
                    className={`inline-flex items-center gap-2 rounded-xl border border-border/60 px-6 py-3 text-sm font-semibold text-foreground hover:border-primary/50 hover:text-primary ${PRESS}`}
                  >
                    Browse the archive
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
