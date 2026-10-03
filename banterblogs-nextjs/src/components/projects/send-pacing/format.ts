import type { ViolationCode } from '@/lib/projects/send-pacing/scheduler';

const US = 1_000_000;
const two = (n: number) => String(n).padStart(2, '0');

/** a UTC clock time, 09:01:54, from epoch microseconds */
export function clock(us: number): string {
  const d = new Date(Math.floor(us / 1000));
  return `${two(d.getUTCHours())}:${two(d.getUTCMinutes())}:${two(d.getUTCSeconds())}`;
}

/** a UTC clock time to the hundredth of a second, truncated, 09:01:54.55 */
export function clockPrecise(us: number): string {
  const hundredths = Math.floor((us % US) / (US / 100));
  return `${clock(us)}.${two(hundredths)}`;
}

const UNDER_TEN = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
/** a count in prose: spelled out under ten, digits from ten */
export const spell = (n: number) => UNDER_TEN[n] ?? String(n);
/** the same, opening a sentence */
export const Spell = (n: number) => spell(n).replace(/^./, (c) => c.toUpperCase());

export const signedSeconds = (s: number) => `${s > 0 ? '+' : s < 0 ? '−' : ''}${Math.abs(s).toFixed(1)} s`;

export const VIOLATION_LABELS: Record<ViolationCode, string> = {
  before_preparation: 'sent before it could be typed',
  burst_window: 'over the burst limit',
  outside_business_hours: 'outside business hours',
  outside_campaign: 'outside the campaign',
  out_of_order: 'out of order',
};
