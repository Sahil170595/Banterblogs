import { z } from 'zod';

export const KINDS = ['guide', 'experiment', 'reference'] as const;
export const TOPICS = ['retrieval', 'storage', 'evaluation'] as const;
export const COLLECTIONS = ['core', 'lab', 'archive'] as const;
export const MAX_IMPORT_CHARS = 512_000;
export const ALGORITHM = 'lexical-rrf-v1';
const MAX_DOCUMENTS = 100;
const TITLE_WEIGHT = 3;
const TAG_WEIGHT = 2;
const FILTER_PRIORITY = { year: 0, kind: 2, topic: 3, collection: 4 } as const;

const documentSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,39}$/),
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(4000),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
  year: z.number().int().min(2000).max(2030),
  kind: z.enum(KINDS), topic: z.enum(TOPICS), collection: z.enum(COLLECTIONS),
}).strict();
export type Document = z.infer<typeof documentSchema>;
const corpusSchema = z.array(documentSchema).min(1).max(MAX_DOCUMENTS).refine(
  (docs) => new Set(docs.map((d) => d.id)).size === docs.length,
  'Document ids must be unique',
);
const filterSchema = z.discriminatedUnion('field', [
  z.object({ field: z.literal('year'), value: z.number().int().min(2000).max(2030), protected: z.boolean() }).strict(),
  z.object({ field: z.literal('kind'), value: z.enum(KINDS), protected: z.boolean() }).strict(),
  z.object({ field: z.literal('topic'), value: z.enum(TOPICS), protected: z.boolean() }).strict(),
  z.object({ field: z.literal('collection'), value: z.enum(COLLECTIONS), protected: z.boolean() }).strict(),
]);
export type Filter = z.infer<typeof filterSchema>;
const configSchema = z.object({
  query: z.string().max(240), requiredTerms: z.string().max(120),
  filters: z.array(filterSchema).max(4).refine(
    (filters) => new Set(filters.map((f) => f.field)).size === filters.length,
    'Each field can have only one filter',
  ),
  relax: z.boolean(), preferCoverage: z.boolean(),
  mode: z.enum(['rrf', 'body', 'metadata']),
  threshold: z.number().int().min(1).max(MAX_DOCUMENTS),
  depth: z.number().int().min(1).max(MAX_DOCUMENTS),
  limit: z.number().int().min(1).max(MAX_DOCUMENTS),
  minimum: z.number().int().min(1).max(MAX_DOCUMENTS),
  rrfK: z.number().int().min(1).max(200),
}).strict().refine((c) => c.minimum <= c.limit, 'Minimum results cannot exceed display limit')
  .refine((c) => !c.requiredTerms.trim() || tokenize(c.requiredTerms).length > 0, {
    message: 'Required tokens must contain usable ASCII letter or number tokens', path: ['requiredTerms'],
  });
export type SearchConfig = z.infer<typeof configSchema>;

export const DEFAULT_CONFIG: SearchConfig = {
  query: 'search latency', requiredTerms: '', relax: true, preferCoverage: false,
  filters: [
    { field: 'year', value: 2025, protected: false },
    { field: 'kind', value: 'experiment', protected: false },
    { field: 'collection', value: 'lab', protected: false },
  ],
  mode: 'rrf', threshold: 6, depth: 12, limit: 8, minimum: 4, rrfK: 60,
};

