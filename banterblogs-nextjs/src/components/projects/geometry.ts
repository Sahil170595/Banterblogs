// Positions the project demos draw with inline styles. Browsers normalize a
// long percentage (41.327370452475% reads back as 41.3274%), so the server's
// HTML and the client's render disagree at hydration; a fixed precision,
// and one width value rather than a calc() of two, keeps them identical.

const PERCENT = 100;
const PLACES = 2;

/** a share of a track, 0 to 1, clamped, as a CSS percentage */
export function percent(share: number): string {
  return `${(Math.min(1, Math.max(0, share)) * PERCENT).toFixed(PLACES)}%`;
}

/** where a value sits on a [min, max] track */
export function along(value: number, min: number, max: number): string {
  return percent((value - min) / (max - min));
}

/** the left edge and width of the span [from, to] on a [min, max] track */
export function span(from: number, to: number, min: number, max: number): { left: string; width: string } {
  const start = Math.min(1, Math.max(0, (from - min) / (max - min)));
  const end = Math.min(1, Math.max(0, (to - min) / (max - min)));
  return { left: percent(start), width: percent(Math.max(0, end - start)) };
}
