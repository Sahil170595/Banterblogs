import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONFIG, exportRun, fuseRanks, replayRun, runRetrieval,
  scoreChannels, tokenize, validateConfig, validateCorpus,
  type Document, type SearchConfig,
} from './engine';

const corpus: Document[] = [
  { id: 'a', title: 'Search latency', body: 'search search latency', tags: ['search'], year: 2022, kind: 'guide', topic: 'retrieval', collection: 'core' },
  { id: 'b', title: 'Index tuning', body: 'search latency cache', tags: ['latency'], year: 2025, kind: 'experiment', topic: 'retrieval', collection: 'lab' },
  { id: 'c', title: 'Search notes', body: 'storage replication', tags: ['search'], year: 2026, kind: 'reference', topic: 'storage', collection: 'lab' },
  { id: 'd', title: 'Cold cache', body: 'latency latency', tags: ['cache'], year: 2024, kind: 'guide', topic: 'storage', collection: 'archive' },
];
const config = (overrides: Partial<SearchConfig> = {}): SearchConfig => ({
  ...DEFAULT_CONFIG, query: 'search latency', filters: [], threshold: 3,
  depth: 10, limit: 10, minimum: 3, ...overrides,
});

describe('actual lexical channels', () => {
  it('uses lowercase whole ASCII tokens, without synonyms or stemming', () => {
    expect(tokenize('SEARCH, search! Latencies/cache')).toEqual(['search', 'search', 'latencies', 'cache']);
  });
  it('computes damped TF-IDF from corpus statistics', () => {
    const scores = scoreChannels(corpus, 'search');
    const term = scores.find((s) => s.id === 'a')!.terms[0];
    expect(term.df).toBe(2);
    expect(term.tf).toBe(2);
    expect(term.idf).toBeCloseTo(Math.log(1 + 5 / 3));
    expect(term.bodyContribution).toBeCloseTo(term.idf * (2 / 3) / Math.sqrt(3 / 2.5));
  });
  it('counts title/tag presence once per query term, not repetitions', () => {
    const score = scoreChannels(corpus, 'search search').find((s) => s.id === 'a')!;
    expect(score.metadataScore).toBe(5);
    expect(score.terms).toHaveLength(1);
  });
  it('does not manufacture positive matches for unknown terms', () => {
    expect(runRetrieval(corpus, config({ query: 'quasar' })).rows).toEqual([]);
    expect(runRetrieval(corpus, config({ query: 'quasar' })).status).toBe('no-matches');
  });
  it('reports tokenless queries separately from no matches', () => {
    expect(runRetrieval(corpus, config({ query: '!!!' })).status).toBe('empty-query');
  });
  it('supports a metadata-only hit with no body rank', () => {
    const row = runRetrieval(corpus, config()).rows.find((r) => r.id === 'c')!;
    expect(row.bodyRank).toBeNull();
    expect(row.metadataRank).toBeGreaterThan(0);
    expect(row.rrfScore).toBeCloseTo(1 / (60 + row.metadataRank!));
  });
});

describe('source-informed RRF', () => {
  it('uses one-based ranks, not raw scores', () => {
    const fused = fuseRanks(['b', 'a'], ['a', 'c'], 60);
    expect(fused[0].id).toBe('a');
    expect(fused[0].score).toBeCloseTo(1 / 62 + 1 / 61);
  });
  it('breaks equal fused scores by ascending id', () => {
    expect(fuseRanks(['b'], ['a'], 60).map((r) => r.id)).toEqual(['a', 'b']);
  });
  it('rejects duplicate channel ids and invalid constants', () => {
    expect(() => fuseRanks(['a', 'a'], [], 60)).toThrow();
    expect(() => fuseRanks([], [], 0)).toThrow();
    expect(() => fuseRanks([], [], Infinity)).toThrow();
  });
});

