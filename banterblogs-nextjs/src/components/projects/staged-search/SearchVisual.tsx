import { EXAMPLE_QUERY } from '@/lib/projects/staged-search/example';
import { ladder } from '@/lib/projects/staged-search/ladder';
import { DEFAULT_SETTINGS } from '@/lib/projects/staged-search/schema';
import type { ProjectVisualProps } from '../visuals';

// The card picture: the page's ladder at card size. One row per outcome;
// on the left a tick per requested filter, gone once dropped; on the right a
// square per result, crossed when it falls outside the request, in the
// accent at the source's default threshold. Drawn in the .rv vocabulary.

const W = 320;
const H = 180;
const ROW = 46;
const TICK = 14;
const TICK_GAP = 10;
const SQUARE = 18;
const PITCH = 28;
const LEFT = 56;
const RESULTS = 150;

export function SearchVisual({ accent = true }: ProjectVisualProps) {
  const rungs = ladder(EXAMPLE_QUERY, DEFAULT_SETTINGS);
  const top = (H - rungs.length * ROW) / 2 + ROW / 2;
  const ticks: string[] = [];
  const fits: string[] = [];
  const broken: string[] = [];
  const brokenAtDefault: string[] = [];
  rungs.forEach((rung, row) => {
    const y = top + row * ROW;
    const dropped = rung.report?.dropped.length ?? 0;
    EXAMPLE_QUERY.filters.forEach((_, i) => {
      if (i >= EXAMPLE_QUERY.filters.length - dropped) return;
      ticks.push(`M${LEFT + i * TICK_GAP} ${y - TICK / 2}v${TICK}`);
    });
    const atDefault = rung.from <= DEFAULT_SETTINGS.relax_threshold && (rung.to === null || DEFAULT_SETTINGS.relax_threshold <= rung.to);
    rung.broken.forEach((fails, i) => {
      const x = LEFT + RESULTS - LEFT / 2 + i * PITCH;
      if (!fails.length) {
        fits.push(`M${x} ${y}h0`);
        return;
      }
      const h = SQUARE / 2;
      const path = `M${x - h} ${y - h}h${SQUARE}v${SQUARE}h-${SQUARE}zM${x - h} ${y - h}l${SQUARE} ${SQUARE}`;
      (atDefault ? brokenAtDefault : broken).push(path);
    });
  });
  return (
    <svg className="rv" viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false" data-accent={accent ? 'on' : undefined}>
      <path className="k" d={ticks.join('')} />
      <path className="k" d={broken.join('')} />
      <path className="h" d={brokenAtDefault.join('')} />
      <path className="d" d={fits.join('')} strokeWidth={SQUARE} />
    </svg>
  );
}
