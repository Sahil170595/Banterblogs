import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { MEASUREMENTS, REPORTS } from '@/lib/constants';
import { GalacticBackdrop } from './GalacticBackdrop';

export function GalacticHero() {
  return (
    <section className="relative h-[100svh] min-h-[560px] overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_56%_48%,transparent_0%,transparent_33%,rgba(2,4,8,0.18)_62%,rgba(2,4,8,0.72)_100%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-background/85 via-background/30 to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background/75 to-transparent"
        aria-hidden="true"
      />

      <div className="pointer-events-none relative z-10 flex h-full flex-col">
        <div className="ml-5 mt-24 max-w-[300px] border-l border-primary/60 bg-gradient-to-r from-black/70 via-black/45 to-black/15 py-2 pl-4 pr-8 backdrop-blur-[2px] rounded-r-lg sm:ml-8 sm:mt-28 md:max-w-md md:pl-5">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.28em] text-primary/85">
            Chimera / system atlas 001
          </p>
          <h1 className="display mt-3 text-xl font-semibold leading-[1.05] tracking-[-0.03em] text-foreground sm:text-2xl md:text-3xl">
            Nine systems.
            <br />
            <span className="text-foreground/45">One constitutional core.</span>
          </h1>
          <p className="mt-3 max-w-xs text-[11px] leading-relaxed text-muted-foreground sm:text-[12px]">
            {REPORTS.DISPLAY} technical reports and {MEASUREMENTS.DISPLAY} measurements in orbit.
          </p>
          <div className="pointer-events-auto mt-4 flex items-center gap-4 text-[10px] font-semibold uppercase tracking-[0.12em] sm:text-[11px]">
            <Link
              href="/reports"
              className="inline-flex items-center gap-1 text-primary transition-colors hover:text-primary/80"
            >
              Research archive
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
            <Link
              href="/home"
              className="text-foreground/90 transition-colors hover:text-primary"
            >
              Overview
            </Link>
          </div>
        </div>

        <p
          className="absolute bottom-8 right-20 hidden max-w-[280px] text-right font-mono text-[10px] uppercase leading-relaxed tracking-[0.08em] text-muted-foreground lg:block"
          style={{ textShadow: '0 1px 10px rgb(0 0 0), 0 0 4px rgb(0 0 0)' }}
        >
          Orbits: Keplerian, solved per frame.
          <br />
          Disk: T &#8733; r<sup>-3/4</sup>, doppler-beamed.
        </p>

        <p
          className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-full border border-white/10 bg-black/25 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/80 backdrop-blur-sm"
          style={{ textShadow: '0 1px 10px rgb(0 0 0), 0 0 4px rgb(0 0 0)' }}
        >
          <span className="h-1 w-1 animate-pulse rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />
          Select a system
        </p>
      </div>

      {/* rendered after the copy so tab order runs copy links -> systems nav
          (visual stacking is unchanged — controlled by z-index) */}
      <GalacticBackdrop />
    </section>
  );
}
