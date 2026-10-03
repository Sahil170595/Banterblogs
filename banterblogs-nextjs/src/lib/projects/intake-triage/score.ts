import { signalsSchema, type Classification, type Signals, type Urgency } from './signals';

// Intakegate's scorer (src/triage/score.ts at the linked commit), ported rule
// for rule: two categorical safety gates, then an additive operational score,
// then structural overrides on the proposed classification. Pure: the same
// signals always give the same result.

// the source's weights and thresholds, unchanged
export const SAME_DAY_WEIGHT = 2;
export const COMPLAINT_WEIGHT = 1;
export const FYI_WEIGHT = -1;
export const SPAM_WEIGHT = -2;
export const URGENT_WORDS_WEIGHT = 0;
export const P1_AT = 2;
export const P3_AT = -2;

export type Gate = 'P0_safeguarding' | 'P1_noncaregiving_safety' | 'operational';

export interface Nudge {
  id: 'same-day' | 'complaint' | 'fyi' | 'spam' | 'urgent-words';
  label: string;
  weight: number;
  fired: boolean;
}

export interface ScoreResult {
  urgency: Urgency;
  gate: Gate;
  classification: Classification;
  /** the review escalation the scorer proposes; only the P0 gate proposes one */
  escalation: 'P0' | null;
  /** the operational sum, or null when a gate decided */
  score: number | null;
  nudges: Nudge[];
  /** why, in order, as the source's rationale records it */
  reasons: string[];
  requiresHumanReview: true;
}

const ACTIVE_SAFETY = new Set(['possible', 'clear']);
const REFERRAL_LIKE = new Set<Classification>(['new_referral', 'existing_patient_request']);
const KEPT_PROPOSALS = new Set<Classification>(['scheduling', 'clinical_question', 'missing_paperwork', 'safeguarding']);

export function scoreUrgency(raw: Signals): ScoreResult {
  return scoreSignals(signalsSchema.parse(raw));
}

/** the scorer on signals already known to be well formed */
export function scoreSignals(signals: Signals): ScoreResult {
  const { regex, llm } = signals;
  const activeSafety = ACTIVE_SAFETY.has(llm.safety_severity);

  // Step 1: the caregiving-harm gate, on the lexical backstop or a caregiving safety read
  const p0Lexical = regex.safeguarding_hit;
  const p0Perceived = activeSafety && llm.safety_is_caregiving;
  if (p0Lexical || p0Perceived) {
    return {
      urgency: 'P0',
      gate: 'P0_safeguarding',
      classification: 'safeguarding',
      escalation: 'P0',
      score: null,
      nudges: nudgesFor(signals, false),
      reasons: [
        ...(p0Lexical ? ['The lexical safety backstop matched.'] : []),
        ...(p0Perceived ? [`Perception read a ${llm.safety_severity} caregiving safety concern.`] : []),
        'The caregiving-harm gate fired: P0, classified safeguarding, escalated for same-hour review. No score is summed.',
      ],
      requiresHumanReview: true,
    };
  }

  // Step 2: an active safety concern that is not about caregiving
  if (activeSafety) {
    const classification = chooseClassification(signals);
    return {
      urgency: 'P1',
      gate: 'P1_noncaregiving_safety',
      classification,
      escalation: null,
      score: null,
      nudges: nudgesFor(signals, false),
      reasons: [
        `Perception read a ${llm.safety_severity} safety concern that is not about caregiving.`,
        'The non-caregiving safety gate fired: P1 for manual review, no escalation. No score is summed.',
      ],
      requiresHumanReview: true,
    };
  }

  // Step 3: the operational score, from a P2 baseline
  const nudges = nudgesFor(signals, true);
  const score = nudges.reduce((sum, nudge) => sum + (nudge.fired ? nudge.weight : 0), 0);
  const urgency: Urgency = score >= P1_AT ? 'P1' : score <= P3_AT ? 'P3' : 'P2';
  const fired = nudges.filter((nudge) => nudge.fired);
  return {
    urgency,
    gate: 'operational',
    classification: chooseClassification(signals),
    escalation: null,
    score,
    nudges,
    reasons: [
      fired.length ? `Fired: ${fired.map((n) => `${n.label} ${signed(n.weight)}`).join(', ')}.` : 'No operational signal fired.',
      `Score ${signed(score)}: P1 at ${signed(P1_AT)} or more, P3 at ${signed(P3_AT)} or less, P2 between.`,
    ],
    requiresHumanReview: true,
  };
}

function nudgesFor({ regex, llm }: Signals, live: boolean): Nudge[] {
  const sameDay = llm.time_sensitivity === 'same_day' || regex.same_day_hit;
  // a time element is same-day wording or an urgent read
  const timeElement = sameDay || llm.time_sensitivity === 'urgent';
  return [
    { id: 'same-day', label: 'Same day, with a required action', weight: SAME_DAY_WEIGHT, fired: live && sameDay && llm.requires_action },
    { id: 'complaint', label: 'Complaint with a time element', weight: COMPLAINT_WEIGHT, fired: live && llm.classification === 'complaint' && timeElement },
    { id: 'fyi', label: 'For information, no action', weight: FYI_WEIGHT, fired: live && regex.fyi_only && !llm.requires_action },
    { id: 'spam', label: 'Spam', weight: SPAM_WEIGHT, fired: live && (regex.spam_hit || llm.classification === 'spam') },
    { id: 'urgent-words', label: 'Urgent wording', weight: URGENT_WORDS_WEIGHT, fired: live && regex.urgent_words },
  ];
}

// Step 4: the proposal as a prior, overridden by structure, in the source's order
function chooseClassification({ regex, llm, intake }: Signals): Classification {
  const proposed = llm.classification;
  if (regex.spam_hit || proposed === 'spam') return 'spam';
  if (KEPT_PROPOSALS.has(proposed)) return proposed;
  if (proposed === 'existing_patient_request') return proposed;
  if (intake.known_patient) return 'existing_patient_request';
  if (REFERRAL_LIKE.has(proposed)) {
    const missing =
      !intake.child_name ||
      (!regex.has_dob && !intake.dob_or_age) ||
      !intake.parent_contact ||
      (!regex.has_payer && !intake.payer) ||
      (!regex.has_member_id && !intake.member_id);
    if (missing) return 'missing_paperwork';
  }
  return proposed;
}

export const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
