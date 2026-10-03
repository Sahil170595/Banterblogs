import { ACTIONS, CONTEXTS, type Evaluation, type Method } from './engine';

// What an evaluation supports saying about the state-responsive target
// against the factual logger, in one headline and one qualifying line.

export type VerdictTone = 'gain' | 'loss' | 'none' | 'withheld';

export interface Verdict {
  tone: VerdictTone;
  headline: string;
  detail: string | null;
}

/** from this share up, the constant control explains most of the target's gain */
const MOSTLY = 0.5;
const PERCENT = 100;

/** a signed estimate with a true minus sign, two places */
export const signed = (value: number) => (value < 0 ? `−${Math.abs(value).toFixed(2)}` : value.toFixed(2));
const percent = (share: number) => `${Math.round(share * PERCENT)}%`;

/** the constant control's gain over the logger as a share of the target's; null when the target has no gain */
export function constantShare(evaluation: Evaluation, method: Method): number | null {
  const [target, constant] = evaluation.comparisons;
  const targetValue = target.result[method];
  const constantValue = constant.result[method];
  if (targetValue === null || constantValue === null) return null;
  const gain = targetValue - target.result.logged;
  return gain > 0 ? (constantValue - constant.result.logged) / gain : null;
}

/** the part of the target's value that reading the state adds, with its paired interval */
function stateDetail(evaluation: Evaluation, method: Method, shown: string): string | null {
  const [target, constant] = evaluation.comparisons;
  const interval = evaluation.stateDifferences[method];
  const targetValue = target.result[method];
  const constantValue = constant.result[method];
  if (!interval || targetValue === null || constantValue === null) return null;
  const range = `${signed(interval[0])} to ${signed(interval[1])}`;
  const crosses = interval[0] <= 0 && interval[1] >= 0;
  return (
    `The part that depends on reading the state, target − control, is ${signed(targetValue - constantValue)} (paired 95% interval ${range})` +
    `${crosses ? ', which crosses zero' : ''}. The ${shown} is a ratio of the two point estimates, taken before rounding.`
  );
}

export function verdict(evaluation: Evaluation, method: Method): Verdict {
  const [target] = evaluation.comparisons;
  const value = target.result[method];
  if (value === null) {
    const gap = target.result.supportCheck.gaps[0];
    if (!gap) return { tone: 'withheld', headline: 'Unavailable: every capped weight is zero at some step.', detail: null };
    return {
      tone: 'withheld',
      headline: 'Withheld: part of the target has no logged evidence.',
      detail: `The target puts ${percent(gap.targetProbability)} on ${ACTIONS[gap.action]} at ${CONTEXTS[gap.context].toLowerCase()}, where the logger never does. Capping weights cannot create that evidence, so no estimate is reported.`,
    };
  }
  const interval = target.differences[method];
  const gain = value - target.result.logged;
  if (!interval) return { tone: 'none', headline: `Point estimate ${signed(value)}; no paired interval for this estimator.`, detail: null };
  const range = `${signed(interval[0])} to ${signed(interval[1])}`;
  // the interval is always target − logger, whichever way the headline states the gap
  if (interval[0] > 0) {
    const share = constantShare(evaluation, method);
    const claim = `the target beats the logger by ${signed(gain)} (paired 95% interval for target − logger: ${range})`;
    if (share === null) return { tone: 'gain', headline: `${claim.replace(/^t/, 'T')}.`, detail: null };
    const reading = share >= MOSTLY ? 'most of it is a shift in how often to act, not when' : 'the state dependence carries most of it';
    const shown = percent(Math.max(0, share));
    // the control's share sits in the headline: on its own the gain read as the conclusion
    return {
      tone: 'gain',
      headline: `On its face ${claim}, but a control that never reads the state (the load) gets ${shown} of that gain: ${reading}.`,
      detail: stateDetail(evaluation, method, shown),
    };
  }
  if (interval[1] < 0) {
    return {
      tone: 'loss',
      headline: `The logger beats the target by ${signed(-gain)} (paired 95% interval for target − logger: ${range}).`,
      detail: null,
    };
  }
  return {
    tone: 'none',
    headline: `No measurable difference from the logger: the paired 95% interval for target − logger runs from ${range}.`,
    detail: null,
  };
}
