import { measureControls } from '@/lib/projects/customer-service/measurements';
import type { ProjectVisualProps } from '../visuals';

// The card picture: the page's board at card size. One bar per scored
// control trajectory from a zero rule, resolved cases in the accent, the
// rest plain; a bar left of the rule earned a negative reward.

const W = 320;
const H = 180;
const LEFT = 40;
const RIGHT = 280;
const TOP = 26;
const BOTTOM = 154;
const AXIS_MIN = -0.5;
const AXIS_MAX = 1;
const BAR = 7;

const x = (score: number) => (LEFT + ((score - AXIS_MIN) / (AXIS_MAX - AXIS_MIN)) * (RIGHT - LEFT)).toFixed(1);

export function ServiceVisual({ accent = true }: ProjectVisualProps) {
  const controls = measureControls();
  const pitch = (BOTTOM - TOP) / (controls.length - 1);
  const bars = controls.map((c, i) => ({ d: `M${x(0)} ${(TOP + i * pitch).toFixed(1)}H${x(c.score)}`, resolved: c.completed && c.score >= AXIS_MAX }));
  return (
    <svg className="rv" viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false" data-accent={accent ? 'on' : undefined}>
      <path className="l" d={`M${x(0)} ${TOP - BAR}V${BOTTOM + BAR}`} />
      <path className="d" d={bars.filter((b) => !b.resolved).map((b) => b.d).join('')} strokeWidth={BAR} />
      <path className="d h" d={bars.filter((b) => b.resolved).map((b) => b.d).join('')} strokeWidth={BAR} />
    </svg>
  );
}
