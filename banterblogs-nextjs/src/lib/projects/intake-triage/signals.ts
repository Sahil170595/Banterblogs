import { z } from 'zod';

// What Intakegate's scorer reads: a signal bundle from its lexical layer and
// from its perception step (a model cascade, or the keyless fallback). Field
// names follow src/triage/types.ts at the linked commit. The scorer never
// sees message text, only these signals.

export const CLASSIFICATIONS = [
  'new_referral',
  'existing_patient_request',
  'scheduling',
  'clinical_question',
  'billing_question',
  'missing_paperwork',
  'provider_followup',
  'complaint',
  'safeguarding',
  'spam',
  'other',
] as const;
export type Classification = (typeof CLASSIFICATIONS)[number];

export const SEVERITIES = ['none', 'possible', 'clear'] as const;
export const TIME_SENSITIVITIES = ['none', 'same_day', 'urgent'] as const;
export const URGENCIES = ['P0', 'P1', 'P2', 'P3'] as const;
export type Urgency = (typeof URGENCIES)[number];

const lexical = z
  .object({
    safeguarding_hit: z.boolean(),
    same_day_hit: z.boolean(),
    urgent_words: z.boolean(),
    spam_hit: z.boolean(),
    has_member_id: z.boolean(),
    has_dob: z.boolean(),
    has_payer: z.boolean(),
    fyi_only: z.boolean(),
  })
  .strict();

const perception = z
  .object({
    classification: z.enum(CLASSIFICATIONS),
    safety_severity: z.enum(SEVERITIES),
    safety_is_caregiving: z.boolean(),
    time_sensitivity: z.enum(TIME_SENSITIVITIES),
    requires_action: z.boolean(),
  })
  .strict();

// Which extracted intake fields are filled. known_patient stands in for the
// source's literal match of a name and date of birth against two fixture
// patients, which needs the text this page never has.
const intake = z
  .object({
    child_name: z.boolean(),
    dob_or_age: z.boolean(),
    parent_contact: z.boolean(),
    payer: z.boolean(),
    member_id: z.boolean(),
    known_patient: z.boolean(),
  })
  .strict();

export const signalsSchema = z.object({ regex: lexical, llm: perception, intake }).strict();
export type Signals = z.infer<typeof signalsSchema>;

/** an ordinary complete referral: nothing fires */
export const NEUTRAL_SIGNALS: Signals = {
  regex: {
    safeguarding_hit: false,
    same_day_hit: false,
    urgent_words: false,
    spam_hit: false,
    has_member_id: true,
    has_dob: true,
    has_payer: true,
    fyi_only: false,
  },
  llm: { classification: 'new_referral', safety_severity: 'none', safety_is_caregiving: false, time_sensitivity: 'none', requires_action: true },
  intake: { child_name: true, dob_or_age: true, parent_contact: true, payer: true, member_id: true, known_patient: false },
};

export const CLASSIFICATION_LABELS: Record<Classification, string> = {
  new_referral: 'New referral',
  existing_patient_request: 'Existing patient request',
  scheduling: 'Scheduling',
  clinical_question: 'Clinical question',
  billing_question: 'Billing question',
  missing_paperwork: 'Missing paperwork',
  provider_followup: 'Provider follow-up',
  complaint: 'Complaint',
  safeguarding: 'Safeguarding',
  spam: 'Spam',
  other: 'Other',
};
