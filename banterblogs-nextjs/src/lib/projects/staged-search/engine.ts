import { corpusSchema, querySchema, settingsSchema, type Field, type Filter, type Query, type SearchDocument, type Settings } from './schema';

// StrataSearch's offline pipeline (stratasearch/local.py, retriever.py and
// pipeline.py at the linked commit), ported step for step: a lexical body
// channel with filter relaxation, a title-and-tag channel on the final
// filters, reciprocal rank fusion, an identity reranker, and an exact-token
// criterion gate. Arithmetic follows the source's operation order, so scores
// match it to the last bit.

export const RRF_K = 60;
/** the plan's per-channel depth and the scorer's window, the source's defaults */
export const TOP_K = 200;
export const RERANK_TOP_K = 50;
const TITLE_WEIGHT = 3;
const TAG_WEIGHT = 2;
const SOFT_SCALE = 3;
// relaxation drops the lowest rank first; input order breaks ties
const RELAX_RANK: Partial<Record<Field, number>> = { year: 0, kind: 2, title: 2, topic: 3, tags: 3, collection: 4 };
const DEFAULT_RELAX_RANK = 2;

export class PipelineError extends Error {}

export const tokens = (text: string): string[] => text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
const unique = (items: string[]) => [...new Set(items)];
const byScoreThenId = (a: { score: number; id: string }, b: { score: number; id: string }) =>
  b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Python's round(): halves go to the even neighbour */
