import { describe, expect, it } from 'vitest';
import { along, percent, span } from '../geometry';

// Inline positions at a fixed precision, so the server's HTML and the
// browser's render agree at hydration (a long float reads back shortened).

describe('demo geometry', () => {
  it('writes shares at two places, clamped to the track', () => {
    expect(percent(0.41327370452475)).toBe('41.33%');
    expect(percent(-0.2)).toBe('0.00%');
    expect(percent(1.7)).toBe('100.00%');
  });

  it('places a value and a span on a track as one left and one width', () => {
    expect(along(480, 0, 960)).toBe('50.00%');
    expect(span(-0.39, 0.13, -0.6, 0.2)).toEqual({ left: '26.25%', width: '65.00%' });
    expect(span(0.5, 3, 0, 1)).toEqual({ left: '50.00%', width: '50.00%' });
  });
});