function parse<T>(schema: z.ZodType<T>, value: unknown, label: string): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new Error(`${label}: ${result.error.issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`).join('; ')}`);
  return result.data;
}
export const validateCorpus = (value: unknown): Document[] => parse(corpusSchema, value, 'Corpus');
export const validateConfig = (value: unknown): SearchConfig => parse(configSchema, value, 'Configuration');
export const tokenize = (text: string): string[] => text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
const uniqueTokens = (text: string) => [...new Set(tokenize(text))];
export function matchesFilter(doc: Document, filter: Filter): boolean {
  return filter.field === 'year' ? doc.year >= filter.value : doc[filter.field] === filter.value;
}

export interface TermEvidence {
  token: string; tf: number; df: number; idf: number;
  title: boolean; tag: boolean; bodyContribution: number; metadataContribution: number;
}
export interface ChannelScore {
  id: string; bodyScore: number; metadataScore: number; coverage: number; terms: TermEvidence[];
}

export function scoreChannels(input: unknown, query: string): ChannelScore[] {
  const corpus = validateCorpus(input);
  parse(z.string().max(240), query, 'Query');
  const queryTokens = uniqueTokens(query);
  const bodies = corpus.map((doc) => tokenize(doc.body));
  const averageLength = bodies.reduce((sum, body) => sum + body.length, 0) / corpus.length;
  const dfs = queryTokens.map((token) => bodies.filter((body) => body.includes(token)).length);
  return corpus.map((doc, i) => {
    const title = new Set(tokenize(doc.title));
    const tags = new Set(tokenize(doc.tags.join(' ')));
    const terms = queryTokens.map((token, j): TermEvidence => {
      const tf = bodies[i].filter((t) => t === token).length;
      const idf = Math.log(1 + (corpus.length + 1) / (dfs[j] + 1));
      const lengthScale = Math.sqrt(Math.max(1, bodies[i].length) / Math.max(1, averageLength));
      return {
        token, tf, df: dfs[j], idf, title: title.has(token), tag: tags.has(token),
        bodyContribution: idf * (tf / (tf + 1)) / lengthScale,
        metadataContribution: (Number(title.has(token)) * TITLE_WEIGHT + Number(tags.has(token)) * TAG_WEIGHT) / Math.max(1, queryTokens.length),
      };
    });
    return {
      id: doc.id, terms,
      bodyScore: terms.reduce((sum, t) => sum + t.bodyContribution, 0),
      metadataScore: terms.reduce((sum, t) => sum + t.metadataContribution, 0),
      coverage: terms.filter((t) => t.tf > 0 || t.title || t.tag).length / Math.max(1, terms.length),
    };
  });
}

const compareIds = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
export function fuseRanks(bodyIds: string[], metadataIds: string[], k: number) {
  parse(z.number().int().min(1).max(200), k, 'RRF constant');
  for (const ids of [bodyIds, metadataIds]) {
    if (new Set(ids).size !== ids.length) throw new Error('Channel ids must be unique');
  }
  const scores = new Map<string, number>();
  for (const ids of [bodyIds, metadataIds]) ids.forEach((id, i) => scores.set(id, (scores.get(id) ?? 0) + 1 / (k + i + 1)));
  return [...scores].map(([id, score]) => ({ id, score })).sort((a, b) => b.score - a.score || compareIds(a.id, b.id));
}

export interface Attempt {
  activeFilters: Filter[]; dropped: Filter | null; bodyCount: number; attributeCount: number;
}
export interface RankedRow extends ChannelScore {
  bodyRank: number | null; metadataRank: number | null; rrfScore: number;
  score: number; retrievalRank: number; violations: Filter['field'][]; missingRequired: string[];
}
export interface RetrievalResult {
  tokens: string[]; attempts: Attempt[]; finalFilters: Filter[];
  bodyIds: string[]; metadataIds: string[];
  rows: RankedRow[]; rejected: RankedRow[];
  acceptedCount: number; truncated: number; thresholdMet: boolean;
  status: 'empty-query' | 'no-matches' | 'all-rejected' | 'shortfall' | 'ready';
}

export function runRetrieval(inputCorpus: unknown, inputConfig: unknown): RetrievalResult {
  const corpus = validateCorpus(inputCorpus);
  const config = validateConfig(inputConfig);
  const scores = scoreChannels(corpus, config.query);
  const scoreMap = new Map(scores.map((s) => [s.id, s]));
  const docMap = new Map(corpus.map((d) => [d.id, d]));
  const channel = (filters: Filter[], key: 'bodyScore' | 'metadataScore') => scores
    .filter((s) => s[key] > 0 && filters.every((f) => matchesFilter(docMap.get(s.id)!, f)))
    .sort((a, b) => b[key] - a[key] || compareIds(a.id, b.id))
    .slice(0, config.depth).map((s) => s.id);
  let finalFilters = [...config.filters];
  let bodyIds = channel(finalFilters, 'bodyScore');
  const attempts: Attempt[] = [];
  const record = (dropped: Filter | null) => attempts.push({
    activeFilters: [...finalFilters], dropped, bodyCount: bodyIds.length,
    attributeCount: corpus.filter((d) => finalFilters.every((f) => matchesFilter(d, f))).length,
  });
  record(null);
  // The source's first branch drives relaxation. The second reuses its final filters.
  while (config.relax && bodyIds.length < config.threshold && uniqueTokens(config.query).length > 0) {
    const next = finalFilters.filter((f) => !f.protected)
      .sort((a, b) => FILTER_PRIORITY[a.field] - FILTER_PRIORITY[b.field])[0];
    if (!next) break;
    finalFilters = finalFilters.filter((f) => f !== next);
    bodyIds = channel(finalFilters, 'bodyScore');
    record(next);
  }
  const metadataIds = channel(finalFilters, 'metadataScore');
  const fused = fuseRanks(bodyIds, metadataIds, config.rrfK);
  const rrfMap = new Map(fused.map((r) => [r.id, r.score]));
  const order = config.mode === 'rrf' ? fused.map((r) => r.id) : config.mode === 'body' ? bodyIds : metadataIds;
  const required = uniqueTokens(config.requiredTerms);
  const ranked: RankedRow[] = order.map((id, i) => {
    const score = scoreMap.get(id)!;
    const doc = docMap.get(id)!;
    const allTokens = new Set(tokenize(`${doc.title} ${doc.body} ${doc.tags.join(' ')}`));
    const bodyRank = bodyIds.indexOf(id) + 1;
    const metadataRank = metadataIds.indexOf(id) + 1;
    return {
      ...score, bodyRank: bodyRank || null, metadataRank: metadataRank || null,
      rrfScore: rrfMap.get(id)!, retrievalRank: i + 1,
      score: config.mode === 'rrf' ? rrfMap.get(id)! : config.mode === 'body' ? score.bodyScore : score.metadataScore,
      violations: config.filters.filter((f) => !matchesFilter(doc, f)).map((f) => f.field),
      missingRequired: required.filter((t) => !allTokens.has(t)),
    };
  });
  const accepted = ranked.filter((r) => !r.missingRequired.length);
  if (config.preferCoverage) accepted.sort((a, b) => b.coverage - a.coverage || b.score - a.score || compareIds(a.id, b.id));
  const rows = accepted.slice(0, config.limit);
  const tokens = uniqueTokens(config.query);
  return {
    tokens, attempts, finalFilters, bodyIds, metadataIds, rows,
    rejected: ranked.filter((r) => r.missingRequired.length > 0),
    acceptedCount: accepted.length, truncated: Math.max(0, accepted.length - rows.length),
    thresholdMet: bodyIds.length >= config.threshold,
    status: !tokens.length ? 'empty-query' : !ranked.length ? 'no-matches' : !accepted.length ? 'all-rejected' : rows.length < config.minimum ? 'shortfall' : 'ready',
  };
}

const envelopeSchema = z.object({
  version: z.literal(1), algorithm: z.literal(ALGORITHM),
  dataOrigin: z.literal('synthetic-starter-or-user-supplied'),
  corpus: corpusSchema, config: configSchema, result: z.unknown(),
}).strict();

export function exportRun(corpus: unknown, config: unknown): string {
  const validatedCorpus = validateCorpus(corpus);
  const validatedConfig = validateConfig(config);
  const text = JSON.stringify({
    version: 1, algorithm: ALGORITHM, dataOrigin: 'synthetic-starter-or-user-supplied',
    corpus: validatedCorpus, config: validatedConfig, result: runRetrieval(validatedCorpus, validatedConfig),
  }, null, 2);
  if (text.length > MAX_IMPORT_CHARS) throw new Error('Export is too large to replay; reduce corpus size, query terms, or display limit');
  return text;
}
export function parseJson(text: string): unknown {
  if (text.length > MAX_IMPORT_CHARS) throw new Error('Import is too large; maximum 512,000 characters');
  try { return JSON.parse(text); }
  catch { throw new Error('Invalid JSON; check quotes, commas and braces'); }
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => compareIds(a, b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value) ?? 'undefined';
}
export function replayRun(text: string) {
  const envelope = parse(envelopeSchema, parseJson(text), 'Replay');
  const result = runRetrieval(envelope.corpus, envelope.config);
  if (canonical(envelope.result) !== canonical(result)) throw new Error('Replay result differs from recomputed scores or trace; export an unmodified run');
  return { corpus: envelope.corpus, config: envelope.config, result };
}
