import { DEFAULT_CONFIG, evaluate } from '@/lib/projects/offline-policy-evaluation/engine';
import type { ProjectVisualProps } from '../visuals';

// The card picture: the page's interval plot at card size. Target, constant
// control and logger as intervals on one axis; the target's point is the
// accent, the logger's line the dashed rule. Drawn in the .rv vocabulary.

const W = 320;
const H = 180;
const LEFT = 40;
const RIGHT = 280;
const ROWS = [52, 90, 128];
const TOP = 30;
const BOTTOM = 150;
const POINT = 9;
const PAD = 0.1;

export function OpeVisual({ accent = true }: ProjectVisualProps) {
  const evaluation = evaluate(DEFAULT_CONFIG);
  const [target, constant, logger] = evaluation.comparisons;
  const rows = [
    { value: target.result.normalized!, interval: target.intervals.normalized! },
    { value: constant.result.normalized!, interval: constant.intervals.normalized! },
    { value: target.result.logged, interval: logger.intervals.normalized! },
  ];
  const values = rows.flatMap((r) => [r.value, ...r.interval]);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo;
  const x = (v: number) => (LEFT + ((v - (lo - span * PAD)) / (span * (1 + 2 * PAD))) * (RIGHT - LEFT)).toFixed(1);
  const loggerX = x(target.result.logged);
  return (
    <svg className="rv" viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false" data-accent={accent ? 'on' : undefined}>
      <path className="l" d={`M${LEFT} ${BOTTOM}H${RIGHT}`} />
      <path className="l" d={`M${loggerX} ${TOP}V${BOTTOM}`} strokeDasharray="3 4" />
      {rows.map((row, i) => (
        <path key={i} className={i === 0 ? 'h' : 'k'} d={`M${x(row.interval[0])} ${ROWS[i]}H${x(row.interval[1])}`} />
      ))}
      <path className="d h" d={`M${x(rows[0].value)} ${ROWS[0]}h0`} strokeWidth={POINT} />
      <path className="d" d={`M${x(rows[1].value)} ${ROWS[1]}h0M${x(rows[2].value)} ${ROWS[2]}h0`} strokeWidth={POINT} />
    </svg>
  );
}
