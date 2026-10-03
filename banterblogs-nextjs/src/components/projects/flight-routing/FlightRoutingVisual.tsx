import { TIGHT_CONFIG } from '@/lib/projects/flight-routing/experiment';
import { evaluateWorlds, type WorldOutcome } from '@/lib/projects/flight-routing/worlds';
import type { ProjectVisualProps } from '../visuals';

// The card picture: the page's finding at card size. The same 64 worlds under
// the tight deadline, nonstop-first on the left, deadline lookahead on the
// right; an on-time world is the accent square, a late one a plain square, a
// failed one an empty outline. Drawn in the archive visuals' .rv vocabulary.

const W = 320;
const H = 180;
const COLUMNS = 8;
const PITCH = 16;
const SQUARE = 12;
const GRID = COLUMNS * PITCH;
// the archive visuals' drawing margin
const MARGIN = 22;
const GAP = W - 2 * MARGIN - 2 * GRID;
const LEFT = MARGIN;
const TOP = (H - GRID) / 2;
const COMPARED = ['nonstop', 'deadline'] as const;

function centre(grid: number, index: number) {
  const x = LEFT + grid * (GRID + GAP) + (index % COLUMNS) * PITCH + PITCH / 2;
  const y = TOP + Math.floor(index / COLUMNS) * PITCH + PITCH / 2;
  return [x, y] as const;
}

export function FlightRoutingVisual({ accent = true }: ProjectVisualProps) {
  const rows = evaluateWorlds(TIGHT_CONFIG).filter((row) => (COMPARED as readonly string[]).includes(row.policy));
  const paths: Record<WorldOutcome, string[]> = { 'on-time': [], late: [], failed: [] };
  COMPARED.forEach((policy, grid) => {
    rows
      .find((row) => row.policy === policy)!
      .worlds.forEach((world, index) => {
        const [x, y] = centre(grid, index);
        if (world.outcome === 'failed') paths.failed.push(`M${x - SQUARE / 2} ${y - SQUARE / 2}h${SQUARE}v${SQUARE}h-${SQUARE}z`);
        else paths[world.outcome].push(`M${x} ${y}h0`);
      });
  });
  return (
    <svg className="rv" viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false" data-accent={accent ? 'on' : undefined}>
      <path className="l" d={paths.failed.join('')} />
      <path className="d" d={paths.late.join('')} strokeWidth={SQUARE} />
      <path className="d h" d={paths['on-time'].join('')} strokeWidth={SQUARE} />
    </svg>
  );
}
