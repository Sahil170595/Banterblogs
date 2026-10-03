import { judge, SCENARIOS } from '@/lib/projects/workflow-observatory/scenarios';
import type { ProjectVisualProps } from '../visuals';

// The card picture: the page's evidence table at card size. Six attempts by
// notice, Parallax's check, completion gate and record; a verdict that agrees
// with the record is a square when it says done and an outline when it says
// not done, one that disagrees is crossed, and the committed record is the
// accent. Drawn in the archive visuals' .rv vocabulary.

const W = 320;
const H = 180;
const PITCH = 26;
const COLUMN = 40;
const SQUARE = 14;
const LABEL = 56;
const GAP = 18;
const COLUMNS = 4;
const HALF = SQUARE / 2;
const LEFT = (W - LABEL - GAP - COLUMNS * COLUMN) / 2;
const TOP = (H - SCENARIOS.length * PITCH) / 2;

export function WorkflowVisual({ accent = true }: ProjectVisualProps) {
  const paths = { label: [] as string[], done: [] as string[], record: [] as string[], open: [] as string[], wrong: [] as string[] };
  SCENARIOS.forEach((scenario, row) => {
    const { notice, parallax, gate, record } = judge(scenario);
    const y = TOP + row * PITCH + PITCH / 2;
    paths.label.push(`M${LEFT} ${y}h${LABEL}`);
    [notice, parallax, gate, record].forEach((says, col) => {
      const x = LEFT + LABEL + GAP + col * COLUMN + COLUMN / 2;
      const box = `M${x - HALF} ${y - HALF}h${SQUARE}v${SQUARE}h-${SQUARE}z`;
      if (says !== record) paths.wrong.push(box, `M${x - HALF} ${y - HALF}l${SQUARE} ${SQUARE}m0 -${SQUARE}l-${SQUARE} ${SQUARE}`);
      else if (!says) paths.open.push(box);
      else (col === COLUMNS - 1 ? paths.record : paths.done).push(`M${x} ${y}h0`);
    });
  });
  // the record column is what the others are read against
  const rule = LEFT + LABEL + GAP + (COLUMNS - 1) * COLUMN;
  paths.label.push(`M${rule} ${TOP}v${SCENARIOS.length * PITCH}`);
  return (
    <svg className="rv" viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false" data-accent={accent ? 'on' : undefined}>
      <path className="l" d={[...paths.label, ...paths.open].join('')} />
      <path className="k" d={paths.wrong.join('')} />
      <path className="d" d={paths.done.join('')} strokeWidth={SQUARE} />
      <path className="d h" d={paths.record.join('')} strokeWidth={SQUARE} />
    </svg>
  );
}
