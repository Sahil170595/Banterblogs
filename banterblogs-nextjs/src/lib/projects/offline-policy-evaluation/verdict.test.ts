import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, evaluate } from './engine';
import { constantShare, signed, verdict } from './verdict';

// The page's headline is computed, never written: what the paired interval
// says about the target against the logger, and how much of any gain a
// control that ignores the state also gets.

describe('signed', () => {
  // live QA: Broad under Raw IS showed "−0.00"
  it('never writes a minus sign on a value that rounds to zero', () => {
    expect(signed(-0.004)).toBe('0.00');
    expect(signed(-0)).toBe('0.00');
    expect(signed(-0.006)).toBe('−0.01');
    expect(signed(0.27)).toBe('0.27');
  });
});

describe('evaluation verdict', () => {
  const base = evaluate(DEFAULT_CONFIG);

  // re-review: a bold "the target beats the logger" read as the page's
  // conclusion; the control that takes most of the gain carries equal weight
  it('reports a gain only when the paired interval clears zero, with the constant control’s share in the same line', () => {
    const v = verdict(base, 'normalized');
    expect(v.tone).toBe('gain');
    expect(v.headline).toBe(
      'On its face the target beats the logger by 0.27 (paired 95% interval for target − logger: 0.12 to 0.40), but a control that never reads the state (the load) gets 65% of that gain: most of it is a shift in how often to act, not when.',
    );
    expect(constantShare(base, 'normalized')).toBeCloseTo(0.65, 2);
  });

  it('gives the part of the gain that depends on the state its own paired interval, and says the share is a ratio of point estimates', () => {
    const v = verdict(base, 'normalized');
    expect(v.detail).toBe(
      'The part that depends on reading the state, target − control, is 0.10 (paired 95% interval 0.03 to 0.17). The 65% is a ratio of the two point estimates, taken before rounding.',
    );
  });

  it('says there is no measurable difference when the interval crosses zero', () => {
    const v = verdict(evaluate({ ...DEFAULT_CONFIG, gainWeight: 0 }), 'normalized');
    expect(v.tone).toBe('none');
    expect(v.headline).toBe('No measurable difference from the logger: the paired 95% interval for target − logger runs from −0.21 to 0.05.');
  });

  // the gap is stated as the logger's lead; the interval stays target − logger, and says so
  it('says so when the logger wins, naming which way the interval runs', () => {
    const v = verdict(evaluate({ ...DEFAULT_CONFIG, scenario: 'balanced' }), 'normalized');
    expect(v.tone).toBe('loss');
    expect(v.headline).toBe('The logger beats the target by 0.09 (paired 95% interval for target − logger: −0.17 to −0.01).');
  });

  it('withholds rather than estimates when the target needs an action the logger never takes', () => {
    const v = verdict(evaluate({ ...DEFAULT_CONFIG, scenario: 'gap' }), 'normalized');
    expect(v.tone).toBe('withheld');
    expect(v.headline).toBe('Withheld: part of the target has no logged evidence.');
    expect(v.detail).toMatch(/puts \d+% on Intensify at low load, where the logger never does/);
  });
});
