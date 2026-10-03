import { signalsSchema, type Classification, type Signals, type Urgency } from './signals';

// Intakegate's twelve synthetic inbox messages, as signal bundles. Each is
// what the source's keyless fallback perception (src/triage/perceive.ts, no
// model call) produced for that message at the linked commit, beside what
// the source's own scorer then decided; the message text stays in the source
// repo. The five referrals score alike because what separates them, coverage
// and language, is read later, by orchestration.

const EMPTY: Signals = {
  regex: {
    safeguarding_hit: false,
    same_day_hit: false,
    urgent_words: false,
    spam_hit: false,
    has_member_id: false,
    has_dob: false,
    has_payer: false,
    fyi_only: false,
  },
  llm: { classification: 'other', safety_severity: 'none', safety_is_caregiving: false, time_sensitivity: 'none', requires_action: true },
  intake: { child_name: false, dob_or_age: false, parent_contact: false, payer: false, member_id: false, known_patient: false },
};

const bundle = (regex: Partial<Signals['regex']>, llm: Partial<Signals['llm']>, intake: Partial<Signals['intake']>): Signals =>
  signalsSchema.parse({ regex: { ...EMPTY.regex, ...regex }, llm: { ...EMPTY.llm, ...llm }, intake: { ...EMPTY.intake, ...intake } });

const COMPLETE_REFERRAL = bundle(
  { has_member_id: true, has_dob: true, has_payer: true },
  { classification: 'new_referral' },
  { child_name: true, dob_or_age: true, parent_contact: true, payer: true, member_id: true },
);

export interface FixtureMessage {
  id: string;
  subject: string;
  /** what the message is, in a phrase */
  note: string;
  signals: Signals;
  /** what Intakegate's own scorer decided for it */
  source: { urgency: Urgency; classification: Classification };
}

const referral = (id: string, note: string, subject = 'Referral'): FixtureMessage => ({
  id,
  subject,
  note,
  signals: COMPLETE_REFERRAL,
  source: { urgency: 'P2', classification: 'new_referral' },
});

export const FIXTURES: FixtureMessage[] = [
  {
    id: 'safety',
    subject: 'Review requested',
    note: 'a caregiving safety concern',
    signals: bundle({ safeguarding_hit: true }, { classification: 'safeguarding', safety_severity: 'clear', safety_is_caregiving: true }, { child_name: true }),
    source: { urgency: 'P0', classification: 'safeguarding' },
  },
  {
    id: 'schedule',
    subject: 'Change appointment today',
    note: 'a same-day reschedule',
    // the sender is one of the source's two known fixture patients
    signals: bundle(
      { same_day_hit: true, has_dob: true },
      { classification: 'scheduling', time_sensitivity: 'same_day' },
      { child_name: true, dob_or_age: true, known_patient: true },
    ),
    source: { urgency: 'P1', classification: 'scheduling' },
  },
  referral('clear', 'a complete referral, in network'),
  referral('away', 'a complete referral, out of network'),
  referral('stale', 'a complete referral, expired coverage'),
  referral('unknown', 'a complete referral, coverage not on file'),
  {
    id: 'missing',
    subject: 'Incomplete referral',
    note: 'a referral missing its references',
    signals: bundle({}, { classification: 'missing_paperwork' }, {}),
    source: { urgency: 'P2', classification: 'missing_paperwork' },
  },
  referral('spanish', 'a complete referral in Spanish', 'Hola, evaluacion'),
  {
    id: 'clinical',
    subject: 'Question',
    note: 'a clinical question',
    signals: bundle({}, { classification: 'clinical_question' }, { child_name: true }),
    source: { urgency: 'P2', classification: 'clinical_question' },
  },
  {
    id: 'spam',
    subject: 'Limited time offer',
    note: 'marketing',
    signals: bundle({ spam_hit: true }, { classification: 'spam' }, {}),
    source: { urgency: 'P3', classification: 'spam' },
  },
  {
    id: 'fyi',
    subject: 'FYI',
    note: 'information only',
    signals: bundle({ fyi_only: true }, { requires_action: false }, {}),
    source: { urgency: 'P2', classification: 'other' },
  },
  {
    id: 'shout',
    subject: 'URGENT!!!',
    note: 'shouting, nothing asked',
    signals: bundle({ urgent_words: true }, {}, {}),
    source: { urgency: 'P2', classification: 'other' },
  },
];
