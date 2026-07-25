import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { MEASUREMENTS, REPORTS } from '@/lib/constants';
import { GalacticBackdrop } from './GalacticBackdrop';

export function GalacticHero() {
  return (
    <section className="galactic-landing relative h-[100svh] min-h-[620px] overflow-hidden">
      <div className="galactic-contrast-scrim pointer-events-none absolute inset-0 z-[1]" aria-hidden="true" />
      <div className="galactic-edge-vignette pointer-events-none absolute inset-0 z-[2]" aria-hidden="true" />

      <div className="pointer-events-none absolute inset-0 z-10">
        <div className="galactic-hero-copy absolute left-[var(--landing-gutter)] top-[88px] max-w-[min(36rem,88vw)] md:top-[clamp(100px,18vh,172px)]">
          <div className="galactic-intro-1 flex items-center gap-3">
            <span className="h-px w-8 bg-primary/85" aria-hidden="true" />
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.28em] text-primary sm:text-[10px]">
              Chimera / physical system atlas
            </p>
          </div>

          <h1 className="galactic-intro-2 display mt-4 text-[2.15rem] font-semibold leading-[0.94] tracking-[-0.055em] text-foreground sm:mt-5 sm:text-[clamp(2.55rem,4.5vw,5rem)]">
            Nine systems.
            <br />
            <span className="text-foreground/[0.48]">One constitutional core.</span>
          </h1>

          <p className="galactic-intro-3 mt-4 max-w-md text-[11px] leading-relaxed text-muted-foreground sm:mt-5 sm:text-[13px]">
            <span className="sm:hidden">
              {REPORTS.DISPLAY} technical reports · {MEASUREMENTS.DISPLAY} measurements · nine repositories.
            </span>
            <span className="hidden sm:inline">
              A living map of the Chimera architecture: {REPORTS.DISPLAY} technical reports and{' '}
              {MEASUREMENTS.DISPLAY} measurements held in one gravitational model.
            </span>
          </p>

          <div className="galactic-intro-4 pointer-events-auto mt-4 flex items-center gap-5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] sm:mt-6 sm:gap-6 sm:text-[11px]">
            <Link
              href="/reports"
              className="group inline-flex min-h-11 items-center gap-2 border-b border-primary/70 text-primary transition-colors hover:border-primary hover:text-primary/80"
            >
              Research archive
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
            <Link
              href="/home"
              className="inline-flex min-h-11 items-center border-b border-white/20 text-foreground/85 transition-colors hover:border-white/60 hover:text-foreground"
            >
              Overview
            </Link>
          </div>
        </div>

        <div className="galactic-physics-caption absolute bottom-[128px] right-[var(--landing-gutter)] hidden text-right font-mono text-[9px] uppercase leading-[1.8] tracking-[0.12em] text-foreground/45 lg:block">
          <p className="text-primary/75">Physical model / live</p>
          <p>
            Keplerian orbits · solved per frame
            <br />
            Shakura–Sunyaev disk · T ∝ r<sup>-3/4</sup>
            <br />
            Relativistic Doppler asymmetry · 2.6:1
          </p>
        </div>

        <p className="galactic-coordinate absolute right-[var(--landing-gutter)] top-24 hidden font-mono text-[9px] uppercase tracking-[0.2em] text-foreground/35 md:block">
          Atlas 001 / 09 bodies
        </p>
      </div>

      <GalacticBackdrop />
    </section>
  );
}