export function roundHalfEven(x: number): number {
  const r = Math.round(x);
  return Math.abs(x % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r;
}

export function matches(doc: SearchDocument, f: Filter): boolean {
  const value = doc[f.field];
  switch (f.op) {
    case 'Eq':
      return value === f.value;
    case 'NotEq':
      return value !== f.value;
    case 'Contains':
      return Array.isArray(value) && value.includes(f.value as string);
    case 'In':
    case 'NotIn': {
      const list = f.value as (string | number)[];
      const present = Array.isArray(value) ? value.some((item) => list.includes(item)) : list.includes(value);
      return f.op === 'In' ? present : !present;
    }
    case 'Gte':
      return (value as number) >= (f.value as number);
    case 'Lte':
      return (value as number) <= (f.value as number);
  }
}

export interface Hit {
  id: string;
  score: number;
}

type Channel = 'body' | 'metadata';

/** the offline search client: one corpus, scored per channel under filters */
function lexicalClient(corpus: SearchDocument[]) {
  const bodies = corpus.map((doc) => tokens(doc.body));
  const averageLength = bodies.reduce((sum, body) => sum + body.length, 0) / bodies.length;
  return (keyword: string, filters: Filter[], channel: Channel): Hit[] => {
    const query = unique(tokens(keyword));
    const dfs = new Map(query.map((t) => [t, bodies.filter((body) => body.includes(t)).length]));
    const hits: Hit[] = [];
    corpus.forEach((doc, i) => {
      if (!filters.every((f) => matches(doc, f))) return;
      let score: number;
      if (channel === 'metadata') {
        const title = new Set(tokens(doc.title));
        const tags = new Set(tokens(doc.tags.join(' ')));
        score = query.reduce((sum, t) => sum + TITLE_WEIGHT * Number(title.has(t)) + TAG_WEIGHT * Number(tags.has(t)), 0) / Math.max(1, query.length);
      } else {
        const body = bodies[i];
        score = query.reduce((sum, t) => {
          const count = body.filter((w) => w === t).length;
          return (
            sum +
            ((Math.log(1 + (corpus.length + 1) / (dfs.get(t)! + 1)) * count) / (count + 1) / Math.sqrt(Math.max(1, body.length) / Math.max(1, averageLength)))
          );
        }, 0);
      }
      if (score > 0) hits.push({ id: doc.id, score });
    });
    return hits.sort(byScoreThenId).slice(0, TOP_K);
  };
}

export interface Attempt {
  filters: Filter[];
  count: number;
}

export interface Candidate extends Hit {
  /** what the identity reranker passes through */
  rerankScore: number;
}

export interface Criteria {
  hardPass: boolean[];
  softScores: number[];
}

export interface RunReport {
  status: 'ready' | 'shortfall';
  attempts: Attempt[];
  dropped: Filter[];
  finalFilters: Filter[];
  channels: { primary: Hit[]; secondary: Hit[] };
  candidates: Candidate[];
  criteria: Record<string, Criteria>;
  selected: Candidate[];
  rejected: Candidate[];
}

export function runSearch(rawCorpus: SearchDocument[], rawQuery: Query, rawSettings: Settings): RunReport {
  const corpus = corpusSchema.parse(rawCorpus);
  const query = querySchema.parse(rawQuery);
  const settings = settingsSchema.parse(rawSettings);
  const search = lexicalClient(corpus);
  const keyword = query.description;

  // the primary channel, relaxing one filter at a time below the threshold
  let current = [...query.filters];
  let primary = search(keyword, current, 'body');
  const attempts: Attempt[] = [{ filters: [...current], count: primary.length }];
  const dropped: Filter[] = [];
  while (primary.length < settings.relax_threshold && current.length) {
    const rank = (f: Filter) => RELAX_RANK[f.field] ?? DEFAULT_RELAX_RANK;
    const index = current.reduce((best, f, i) => (rank(f) < rank(current[best]) ? i : best), 0);
    dropped.push(current[index]);
    current = current.filter((_, i) => i !== index);
    primary = search(keyword, current, 'body');
    attempts.push({ filters: [...current], count: primary.length });
  }

  // the secondary channel reuses the final filters, then the two fuse by rank
  let secondary: Hit[] = [];
  let fused: Hit[];
  if (settings.hybrid) {
    secondary = search(keyword || query.description.slice(0, 200), current, 'metadata');
    const scores = new Map<string, number>();
    for (const hits of [primary, secondary]) hits.forEach((hit, i) => scores.set(hit.id, (scores.get(hit.id) ?? 0) + 1 / (RRF_K + i + 1)));
    fused = [...scores].map(([id, score]) => ({ id, score })).sort(byScoreThenId).slice(0, TOP_K);
  } else {
    fused = primary;
  }
  if (fused.length < settings.minimum_candidates) {
    throw new PipelineError(`Retrieval returned ${fused.length} candidates; at least ${settings.minimum_candidates} required.`);
  }
  const candidates = fused.map((hit) => ({ ...hit, rerankScore: hit.score }));

  // the exact-token criterion gate, over the scorer's window
  const docs = new Map(corpus.map((d) => [d.id, d]));
  const hard = query.hard_criteria.map((c) => new Set(tokens(c)));
  const soft = query.soft_criteria.map((c) => new Set(tokens(c)));
  const criteria: Record<string, Criteria> = {};
  for (const candidate of candidates.slice(0, RERANK_TOP_K)) {
    const doc = docs.get(candidate.id)!;
    const observed = new Set(tokens(`${doc.title} ${doc.body} ${doc.tags.join(' ')}`));
    criteria[candidate.id] = {
      hardPass: hard.map((c) => c.size > 0 && [...c].every((t) => observed.has(t))),
      softScores: soft.map((c) => roundHalfEven((SOFT_SCALE * [...c].filter((t) => observed.has(t)).length) / Math.max(1, c.size))),
    };
  }
  const eligible: Candidate[] = [];
  const rejected: Candidate[] = [];
  for (const candidate of candidates) {
    const judged = criteria[candidate.id];
    (judged && judged.hardPass.every(Boolean) ? eligible : rejected).push(candidate);
  }
  const sum = (xs: (number | boolean)[]) => xs.reduce<number>((n, x) => n + Number(x), 0);
  eligible.sort((a, b) => {
    const [ca, cb] = [criteria[a.id], criteria[b.id]];
    return (
      sum(cb.hardPass) - sum(ca.hardPass) ||
      sum(cb.softScores) - sum(ca.softScores) ||
      b.rerankScore - a.rerankScore ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
    );
  });
  const selected = eligible.slice(0, settings.limit);
  return {
    status: selected.length >= settings.limit ? 'ready' : 'shortfall',
    attempts,
    dropped,
    finalFilters: current,
    channels: { primary, secondary },
    candidates,
    criteria,
    selected,
    rejected,
  };
}

/** the requested filters a document fails: what relaxation let through */
export function brokenFilters(doc: SearchDocument, query: Query): Filter[] {
  return query.filters.filter((f) => !matches(doc, f));
}
