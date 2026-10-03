import { runReplay, SOURCE_REPLAY } from '@/lib/projects/send-pacing/scheduler';
import type { ProjectVisualProps } from '../visuals';

// The card picture: the page's timeline at card size, for the source replay.
// One hairline per message, a tick where it was sent, and the campaign's end
// as a rule; the sends that went before they could be typed are the accent
// squares piled on that rule. Drawn in the .rv vocabulary.

const W = 320;
const H = 180;
const LEFT = 28;
const RIGHT = 292;
const TOP = 24;
const ROW = 11;
const TICK = 7;
const SQUARE = 7;

export function PacingVisual({ accent = true }: ProjectVisualProps) {
  const result = runReplay(SOURCE_REPLAY);
  const late = new Set(result.violations.filter((v) => v.code === 'before_preparation').map((v) => v.index));
  const x = (t: number) => LEFT + ((t - result.start) / (result.end - result.start)) * (RIGHT - LEFT);
  const tracks: string[] = [];
  const ticks: string[] = [];
  const lateTicks: string[] = [];
  result.schedule.forEach((row, i) => {
    const y = TOP + i * ROW;
    tracks.push(`M${LEFT} ${y}h${RIGHT - LEFT}`);
    if (late.has(i)) lateTicks.push(`M${x(row.sendTime)} ${y}h0`);
    else ticks.push(`M${x(row.sendTime)} ${y - TICK / 2}v${TICK}`);
  });
  const bottom = TOP + (result.schedule.length - 1) * ROW;
  return (
    <svg className="rv" viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false" data-accent={accent ? 'on' : undefined}>
      <path className="l" d={tracks.join('')} />
      <path className="k" d={`M${RIGHT} ${TOP - ROW}V${bottom + ROW}${ticks.join('')}`} />
      <path className="d h" d={lateTicks.join('')} strokeWidth={SQUARE} />
    </svg>
  );
}
