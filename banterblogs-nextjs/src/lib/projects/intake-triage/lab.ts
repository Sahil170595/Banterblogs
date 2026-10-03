import { PRIORITY_SIGNALS, valueOf, withValue, type PrioritySignal } from './influence';
import { scoreSignals } from './score';
import type { Classification, Signals, Urgency } from './signals';

// The lab's controls beyond the priority signals: the references that only
// the classification reads, and what changing any one control would do.

const BOOL = [false, true] as const;
const reference = (id: string, label: string, from: PrioritySignal['from'], group: keyof Signals): PrioritySignal => ({
  id,
  label,
  from,
  group,
  key: id,
  values: BOOL,
});

export const REFERENCE_SIGNALS: PrioritySignal[] = [
  reference('child_name', 'Child named', 'perception', 'intake'),
  reference('dob_or_age', 'Date of birth or age', 'perception', 'intake'),
  reference('has_dob', 'Date of birth found by the lexicon', 'lexicon', 'regex'),
  reference('parent_contact', 'Parent contact', 'perception', 'intake'),
  reference('payer', 'Payer', 'perception', 'intake'),
  reference('has_payer', 'Payer found by the lexicon', 'lexicon', 'regex'),
  reference('member_id', 'Member ID', 'perception', 'intake'),
  reference('has_member_id', 'Member ID found by the lexicon', 'lexicon', 'regex'),
  reference('known_patient', 'Matches a known patient', 'perception', 'intake'),
];

export const ALL_SIGNALS = [...PRIORITY_SIGNALS, ...REFERENCE_SIGNALS];

export interface Alternative {
  value: PrioritySignal['values'][number];
  urgency: Urgency;
  classification: Classification;
  /** what changing to this value would change, if anything */
  changes: 'urgency' | 'classification' | null;
}

/** each value the control can take, scored with everything else held */
export function alternatives(signals: Signals, signal: PrioritySignal): Alternative[] {
  const now = scoreSignals(signals);
  const current = valueOf(signals, signal);
  return signal.values.map((value) => {
    const next = value === current ? now : scoreSignals(withValue(signals, signal, value));
    const changes = next.urgency !== now.urgency ? 'urgency' : next.classification !== now.classification ? 'classification' : null;
    return { value, urgency: next.urgency, classification: next.classification, changes };
  });
}
