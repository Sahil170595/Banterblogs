import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { MEASUREMENTS, REPORTS } from '@/lib/constants';
import { GalacticBackdrop } from './GalacticBackdrop';

// Full-page galactic-center landing. The copy is server-rendered (SEO/LCP
// unaffected by the 3D island behind it); the scene is the navigation:
// the black hole is Chimera, the nine orbiting systems are the repos.
// Height = viewport minus the 72px sticky header so nothing scrolls.

export function GalacticHero() {
  return (
    <section className="relative h-[calc(100svh-73px)] min-h-[560px] overflow-hidden">
      <GalacticBackdrop />

      {/* readability scrim over the left column */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/85 via-background/30 to-transparent"
        aria-hidden="true"
      />

      {/* pointer-events-none so the scene receives hover/click everywhere
          except the actual controls, which re-enable them */}
      <div className="pointer-events-none container relative flex h-full flex-col justify-center">
        <div className="max-w-xl space-y-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
            Constitutional AI · LLM serving-safety research
          </p>
          <h1 className="display text-5xl font-bold tracking-tight text-foreground md:text-7xl">
            Chimeraforge
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Nine repositories in orbit around one platform — {REPORTS.DISPLAY} technical
            reports and {MEASUREMENTS.DISPLAY} measurements deep. The disk is the work;
            the orbits are real Kepler.
          </p>
          <div className="pointer-events-auto flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/reports"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Research archive
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/home"
              className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-background/40 px-6 py-3 text-sm font-semibold text-foreground backdrop-blur transition-colors hover:border-primary/40 hover:text-primary"
            >
              Site overview
            </Link>
          </div>
        </div>

        {/* the quotable physics caption */}
        <p className="absolute bottom-24 right-4 hidden max-w-[240px] text-right font-mono text-[10px] leading-relaxed text-muted-foreground/70 lg:block">
          Orbits: Keplerian, solved per frame.
          <br />
          Disk: T ∝ r<sup>-3/4</sup>, doppler-beamed.
        </p>

        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/60">
          Click a star · Click the core
        </p>
      </div>
    </section>
  );
}
