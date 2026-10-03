import { z } from 'zod';
import { caseSchema, DEFAULT_CASE, DEFAULT_POLICY, fieldLabels, POLICY_VERSION, policySchema, RESOURCES, routeLabels, VERSION,
  type CaseFeatures, type Contribution, type Route, type TraceEntry } from './model';
export { DEFAULT_CASE, DEFAULT_POLICY } from './model';

export function evaluate(input: unknown = DEFAULT_CASE, controls: unknown = DEFAULT_POLICY) {
  const features = caseSchema.parse(input);
  const policy = policySchema.parse(controls);
  const trace: TraceEntry[] = [];
  const record = (stage: TraceEntry['stage'], rule: string, status: TraceEntry['status'], evidence: string, effect: string) =>
    trace.push({ index: trace.length + 1, stage, rule, status, evidence, effect });
  record('validate', 'SCHEMA', 'pass', 'Only categorical features; no free-text identity or message fields.', 'Validated input and policy snapshot.');
  const activeSafety = features.safety !== 'none';
  const critical = features.backstop || (activeSafety && features.careRelated);
  const general = activeSafety && !features.careRelated;
  let priority: 'P0' | 'P1' | 'P2' | 'P3' = 'P2';
  let gate: 'care-safety' | 'general-safety' | 'operational' = 'operational';
  let operationalScore: number | null = null;
  const contributions: Contribution[] = [
    { label: 'Today + required action', active: features.deadline === 'today' && features.actionRequired, value: policy.todayWeight },
    { label: 'Complaint + time element', active: features.request === 'complaint' && features.deadline !== 'none', value: policy.complaintWeight },
    { label: 'Notice + no required action', active: features.request === 'notice' && !features.actionRequired, value: policy.noticeWeight },
    { label: 'Promotion', active: features.request === 'promotion', value: policy.promotionWeight },
    { label: 'Urgent wording', active: features.shout, value: 0 },
  ];
  if (critical) {
    gate = 'care-safety'; priority = 'P0';
    record('safety', 'SAFE-01', 'applied', `Backstop=${features.backstop}; advisory safety=${features.safety}; care-related=${features.careRelated}.`, 'P0 review gate; operational score bypassed.');
    record('score', 'OPS-01', 'skipped', 'Categorical gate has precedence over additive scoring.', 'No operational sum is computed.');
  } else if (general) {
    gate = 'general-safety'; priority = 'P1';
    record('safety', 'SAFE-02', 'applied', `Advisory safety=${features.safety}; care-related=false.`, 'P1 specialist review; no external escalation.');
    record('score', 'OPS-01', 'skipped', 'Active non-care safety flag.', 'No operational sum is computed.');
  } else {
    record('safety', 'SAFE-01/02', 'pass', 'No active categorical safety gate.', 'Continue to operational scoring.');
    operationalScore = contributions.filter(c => c.active).reduce((n, c) => n + c.value, 0);
    priority = operationalScore >= policy.fastThreshold ? 'P1' : operationalScore <= policy.lowThreshold ? 'P3' : 'P2';
    record('score', 'OPS-01', 'applied', contributions.filter(c => c.active).map(c => `${c.label}: ${c.value >= 0 ? '+' : ''}${c.value}`).join('; ') || 'No contributions fired.',
      `Score ${operationalScore}; P1 >= ${policy.fastThreshold}, P3 <= ${policy.lowThreshold}; result ${priority}.`);
  }

  const referralLike = features.request === 'referral' || features.request === 'existing';
  const missing = referralLike ? Object.entries(features.fields).filter(([, present]) => !present).map(([field]) => field as keyof CaseFeatures['fields']) : [];
  let classification: string = features.request;
  if (critical) classification = 'safety-review';
  else if (features.request === 'promotion') classification = 'promotion';
  else if (referralLike && missing.length) classification = 'incomplete-intake';
  else if (referralLike && features.knownRecord === 'matched') classification = 'existing';
  record('classify', 'STRUCT-01', 'applied', `Proposal=${features.request}; known-record=${features.knownRecord}; missing=${missing.join(', ') || 'none'}.`, `Final classification=${classification}.`);

  const conflict = features.documentStatus !== 'unknown' && features.recordStatus !== 'unknown' && features.documentStatus !== features.recordStatus;
  let route: Route;
  if (gate !== 'operational' || features.request === 'question') route = 'specialist-review';
  else if (features.request === 'promotion' || (features.request === 'notice' && !features.actionRequired)) route = 'archive-review';
  else if (features.request === 'change') route = 'operations-review';
  else if (classification === 'incomplete-intake') route = 'information-followup';
  else if (referralLike && (features.knownRecord === 'ambiguous' || (features.request === 'existing' && features.knownRecord === 'none'))) route = 'identity-review';
  else if (features.request === 'billing' || (referralLike && (features.recordStatus !== 'eligible' || features.documentStatus !== 'eligible' || conflict))) route = 'account-review';
  else if (classification === 'existing') route = 'existing-review';
  else if (features.request === 'referral') route = 'intake-review';
  else route = 'general-review';

  const canPreview = ['intake-review', 'existing-review'].includes(route) && features.recordStatus === 'eligible' && features.documentStatus === 'eligible' && !conflict && missing.length === 0;
  const resources = canPreview ? RESOURCES.filter(r => r.program === features.program && r.language === features.language && r.openings > 0) : [];
  record('route', 'ROUTE-01', 'applied', `Gate=${gate}; classification=${classification}; record-status=${features.recordStatus}; document-status=${features.documentStatus}; conflict=${conflict}.`, `${routeLabels[route]} proposed; every route requires human review.`);
  record('route', 'PREVIEW-01', canPreview ? 'pass' : 'blocked', `Program=${features.program}; language=${features.language}; eligible=${canPreview}.`,
    canPreview ? `${resources.length} synthetic queue preview(s). No capacity reserved.` : 'Resource preview withheld; no reservation or scheduling action.');

  const draft = route === 'archive-review' ? null : {
    status: 'unsent' as const, language: 'primary' as const, requestedLanguage: features.language,
    translationRequired: features.language === 'alternate', template: route,
    text: draftFor(route, missing),
  };
  record('draft', 'DRAFT-01', draft ? 'applied' : 'skipped', `Route=${route}; template-only; human approval required.`,
    draft ? 'Local unsent text artifact created. No recipient, network send, or live model.' : 'No outbound draft proposed for archive review.');
  const plan: { id: string; label: string; mode: 'proposal' | 'local-computation'; evidence: string[] }[] = [
    { id: 'PLAN-1', label: routeLabels[route], mode: 'proposal', evidence: [critical ? 'SAFE-01' : general ? 'SAFE-02' : 'SAFE-01/02', 'STRUCT-01', 'ROUTE-01'] },
    { id: 'PLAN-2', label: canPreview ? 'Filter synthetic resource catalog' : 'Keep resource actions blocked', mode: 'local-computation', evidence: ['PREVIEW-01'] },
    ...(draft ? [{ id: 'PLAN-3', label: 'Review unsent draft', mode: 'proposal' as const, evidence: ['DRAFT-01'] }] : []),
  ];
  return { version: VERSION, policyVersion: POLICY_VERSION, features, policy, priority, gate, operationalScore,
    contributions, classification, missing, conflict, route, resources, draft, plan, trace,
    humanReview: true as const, externalEffects: [] as never[] };
}
export type Evaluation = ReturnType<typeof evaluate>;

