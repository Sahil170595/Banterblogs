import { concurrentOutcomes } from '@/lib/projects/collaborative-whiteboard/scenarios';
import type { ProjectVisualProps } from '../visuals';

// The card picture: the page's table at card size. Eight rows, one per order
// two concurrent edits can take; in each, three squares for the database and
// the two screens. A screen that disagrees with the database is the accent.

const W = 320;
const H = 180;
const TOP = 26;
const ROW = 18;
const COLUMNS = [118, 160, 202];
const SQUARE = 11;

export function WhiteboardVisual({ accent = true }: ProjectVisualProps) {
  const rows = concurrentOutcomes('arrival');
  const agree: string[] = [];
  const split: string[] = [];
  const rule: string[] = [];
  rows.forEach(({ outcome }, i) => {
    const y = TOP + i * ROW;
    rule.push(`M${COLUMNS[0] - 24} ${y}h-48`);
    agree.push(`M${COLUMNS[0]} ${y}h0`);
    (['A', 'B'] as const).forEach((client, c) => {
      (outcome.diverged.includes(client) ? split : agree).push(`M${COLUMNS[c + 1]} ${y}h0`);
    });
  });
  return (
    <svg className="rv" viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false" data-accent={accent ? 'on' : undefined}>
      <path className="l" d={`${rule.join('')}M${COLUMNS[0] + 21} ${TOP - 10}V${TOP + (rows.length - 1) * ROW + 10}`} />
      <path className="d" d={agree.join('')} strokeWidth={SQUARE} />
      <path className="d h" d={split.join('')} strokeWidth={SQUARE} />
    </svg>
  );
}
