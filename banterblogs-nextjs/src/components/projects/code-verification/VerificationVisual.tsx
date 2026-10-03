import { CANDIDATES, evaluate, initialConfig, type Transition } from '@/lib/projects/code-verification/engine';
import type { ProjectVisualProps } from '../visuals';

// The card picture: the page's matrix at card size. Four patches by six
// tests of the interval task; a repaired test is the accent square, one that
// still passes a plain square, one still broken an outline, a regression a
// crossed square. Drawn in the archive visuals' .rv vocabulary.

const W = 320;
const H = 180;
const PITCH = 30;
const SQUARE = 20;
const TESTS = 6;
const LEFT = (W - TESTS * PITCH) / 2;
const TOP = (H - CANDIDATES.length * PITCH) / 2;
const HALF = SQUARE / 2;

export function VerificationVisual({ accent = true }: ProjectVisualProps) {
  const paths: Record<Transition, string[]> = { 'fail-pass': [], 'pass-pass': [], 'fail-fail': [], 'pass-fail': [] };
  CANDIDATES.forEach((candidate, row) => {
    evaluate({ ...initialConfig('intervals'), candidateId: candidate.id }).rows.forEach((test, col) => {
      const x = LEFT + col * PITCH + PITCH / 2;
      const y = TOP + row * PITCH + PITCH / 2;
      if (test.transition === 'fail-fail' || test.transition === 'pass-fail') {
        paths[test.transition].push(`M${x - HALF} ${y - HALF}h${SQUARE}v${SQUARE}h-${SQUARE}z`);
        if (test.transition === 'pass-fail') paths['pass-fail'].push(`M${x - HALF} ${y - HALF}l${SQUARE} ${SQUARE}m0 -${SQUARE}l-${SQUARE} ${SQUARE}`);
      } else paths[test.transition].push(`M${x} ${y}h0`);
    });
  });
  return (
    <svg className="rv" viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false" data-accent={accent ? 'on' : undefined}>
      <path className="l" d={paths['fail-fail'].join('')} />
      <path className="k" d={paths['pass-fail'].join('')} />
      <path className="d" d={paths['pass-pass'].join('')} strokeWidth={SQUARE} />
      <path className="d h" d={paths['fail-pass'].join('')} strokeWidth={SQUARE} />
    </svg>
  );
}
