import { describe, expect, it } from 'vitest';
import { FIXTURES } from './fixtures';
import { analyzeInfluence, OPERATIONAL_IDS } from './influence';
import { scoreUrgency } from './score';
import { NEUTRAL_SIGNALS, type Signals } from './signals';

// The port against Intakegate's own scorer tests (test/intakegate.test.ts at
// the linked commit), its cohort result, and the structural overrides.

const EMPTY: Signals = {
  regex: { safeguarding_hit: false, same_day_hit: false, urgent_words: false, spam_hit: false, has_member_id: false, has_dob: false, has_payer: false, fyi_only: false },
  llm: { classification: 'other', safety_severity: 'none', safety_is_caregiving: false, time_sensitivity: 'none', requires_action: true },
  intake: { child_name: false, dob_or_age: false, parent_contact: false, payer: false, member_id: false, known_patient: false },
};
const bundle = () => structuredClone(EMPTY);

describe('the ported scorer', () => {
  it('matches the source on its thresholds and zero-weight shouting', () => {
    for (const day of [false, true])
      for (const spam of [false, true])
        for (const action of [false, true]) {
          const b = bundle();
          b.regex.same_day_hit = day;
          b.regex.spam_hit = spam;
          b.llm.requires_action = action;
          const value = (day && action ? 2 : 0) - (spam ? 2 : 0);
          const expected = value >= 2 ? 'P1' : value <= -2 ? 'P3' : 'P2';
          expect(scoreUrgency(b).urgency).toBe(expected);
          b.regex.urgent_words = true;
          expect(scoreUrgency(b).urgency).toBe(expected);
        }
    const b = bundle();
    b.llm.classification = 'complaint';
    b.llm.time_sensitivity = 'urgent';
    expect(scoreUrgency(b).urgency).toBe('P2');
    b.regex.same_day_hit = true;
    expect(scoreUrgency(b).urgency).toBe('P1');
    const fyi = bundle();
    fyi.regex.fyi_only = true;
    fyi.llm.requires_action = false;
    expect(scoreUrgency(fyi).urgency).toBe('P2');
  });

  it('matches the source on categorical safety dominating negative weights', () => {
    const b = bundle();
    b.regex.spam_hit = true;
    b.regex.safeguarding_hit = true;
    expect(scoreUrgency(b)).toMatchObject({ urgency: 'P0', classification: 'safeguarding', escalation: 'P0', score: null });
    b.regex.safeguarding_hit = false;
    b.llm.safety_severity = 'possible';
    b.llm.safety_is_caregiving = true;
    expect(scoreUrgency(b).urgency).toBe('P0');
    b.llm.safety_is_caregiving = false;
    expect(scoreUrgency(b)).toMatchObject({ urgency: 'P1', escalation: null, score: null });
  });

  it("decides every fixture message as the source's scorer did: 1 P0, 1 P1, 9 P2 and 1 P3", () => {
    const counts = { P0: 0, P1: 0, P2: 0, P3: 0 };
    for (const f of FIXTURES) {
      const result = scoreUrgency(f.signals);
      expect({ urgency: result.urgency, classification: result.classification }, f.id).toEqual(f.source);
      counts[result.urgency]++;
    }
    expect(FIXTURES).toHaveLength(12);
    expect(counts).toEqual({ P0: 1, P1: 1, P2: 9, P3: 1 });
  });

  it('lets the for-information nudge alone leave a message at P2', () => {
    const fyi = structuredClone(NEUTRAL_SIGNALS);
    fyi.regex.fyi_only = true;
    fyi.llm.requires_action = false;
    expect(scoreUrgency(fyi)).toMatchObject({ urgency: 'P2', score: -1 });
  });

  it('applies the structural overrides in the source order', () => {
    const referral = structuredClone(NEUTRAL_SIGNALS);
    expect(scoreUrgency(referral).classification).toBe('new_referral');
    // a missing reference sends a referral to paperwork, unless the lexicon found it
    referral.intake.payer = false;
    referral.regex.has_payer = false;
    expect(scoreUrgency(referral).classification).toBe('missing_paperwork');
    referral.regex.has_payer = true;
    expect(scoreUrgency(referral).classification).toBe('new_referral');
    // a known patient is checked before missing references
    referral.intake.parent_contact = false;
    referral.intake.known_patient = true;
    expect(scoreUrgency(referral).classification).toBe('existing_patient_request');
    // a kept proposal is not reclassified by a known patient, and spam beats everything
    referral.llm.classification = 'scheduling';
    expect(scoreUrgency(referral).classification).toBe('scheduling');
    referral.regex.spam_hit = true;
    expect(scoreUrgency(referral).classification).toBe('spam');
  });

  it('refuses a malformed bundle', () => {
    expect(() => scoreUrgency({ ...NEUTRAL_SIGNALS, llm: { ...NEUTRAL_SIGNALS.llm, safety_severity: 'severe' } } as unknown as Signals)).toThrow();
    expect(() => scoreUrgency({ ...NEUTRAL_SIGNALS, extra: true } as unknown as Signals)).toThrow();
  });
});

describe('signal influence', () => {
  const report = analyzeInfluence();
  const by = Object.fromEntries(report.influences.map((i) => [i.signal.id, i]));

  it('scores every combination of the signals the priority reads', () => {
    expect(report.combinations).toBe(2 * 3 * 2 * 2 * 3 * 2 * 11 * 2 * 2 * 2);
  });

  it('finds that urgent wording never changes the priority', () => {
    expect(by.urgent_words.decisive).toBe(0);
    expect(by.urgent_words.example).toBeNull();
  });

  it('finds that no operational signal changes a priority a safety gate decided', () => {
    for (const id of OPERATIONAL_IDS) expect(by[id].decisiveUnderGate, id).toBe(0);
    expect(by.safeguarding_hit.decisive).toBeGreaterThan(0);
  });

  it('gives each decisive signal an example that really flips', () => {
    for (const { signal, example } of report.influences) {
      if (!example) continue;
      const after = { ...example.signals, [signal.group]: { ...example.signals[signal.group], [signal.key]: example.alternative } } as Signals;
      expect(scoreUrgency(example.signals).urgency, signal.id).toBe(example.from);
      expect(scoreUrgency(after).urgency, signal.id).toBe(example.to);
      expect(example.from).not.toBe(example.to);
    }
  });
});
