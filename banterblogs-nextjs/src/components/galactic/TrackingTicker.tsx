import { blackbodyToRGB } from './blackbody';
import type { StarSystemDef } from './systems';

// Bottom-left observatory readout: cycles through the nine systems so a
// passive visitor learns the whole atlas without interacting. Timer-driven,
// NOT transit-driven — real front-crossings cluster and gap (periods run
// ~18s to ~55s), so a physical trigger can't deliver "all nine, one by one".
// The tether to the scene is the featured star's label/orbit glow instead.

// Cold open: the scene gets its first beats before narration starts.
export const TICKER_START_DELAY_MS = 4000;
// Per-system dwell. Floor: the longest name+blurb at the site's 13 CPS
// reading rate (see /show pacing). Ceiling: nine systems must tour inside
// ~a minute, or the loop outlives the visit.
export const TICKER_INTERVAL_MS = 7500;

function tintCss(tempK: number): string {
  const [r, g, b] = blackbodyToRGB(tempK);
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
}

interface TrackingTickerProps {
  system: StarSystemDef;
  /** 1-based position in the tour, shown as "n / total" */
  position: number;
  total: number;
}

export function TrackingTicker({ system, position, total }: TrackingTickerProps) {
  const tint = tintCss(system.tempK);
  return (
    <div
      // rotating copy would spam screen readers; the same info lives in the
      // systems nav (sr-only anchors), so this readout is purely visual
      aria-hidden="true"
      className="pointer-events-none absolute bottom-8 left-5 z-20 hidden max-w-[320px] sm:left-8 md:block"
      style={{ textShadow: '0 1px 10px rgb(0 0 0), 0 0 4px rgb(0 0 0)' }}
    >
      {/* hierarchy over flat scale: the system NAME carries the readout —
          eyebrow and blurb stay caption-weight so the corner doesn't shout */}
      <div
        key={system.name}
        className="font-mono uppercase leading-relaxed tracking-[0.08em]"
        style={{ animation: 'galactic-ticker-in 0.45s ease-out both' }}
      >
        <p className="text-[10px] text-primary/85">
          Tracking · {position} / {total}
        </p>
        <p className="mt-1.5 text-[16px] font-semibold tracking-[0.1em]">
          <span
            className="mr-2.5 inline-block h-2 w-2 rounded-full align-middle"
            style={{ backgroundColor: tint, boxShadow: `0 0 10px ${tint}` }}
          />
          <span style={{ color: tint }}>{system.name}</span>
        </p>
        <p className="mt-1.5 text-[12px] normal-case text-muted-foreground">{system.blurb}</p>
      </div>
    </div>
  );
}
