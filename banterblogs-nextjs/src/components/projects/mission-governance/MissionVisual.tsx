import { LONG_MISSION } from '@/lib/projects/mission-governance/contract';
import { faultMatrix, flewBlind } from '@/lib/projects/mission-governance/matrix';
import type { ProjectVisualProps } from '../visuals';

// The card picture: the page's fault matrix at card size. Two columns of
// six flight tracks, one per fault, at the pre-flight check and mid-flight;
// each track runs as far as the flight got. A track that ends early came
// home; a full track the guard could not see is the accent.

const W = 320;
const H = 180;
const TOP = 34;
const ROW = 22;
const COLUMNS = [44, 186];
const LENGTH = 112;
const DOT = 5;

export function MissionVisual({ accent = true }: ProjectVisualProps) {
  const rows = faultMatrix();
  const total = LONG_MISSION.waypoints.length;
  const plain: string[] = [];
  const blind: string[] = [];
  const stops: string[] = [];
  rows.forEach((row, i) => {
    const y = TOP + i * ROW;
    [row.atCheck, row.midFlight].forEach((flight, c) => {
      const x = COLUMNS[c];
      const reached = flight.flown ? flight.progress : 0;
      const length = (reached / total) * LENGTH;
      if (length > 0) (flewBlind(flight) ? blind : plain).push(`M${x} ${y}h${length.toFixed(1)}`);
      stops.push(`M${(x + length).toFixed(1)} ${y}h0`);
    });
  });
  return (
    <svg className="rv" viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false" data-accent={accent ? 'on' : undefined}>
      <path className="l" d={COLUMNS.map((x) => rows.map((_, i) => `M${x} ${TOP + i * ROW}h${LENGTH}`).join('')).join('')} />
      <path className="k" d={plain.join('')} />
      <path className="h" d={blind.join('')} />
      <path className="d" d={stops.join('')} strokeWidth={DOT} />
    </svg>
  );
}
