import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { MEASUREMENTS, REPORTS } from '@/lib/constants';
import { GalacticBackdrop } from './GalacticBackdrop';

// Full-page galactic-center landing. The scene owns the whole viewport (the
// nav floats transparent above it); the title sits tiny in the top-left like
// a star-chart annotation. The black hole is Chimera, the nine orbiting
// systems are the repos. Copy stays server-rendered for SEO/LCP.

export function GalacticHero() {
  return (
    <section className="relative h-[100svh] min-h-[560px] overflow-hidden">
      <GalacticBackdrop />

      {/* faint top vignette so the transparent nav stays legible */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background/70 to-transparent"
        aria-hidden="true"
      />

      {/* pointer-events-none so the scene receives hover/click everywhere
          except the actual controls, which re-enable them */}
      <div className="pointer-events-none relative flex h-full flex-col">
        {/* tiny corner title — a chart annotation, not a billboard */}
        <div className="ml-6 mt-24 max-w-xs space-y-2 md:ml-10">
          <h1 className="display text-lg font-semibold tracking-tight text-foreground/90">
            Chimeraforge
          </h1>
          <p className="text-[11px] leading-relaxed text-muted-foreground/80">
            Nine repositories orbiting one platform — {REPORTS.DISPLAY} technical reports,{' '}
            {MEASUREMENTS.DISPLAY} measurements.
          </p>
          <div className="pointer-events-auto flex items-center gap-4 pt-1 text-[11px] font-semibold">
            <Link
              href="/reports"
              className="inline-flex items-center gap-1 text-primary transition-colors hover:text-primary/80"
            >
              Research archive
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
            <Link
              href="/home"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Site overview
            </Link>
          </div>
        </div>

        {/* the quotable physics caption */}
        <p
          className="absolute bottom-16 right-4 hidden max-w-[240px] text-right font-mono text-[10px] leading-relaxed text-muted-foreground lg:block"
          style={{ textShadow: '0 1px 10px rgb(0 0 0), 0 0 4px rgb(0 0 0)' }}
        >
          Orbits: Keplerian, solved per frame.
          <br />
          Disk: T ∝ r<sup>-3/4</sup>, doppler-beamed.
        </p>

        <p
          className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground"
          style={{ textShadow: '0 1px 10px rgb(0 0 0), 0 0 4px rgb(0 0 0)' }}
        >
          Click a star · Click the core
        </p>
      </div>
    </section>
  );
}