describe('relaxation and failure provenance', () => {
  const filters: SearchConfig['filters'] = [
    { field: 'collection', value: 'lab', protected: false },
    { field: 'kind', value: 'experiment', protected: false },
    { field: 'year', value: 2025, protected: false },
  ];
  it('drops year, then kind, then collection; preserves every attempt', () => {
    const run = runRetrieval(corpus, config({ filters }));
    expect(run.attempts.map((a) => a.dropped?.field ?? null)).toEqual([null, 'year', 'kind', 'collection']);
    expect(run.attempts.map((a) => a.bodyCount)).toEqual([1, 1, 1, 3]);
    expect(run.finalFilters).toEqual([]);
    expect(run.rows.find((r) => r.id === 'a')!.violations).toEqual(['collection', 'kind', 'year']);
  });
  it('uses identical final filters for both channels', () => {
    const run = runRetrieval(corpus, config({ filters, threshold: 1 }));
    expect(run.bodyIds).toEqual(['b']);
    expect(run.metadataIds).toEqual(['b']);
  });
  it('keeps protected filters and reports exhaustion rather than padding', () => {
    const run = runRetrieval(corpus, config({ filters: filters.map((f) => ({ ...f, protected: true })) }));
    expect(run.finalFilters).toEqual(filters.map((f) => ({ ...f, protected: true })));
    expect(run.attempts).toHaveLength(1);
    expect(run.thresholdMet).toBe(false);
    expect(run.status).toBe('shortfall');
    expect(run.rows).toHaveLength(1);
  });
  it('strict mode never drops filters', () => {
    expect(runRetrieval(corpus, config({ filters, relax: false })).attempts).toHaveLength(1);
  });
  it('threshold uses body channel after depth cutoff, not metadata union size', () => {
    const run = runRetrieval(corpus, config({ depth: 1, threshold: 3, filters }));
    expect(run.thresholdMet).toBe(false);
    expect(run.attempts).toHaveLength(4);
    expect(run.bodyIds).toHaveLength(1);
  });
  it('applies an exact-token gate after retrieval and exposes all rejections', () => {
    const run = runRetrieval(corpus, config({ requiredTerms: 'cache' }));
    expect(run.rows.map((r) => r.id).sort()).toEqual(['b', 'd']);
    expect(run.rejected.map((r) => r.id).sort()).toEqual(['a', 'c']);
    expect(run.rejected.every((r) => r.missingRequired.includes('cache'))).toBe(true);
    expect(run.status).toBe('shortfall');
  });
  it('distinguishes all-gated failure from zero retrieval hits', () => {
    expect(runRetrieval(corpus, config({ requiredTerms: 'quasar' })).status).toBe('all-rejected');
  });
  it('keeps pre-gate scores when coverage preference reorders', () => {
    const plain = runRetrieval(corpus, config({ mode: 'metadata' }));
    const preferred = runRetrieval(corpus, config({ mode: 'metadata', preferCoverage: true }));
    expect(preferred.rows[0].coverage).toBe(1);
    for (const row of preferred.rows) expect(row.score).toBe(plain.rows.find((r) => r.id === row.id)!.score);
  });
  it('does not mutate configuration or corpus', () => {
    const input = config({ filters });
    const before = JSON.stringify({ corpus, input });
    runRetrieval(corpus, input);
    expect(JSON.stringify({ corpus, input })).toBe(before);
  });
});

describe('validation and reproducible replay', () => {
  it('replays an exact export by recomputing all scores and attempts', () => {
    const text = exportRun(corpus, config());
    expect(replayRun(text).result).toEqual(runRetrieval(corpus, config()));
    expect(exportRun(replayRun(text).corpus, replayRun(text).config)).toBe(text);
  });
  it('rejects forged result scores rather than rendering them', () => {
    const payload = JSON.parse(exportRun(corpus, config()));
    payload.result.rows[0].score = 999;
    expect(() => replayRun(JSON.stringify(payload))).toThrow(/recomputed/);
  });
  it('accepts equivalent object key ordering without trusting changed values', () => {
    const payload = JSON.parse(exportRun(corpus, config()));
    payload.result = Object.fromEntries(Object.entries(payload.result).reverse());
    expect(replayRun(JSON.stringify(payload)).result).toEqual(runRetrieval(corpus, config()));
  });
  it('rejects an export too large to replay instead of downloading a broken artifact', () => {
    const large = Array.from({ length: 100 }, (_, i) => ({
      ...corpus[0], id: `large-${i}`, body: 'search '.repeat(570),
    }));
    const longQuery = Array.from({ length: 50 }, (_, i) => `t${i}`).join(' ') + ' search';
    expect(() => exportRun(large, config({ query: longQuery, depth: 100, limit: 100 }))).toThrow(/large/);
  });
  it('rejects wrong versions, non-JSON and oversized imports', () => {
    const payload = JSON.parse(exportRun(corpus, config()));
    payload.version = 2;
    expect(() => replayRun(JSON.stringify(payload))).toThrow();
    expect(() => replayRun('{')).toThrow(/JSON/);
    expect(() => replayRun(' '.repeat(600_000))).toThrow(/large/);
  });
  it.each([
    { depth: 0 }, { rrfK: NaN }, { minimum: Infinity }, { query: 'x'.repeat(241) },
    { mode: 'semantic' }, { filters: [{ field: 'year', value: 'bad', protected: false }] },
    { filters: [{ field: 'kind', value: 'unknown', protected: false }] },
  ])('rejects invalid config %j', (override) => {
    expect(() => validateConfig({ ...config(), ...override })).toThrow();
  });
  it('rejects duplicate fields and unknown config keys', () => {
    expect(() => validateConfig(config({ filters: [
      { field: 'kind', value: 'guide', protected: false }, { field: 'kind', value: 'guide', protected: false },
    ] }))).toThrow();
    expect(() => validateConfig({ ...config(), endpoint: 'not-supported' })).toThrow();
  });
  it('does not silently disable a nonempty but tokenless required gate', () => {
    expect(() => runRetrieval(corpus, config({ requiredTerms: '!!!' }))).toThrow(/Required tokens/);
    expect(runRetrieval(corpus, config({ requiredTerms: '   ' })).rejected).toEqual([]);
  });
  it('rejects empty corpus, duplicates, excess data and unexpected fields', () => {
    expect(() => validateCorpus([])).toThrow();
    expect(() => validateCorpus([corpus[0], corpus[0]])).toThrow();
    expect(() => validateCorpus([{ ...corpus[0], body: 'x'.repeat(4001) }])).toThrow();
    expect(() => validateCorpus([{ ...corpus[0], privateAttribute: 'not-supported' }])).toThrow();
  });
  it('validates both inputs at the public engine boundary', () => {
    expect(() => runRetrieval([], config())).toThrow();
    expect(() => scoreChannels(corpus, 'x'.repeat(241))).toThrow();
  });
});
