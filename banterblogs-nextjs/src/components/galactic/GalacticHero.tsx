import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { MEASUREMENTS, REPORTS } from '@/lib/constants';
import { GalacticBackdrop } from './GalacticBackdrop';

export function GalacticHero() {
  return (
    <section className="group/hero relative h-[100svh] min-h-[560px] overflow-hidden">
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
        {/* Wherever the poster, or on a short window the disk, sits behind
            this block, its scrim is near-opaque (ember links keep 4.5:1 over
            the arc); only the live scene on a tall window reads through the
            light one. The two crossfade (.hero-scrim-* in globals.css). */}
        <div className="relative isolate ml-5 mt-24 max-w-[300px] rounded-r-lg border-l border-primary/60 py-2 pl-4 pr-8 sm:ml-8 sm:mt-28 md:max-w-md md:pl-5">
          <div
            aria-hidden="true"
            className="hero-scrim-strong pointer-events-none absolute inset-0 -z-10 rounded-r-lg bg-gradient-to-r from-black/90 via-black/90 to-black/70 backdrop-blur-md"
          />
          <div
            aria-hidden="true"
            className="hero-scrim-light pointer-events-none absolute inset-0 -z-10 rounded-r-lg bg-gradient-to-r from-black/70 via-black/45 to-black/15 backdrop-blur-[2px]"
          />
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
          {/* py-4 grows each link to a >=44px-tall target; the matching -my-4
              keeps the row exactly where it was */}
          <div className="pointer-events-auto mt-4 flex items-center gap-4 text-[10px] font-semibold uppercase tracking-[0.12em] sm:text-[11px]">
            <Link
              href="/reports"
              className="-my-4 inline-flex items-center gap-1 py-4 text-primary transition-colors hover:text-primary/80"
            >
              Research archive
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
            <Link
              href="/papers"
              className="-my-4 py-4 text-foreground/90 transition-colors hover:text-primary"
            >
              Papers
            </Link>
          </div>
        </div>

        {/* on a plate: a star can sit right behind it */}
        <p
          className="absolute bottom-8 right-20 hidden max-w-[280px] rounded-lg border border-white/10 bg-black/80 px-3 py-2 text-right font-mono text-[10px] uppercase leading-relaxed tracking-[0.08em] text-muted-foreground backdrop-blur-sm lg:block"
          style={{ textShadow: '0 1px 10px rgb(0 0 0), 0 0 4px rgb(0 0 0)' }}
        >
          Orbits: Keplerian, solved per frame.
          <br />
          Disk: T &#8733; r<sup>-3/4</sup>, doppler-beamed.
        </p>

        <p
          className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 flex -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-full border border-white/10 bg-black/25 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/80 backdrop-blur-sm"
          style={{ textShadow: '0 1px 10px rgb(0 0 0), 0 0 4px rgb(0 0 0)' }}
        >
          <span className="h-1 w-1 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />
          Select a system
        </p>
      </div>

      {/* rendered after the copy so tab order runs copy links -> systems nav
          (visual stacking is unchanged — controlled by z-index) */}
      <GalacticBackdrop />
    </section>
  );
}
