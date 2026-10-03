import { z } from 'zod';

// StrataSearch's public input boundary (stratasearch/data.py at the linked
// commit): documents, filters and queries, with the same bounds and the same
// field/operator rules.

export const MAX_DOCUMENTS = 1000;
const ID = /^[a-z][a-z0-9-]{0,63}$/;
const YEAR = z.number().int().min(2000).max(2100);
const text = (maximum: number) => z.string().trim().min(1).max(maximum);

export const documentSchema = z
  .object({
    id: z.string().regex(ID),
    title: text(160),
    body: text(4000),
    tags: z.array(text(40)).max(20),
    kind: text(40),
    topic: text(40),
    collection: text(40),
    year: YEAR,
  })
  .strict();
export type SearchDocument = z.infer<typeof documentSchema>;

export const corpusSchema = z
  .array(documentSchema)
  .min(1)
  .max(MAX_DOCUMENTS)
  .refine((docs) => new Set(docs.map((d) => d.id)).size === docs.length, 'Document ids must be unique');

export const FIELDS = ['year', 'kind', 'title', 'topic', 'tags', 'collection', 'body'] as const;
export type Field = (typeof FIELDS)[number];
export const OPS = ['Eq', 'NotEq', 'Contains', 'In', 'NotIn', 'Gte', 'Lte'] as const;
export type Op = (typeof OPS)[number];

/** the operators the source accepts for each field */
export const OPS_FOR: Record<Field, readonly Op[]> = {
  year: ['Eq', 'NotEq', 'In', 'NotIn', 'Gte', 'Lte'],
  tags: ['Contains', 'In', 'NotIn'],
  kind: ['Eq', 'NotEq', 'In', 'NotIn'],
  title: ['Eq', 'NotEq', 'In', 'NotIn'],
  topic: ['Eq', 'NotEq', 'In', 'NotIn'],
  collection: ['Eq', 'NotEq', 'In', 'NotIn'],
  body: ['Eq', 'NotEq', 'In', 'NotIn'],
};

const filterValue = z.union([YEAR, text(160)]);
export const filterSchema = z
  .object({ field: z.enum(FIELDS), op: z.enum(OPS), value: z.union([filterValue, z.array(filterValue).min(1).max(20)]) })
  .strict()
  .superRefine((f, ctx) => {
    if (!OPS_FOR[f.field].includes(f.op)) ctx.addIssue({ code: 'custom', message: `${f.field} does not take ${f.op}` });
    const list = f.op === 'In' || f.op === 'NotIn';
    if (list !== Array.isArray(f.value)) ctx.addIssue({ code: 'custom', message: list ? `${f.op} takes a list` : `${f.op} takes one value` });
    const parts = Array.isArray(f.value) ? f.value : [f.value];
    if (parts.some((p) => (f.field === 'year' ? typeof p !== 'number' : typeof p !== 'string')))
      ctx.addIssue({ code: 'custom', message: f.field === 'year' ? 'A year filter takes years' : `A ${f.field} filter takes text` });
  });
export type Filter = z.infer<typeof filterSchema>;

export const querySchema = z
  .object({
    query_id: z.string().regex(ID),
    description: text(2000),
    hard_criteria: z.array(text(240)).max(20),
    soft_criteria: z.array(text(240)).max(20),
    filters: z.array(filterSchema).max(20),
  })
  .strict();
export type Query = z.infer<typeof querySchema>;

export const settingsSchema = z
  .object({
    hybrid: z.boolean(),
    relax_threshold: z.number().int().min(1).max(MAX_DOCUMENTS),
    minimum_candidates: z.number().int().min(1).max(MAX_DOCUMENTS),
    limit: z.number().int().min(1).max(100),
  })
  .strict();
export type Settings = z.infer<typeof settingsSchema>;

/** the CLI's defaults: both channels, relax below 6, at least 1 candidate, 4 results */
export const DEFAULT_SETTINGS: Settings = { hybrid: true, relax_threshold: 6, minimum_candidates: 1, limit: 4 };
