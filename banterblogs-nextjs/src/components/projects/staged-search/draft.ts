import { EXAMPLE_QUERY } from '@/lib/projects/staged-search/example';
import { OPS_FOR, querySchema, type Field, type Op, type Query } from '@/lib/projects/staged-search/schema';

// The query form's state: text as typed, read into a query only when it is
// one the source would accept.

export interface DraftFilter {
  field: Field;
  op: Op;
  value: string;
}

export interface Draft {
  description: string;
  hard: string;
  soft: string;
  filters: DraftFilter[];
}

const list = (text: string) =>
  text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

export function fromQuery(query: Query): Draft {
  return {
    description: query.description,
    hard: query.hard_criteria.join(', '),
    soft: query.soft_criteria.join(', '),
    filters: query.filters.map((f) => ({ field: f.field, op: f.op, value: Array.isArray(f.value) ? f.value.join(', ') : String(f.value) })),
  };
}

export function toQuery(draft: Draft): { query: Query; error: null } | { query: null; error: string } {
  const filters = draft.filters.map(({ field, op, value }) => {
    const parts = list(value).map((part) => (field === 'year' ? Number(part) : part));
    return { field, op, value: op === 'In' || op === 'NotIn' ? parts : parts[0] ?? '' };
  });
  const parsed = querySchema.safeParse({
    query_id: EXAMPLE_QUERY.query_id,
    description: draft.description,
    hard_criteria: list(draft.hard),
    soft_criteria: list(draft.soft),
    filters,
  });
  if (parsed.success) return { query: parsed.data, error: null };
  const issue = parsed.error.issues[0];
  return { query: null, error: `${issue.path.join(' ') || 'Query'}: ${issue.message}` };
}

/** keep the operator when the new field takes it, else take the field's first */
export const opFor = (field: Field, op: Op): Op => (OPS_FOR[field].includes(op) ? op : OPS_FOR[field][0]);
