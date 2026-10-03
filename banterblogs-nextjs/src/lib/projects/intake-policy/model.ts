import { z } from 'zod';

export const VERSION = 'intake-policy.v1';
export const POLICY_VERSION = 'synthetic-intake-policy.v1';
export const requestOptions = ['referral', 'existing', 'change', 'question', 'billing', 'complaint', 'notice', 'promotion'] as const;
export const requestLabels = { referral: 'New intake', existing: 'Existing-record request', change: 'Appointment change', question: 'Specialist question', billing: 'Account question', complaint: 'Complaint', notice: 'Information only', promotion: 'Promotion' };
export const fieldLabels = { identity: 'Identity reference', date: 'Date/age reference', contact: 'Contact reference', coverage: 'Plan reference', member: 'Member reference' };
export const programLabels = { communication: 'Communication', 'daily-living': 'Daily living', movement: 'Movement' };
const status = z.enum(['eligible', 'excluded', 'expired', 'unknown']);
export const caseSchema = z.object({
  request: z.enum(requestOptions), safety: z.enum(['none', 'possible', 'clear']), careRelated: z.boolean(),
  backstop: z.boolean(), deadline: z.enum(['none', 'today', 'soon']), actionRequired: z.boolean(), shout: z.boolean(),
  knownRecord: z.enum(['none', 'matched', 'ambiguous']),
  fields: z.object({ identity: z.boolean(), date: z.boolean(), contact: z.boolean(), coverage: z.boolean(), member: z.boolean() }).strict(),
  documentStatus: status, recordStatus: status,
  language: z.enum(['primary', 'alternate']), program: z.enum(['communication', 'daily-living', 'movement']),
}).strict();
export type CaseFeatures = z.infer<typeof caseSchema>;
export const policySchema = z.object({
  todayWeight: z.number().int().min(0).max(6), complaintWeight: z.number().int().min(0).max(3),
  noticeWeight: z.number().int().min(-3).max(0), promotionWeight: z.number().int().min(-6).max(-1),
  fastThreshold: z.number().int().min(2).max(6), lowThreshold: z.number().int().min(-6).max(-1),
}).strict();
export type Policy = z.infer<typeof policySchema>;
export const DEFAULT_CASE: CaseFeatures = {
  request: 'referral', safety: 'none', careRelated: false, backstop: false,
  deadline: 'none', actionRequired: true, shout: false, knownRecord: 'none',
  fields: { identity: true, date: true, contact: true, coverage: true, member: true },
  documentStatus: 'eligible', recordStatus: 'eligible', language: 'primary', program: 'communication',
};
export const DEFAULT_POLICY: Policy = { todayWeight: 3, complaintWeight: 1, noticeWeight: -1, promotionWeight: -3, fastThreshold: 3, lowThreshold: -3 };
export const routeLabels = {
  'specialist-review': 'Specialist review', 'operations-review': 'Operations review', 'information-followup': 'Information follow-up',
  'account-review': 'Account review', 'identity-review': 'Identity reconciliation', 'intake-review': 'Intake review',
  'existing-review': 'Existing-record review', 'general-review': 'General review', 'archive-review': 'Archive review',
};
export type Route = keyof typeof routeLabels;
export type TraceEntry = { index: number; stage: 'validate' | 'safety' | 'score' | 'classify' | 'route' | 'draft'; rule: string; status: 'applied' | 'skipped' | 'pass' | 'blocked'; evidence: string; effect: string };
export type Contribution = { label: string; value: number; active: boolean };

const resourceSchema = z.object({ id: z.string(), program: z.enum(['communication', 'daily-living', 'movement']),
  language: z.enum(['primary', 'alternate']), openings: z.number().int().min(0).max(4) }).strict();
export const RESOURCES = z.array(resourceSchema).parse([
  { id: 'QUEUE-C1', program: 'communication', language: 'primary', openings: 2 },
  { id: 'QUEUE-C2', program: 'communication', language: 'alternate', openings: 1 },
  { id: 'QUEUE-D1', program: 'daily-living', language: 'primary', openings: 0 },
  { id: 'QUEUE-D2', program: 'daily-living', language: 'alternate', openings: 2 },
  { id: 'QUEUE-M1', program: 'movement', language: 'primary', openings: 1 },
]);
