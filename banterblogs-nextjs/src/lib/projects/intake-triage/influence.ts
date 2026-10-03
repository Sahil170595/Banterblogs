import { scoreSignals } from './score';
import { CLASSIFICATIONS, NEUTRAL_SIGNALS, SEVERITIES, TIME_SENSITIVITIES, type Signals, type Urgency } from './signals';

// Which signals can move the priority: every combination of the signals the
// priority reads is scored, and for each signal we count the combinations in
// which changing that signal alone, to any other value, changes the priority.
// Everything else is held at an ordinary complete referral.

type Value = boolean | string;

export interface PrioritySignal {
  id: string;
  label: string;
  /** who supplies it: the lexical layer, or perception (a model or the keyless fallback) */
  from: 'lexicon' | 'perception';
  group: keyof Signals;
  key: string;
  values: readonly Value[];
}

const BOOL = [false, true] as const;

export const PRIORITY_SIGNALS: PrioritySignal[] = [
  { id: 'safeguarding_hit', label: 'Safety lexicon match', from: 'lexicon', group: 'regex', key: 'safeguarding_hit', values: BOOL },
  { id: 'safety_severity', label: 'Safety concern', from: 'perception', group: 'llm', key: 'safety_severity', values: SEVERITIES },
  { id: 'safety_is_caregiving', label: 'Concern is about caregiving', from: 'perception', group: 'llm', key: 'safety_is_caregiving', values: BOOL },
  { id: 'same_day_hit', label: 'Same-day wording', from: 'lexicon', group: 'regex', key: 'same_day_hit', values: BOOL },
  { id: 'time_sensitivity', label: 'Time sensitivity', from: 'perception', group: 'llm', key: 'time_sensitivity', values: TIME_SENSITIVITIES },
  { id: 'requires_action', label: 'Action required', from: 'perception', group: 'llm', key: 'requires_action', values: BOOL },
  { id: 'classification', label: 'Proposed classification', from: 'perception', group: 'llm', key: 'classification', values: CLASSIFICATIONS },
  { id: 'spam_hit', label: 'Spam wording', from: 'lexicon', group: 'regex', key: 'spam_hit', values: BOOL },
  { id: 'fyi_only', label: 'For-information wording', from: 'lexicon', group: 'regex', key: 'fyi_only', values: BOOL },
  { id: 'urgent_words', label: 'Urgent wording', from: 'lexicon', group: 'regex', key: 'urgent_words', values: BOOL },
];

/** the signals the operational score reads, and nothing else does */
export const OPERATIONAL_IDS = ['same_day_hit', 'time_sensitivity', 'requires_action', 'classification', 'spam_hit', 'fyi_only', 'urgent_words'];

export const valueOf = (signals: Signals, s: PrioritySignal): Value => (signals[s.group] as Record<string, Value>)[s.key];
export const withValue = (signals: Signals, s: PrioritySignal, value: Value): Signals =>
  ({ ...signals, [s.group]: { ...signals[s.group], [s.key]: value } }) as Signals;

export interface Example {
  signals: Signals;
  from: Urgency;
  to: Urgency;
  value: Value;
  alternative: Value;
}

export interface Influence {
  signal: PrioritySignal;
  /** combinations in which changing this signal alone changes the priority */
  decisive: number;
  /** of those, combinations in which a safety gate had already decided */
  decisiveUnderGate: number;
  /** the decisive combination nearest an ordinary referral, before and after */
  example: Example | null;
}

export interface InfluenceReport {
  combinations: number;
  gated: number;
  influences: Influence[];
}

export function analyzeInfluence(): InfluenceReport {
  const radix = PRIORITY_SIGNALS.map((s) => s.values.length);
  const combinations = radix.reduce((a, b) => a * b, 1);
  const stride = radix.map((_, i) => radix.slice(i + 1).reduce((a, b) => a * b, 1));
  const digit = (index: number, i: number) => Math.floor(index / stride[i]) % radix[i];
  const build = (index: number) => PRIORITY_SIGNALS.reduce((signals, s, i) => withValue(signals, s, s.values[digit(index, i)]), NEUTRAL_SIGNALS);
  // how far a combination is from an ordinary referral, in signals changed
  const neutralDigits = PRIORITY_SIGNALS.map((s) => s.values.indexOf(valueOf(NEUTRAL_SIGNALS, s)));
  const distance = (index: number) => neutralDigits.reduce((n, d, i) => n + (digit(index, i) === d ? 0 : 1), 0);

  const urgency: Urgency[] = [];
  const gated: boolean[] = [];
  for (let index = 0; index < combinations; index++) {
    const result = scoreSignals(build(index));
    urgency.push(result.urgency);
    gated.push(result.gate !== 'operational');
  }

  const influences = PRIORITY_SIGNALS.map((signal, i) => {
    let decisive = 0;
    let decisiveUnderGate = 0;
    let best: { index: number; alt: number; d: number } | null = null;
    for (let index = 0; index < combinations; index++) {
      const own = digit(index, i);
      const alt = signal.values.findIndex((_, v) => v !== own && urgency[index + (v - own) * stride[i]] !== urgency[index]);
      if (alt < 0) continue;
      decisive++;
      if (gated[index]) decisiveUnderGate++;
      const d = distance(index);
      if (!best || d < best.d) best = { index, alt, d };
    }
    const example: Example | null = best && {
      signals: build(best.index),
      from: urgency[best.index],
      to: urgency[best.index + (best.alt - digit(best.index, i)) * stride[i]],
      value: signal.values[digit(best.index, i)],
      alternative: signal.values[best.alt],
    };
    return { signal, decisive, decisiveUnderGate, example };
  });

  return { combinations, gated: gated.filter(Boolean).length, influences };
}