function draftFor(route: Route, missing: (keyof CaseFeatures['fields'])[]): string {
  const neutral = 'Thank you for your inquiry. This draft proposes staff review of the request; no appointment, account status, or service outcome is confirmed.';
  if (route === 'information-followup') return `Thank you for your inquiry. Before staff review, the intake record needs these references: ${missing.map(m => fieldLabels[m].toLowerCase()).join(', ')}. This is an unsent draft.`;
  if (route === 'account-review') return 'Thank you for your inquiry. Account information needs staff reconciliation before any resource decision. No coverage verification or appointment confirmation has occurred.';
  if (route === 'identity-review') return 'Thank you for your inquiry. The record association is unresolved and needs staff reconciliation. No existing record is assumed and no resource is reserved.';
  return neutral;
}

export function exportRun(result: Evaluation) {
  return { version: VERSION, policyVersion: POLICY_VERSION, data: 'synthetic' as const, seed: null,
    features: result.features, policy: result.policy, result };
}
const receiptSchema = z.object({ version: z.literal(VERSION), policyVersion: z.literal(POLICY_VERSION),
  data: z.literal('synthetic'), seed: z.null(), features: caseSchema, policy: policySchema, result: z.unknown() }).strict();

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}
export function replayRun(input: unknown): Evaluation {
  const receipt = receiptSchema.parse(input);
  const result = evaluate(receipt.features, receipt.policy);
  if (canonical(result) !== canonical(receipt.result)) throw new Error('Replay mismatch: the result does not match the categorical features and policy.');
  return result;
}
