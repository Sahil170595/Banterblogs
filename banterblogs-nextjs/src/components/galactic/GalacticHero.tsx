import { ArrowRight } from 'lucide-react';
import { NAV_RECEDE_SCOPE_ATTRIBUTE } from '@/components/motion/navRecede';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { IntentLink } from '@/components/ui/IntentLink';
import { MEASUREMENTS, REPORTS } from '@/lib/constants';
import { GalacticBackdrop } from './GalacticBackdrop';

const RECEDE_SCOPE = { [NAV_RECEDE_SCOPE_ATTRIBUTE]: '' };

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

      {/* a followed link recedes this copy layer only; the scene stays lit */}
      <div {...RECEDE_SCOPE} className="pointer-events-none relative z-10 flex h-full flex-col">
        {/* Wherever the poster, or on a short window the disk, sits behind
            this block, its scrim is near-opaque (ember links keep 4.5:1 over
            the arc): below sm its own, from sm a layer over its light one.
            Only the live scene on a tall window lifts that layer
            (.hero-scrim-strong in globals.css). */}
        <div className="relative isolate ml-5 mt-24 max-w-[300px] border-l border-primary/60 bg-gradient-to-r from-black/90 via-black/90 to-black/70 py-2 pl-4 pr-8 backdrop-blur-md rounded-r-lg sm:ml-8 sm:mt-28 sm:from-black/70 sm:via-black/45 sm:to-black/15 sm:backdrop-blur-[2px] md:max-w-md md:pl-5">
          <div
            aria-hidden="true"
            className="hero-scrim-strong pointer-events-none absolute inset-0 -z-10 hidden rounded-r-lg bg-gradient-to-r from-black/90 via-black/90 to-black/70 transition-opacity duration-700 sm:block"
          />
          {/* an interior page head in miniature: the mono eyebrow, the title
              role at the size this panel holds, the copy role */}
          <Eyebrow>Chimera / system atlas 001</Eyebrow>
          <h1 className="mt-3 text-display-32 text-foreground">
            Nine systems.
            <br />
            {/* /55 keeps AA at 22px on phones; /45 measured 4.2:1 */}
            <span className="text-foreground/55">One constitutional core.</span>
          </h1>
          <p className="mt-3 max-w-xs text-copy-14 text-muted-foreground">
            {REPORTS.DISPLAY} technical reports and {MEASUREMENTS.DISPLAY} measurements in orbit.
          </p>
          {/* py-4 grows each link to a >=44px-tall target; the matching -my-4
              keeps the row exactly where it was */}
          <div className="pointer-events-auto mt-4 flex items-center gap-4 text-label-12-mono">
            {/* the main call to action stays warm, once the landing has painted */}
            <IntentLink
              href="/reports"
              warm
              className="-my-4 inline-flex items-center gap-1 py-4 text-primary transition-colors hover:text-primary/80"
            >
              Research archive
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </IntentLink>
            <IntentLink
              href="/papers"
              className="-my-4 py-4 text-foreground/90 transition-colors hover:text-primary"
            >
              Papers
            </IntentLink>
          </div>
        </div>

        {/* on a plate: a star can sit right behind it. It shares the hint's
            bottom edge, which keeps its top below the poster's system links. */}
        <p
          className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-20 hidden max-w-xs rounded-lg border border-white/10 bg-background/80 px-3 py-2 text-right text-label-12-mono text-muted-foreground backdrop-blur-sm lg:block"
          style={{ textShadow: '0 1px 10px rgb(0 0 0), 0 0 4px rgb(0 0 0)' }}
        >
          Orbits: Keplerian, solved per frame.
          <br />
          Disk: T &#8733; r<sup>-3/4</sup>, doppler-beamed.
        </p>

        <p
          className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 flex -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-full border border-white/10 bg-black/25 px-4 py-2 text-label-12-mono text-foreground/80 backdrop-blur-sm"
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
