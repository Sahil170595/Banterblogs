import { caseSchema, DEFAULT_CASE, type CaseFeatures } from './model';

export const CASES: { id: string; title: string; features: CaseFeatures }[] = [
  { id: 'ready', title: 'Complete synthetic intake', features: DEFAULT_CASE },
  { id: 'change', title: 'Today, with an action', features: { ...DEFAULT_CASE, request: 'change', deadline: 'today', knownRecord: 'matched' } },
  { id: 'flagged', title: 'Safety flag + promotion', features: { ...DEFAULT_CASE, request: 'promotion', safety: 'possible', careRelated: true, actionRequired: false } },
  { id: 'partial', title: 'Missing member reference', features: { ...DEFAULT_CASE, fields: { ...DEFAULT_CASE.fields, member: false } } },
  { id: 'conflict', title: 'Conflicting account flags', features: { ...DEFAULT_CASE, recordStatus: 'expired' } },
  { id: 'ambiguous', title: 'Ambiguous record association', features: { ...DEFAULT_CASE, knownRecord: 'ambiguous' } },
  { id: 'notice', title: 'Today, without an action', features: { ...DEFAULT_CASE, request: 'notice', deadline: 'today', actionRequired: false, shout: true } },
  { id: 'capacity', title: 'No matching queue capacity', features: { ...DEFAULT_CASE, program: 'movement', language: 'alternate' } },
].map(c => ({ ...c, features: caseSchema.parse(c.features) }));
