import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, evaluate } from './engine';
import { constantShare, verdict } from './verdict';

// The page's headline is computed, never written: what the paired interval
// says about the target against the logger, and how much of any gain a
// control that ignores the state also gets.

describe('evaluation verdict', () => {
  const base = evaluate(DEFAULT_CONFIG);

  it('reports a gain only when the paired interval clears zero, with the constant control’s share', () => {
    const v = verdict(base, 'normalized');
    expect(v.tone).toBe('gain');
    expect(v.headline).toMatch(/^The target beats the logger by 0\.27 \(paired 95% interval 0\.12 to 0\.40\)\.$/);
    expect(constantShare(base, 'normalized')).toBeCloseTo(0.65, 2);
    expect(v.detail).toMatch(/^A control that never reads the state gets 65% of that gain/);
  });

  it('says there is no measurable difference when the interval crosses zero', () => {
    const v = verdict(evaluate({ ...DEFAULT_CONFIG, gainWeight: 0 }), 'normalized');
    expect(v.tone).toBe('none');
    expect(v.headline).toBe('No measurable difference from the logger: the paired 95% interval runs from −0.21 to 0.05.');
  });

  it('says so when the logger wins', () => {
    const v = verdict(evaluate({ ...DEFAULT_CONFIG, scenario: 'balanced' }), 'normalized');
    expect(v.tone).toBe('loss');
    expect(v.headline).toMatch(/^The logger beats the target by 0\.09/);
  });

  it('withholds rather than estimates when the target needs an action the logger never takes', () => {
    const v = verdict(evaluate({ ...DEFAULT_CONFIG, scenario: 'gap' }), 'normalized');
    expect(v.tone).toBe('withheld');
    expect(v.headline).toBe('Withheld: part of the target has no logged evidence.');
    expect(v.detail).toMatch(/puts \d+% on Intensify at low load, where the logger never does/);
  });
});
